// x402 payment middleware — the direct on-chain front door, separate from
// the402.ai's managed marketplace path. Validates USDC payments via a
// configurable facilitator, then hands off to the actual handler.
//
// Defaults to Base Sepolia + the free public facilitator so we can iterate
// without a CDP account. Mainnet rollout is just an env-var flip (see plan).
import { paymentMiddleware } from '@x402/express';
import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { createFacilitatorConfig } from '@coinbase/x402';
import type { Network } from '@x402/core/types';

// NOTE on refund-on-empty: `exact` is all-or-nothing — facilitator rejects
// partial settlement, so we can't refund the buyer in-protocol when
// findEmails returns no hits. The `upto` scheme supports it but requires
// Permit2 approvals on the buyer side, which most x402 clients don't
// implement. We accept "no refund on x402" as a deliberate tradeoff; the
// dashboard + the402 paths still refund. Revisit if buyers ask.

const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL ?? 'https://x402.org/facilitator';
const NETWORK = (process.env.X402_NETWORK ?? 'eip155:84532') as Network; // Base Sepolia by default
const PAY_TO = process.env.X402_PAY_TO_ADDRESS;
const PRICE = process.env.X402_FIND_EMAIL_PRICE ?? '$0.25';
const DISCOVERABLE = process.env.X402_DISCOVERABLE === 'true'; // mainnet-only flag

if (!PAY_TO) {
  throw new Error(
    'X402_PAY_TO_ADDRESS is required — set the EVM address that should receive USDC payments.',
  );
}

// The CDP mainnet facilitator requires Ed25519-signed CDP auth headers on
// every request; the testnet x402.org facilitator is unauthenticated. We
// detect which mode we're in by the presence of CDP_API_KEY_ID and use
// Coinbase's helper to build the auth-aware FacilitatorConfig.
const cdpKeyId = process.env.CDP_API_KEY_ID;
const cdpKeySecret = process.env.CDP_API_KEY_SECRET;
const facilitatorConfig =
  cdpKeyId && cdpKeySecret
    ? createFacilitatorConfig(cdpKeyId, cdpKeySecret)
    : { url: FACILITATOR_URL };

const facilitator = new HTTPFacilitatorClient(facilitatorConfig);

const server = new x402ResourceServer(facilitator).register(
  NETWORK,
  new ExactEvmScheme(),
);

export const x402Middleware = paymentMiddleware(
  {
    'POST /x402/find-email': {
      accepts: [
        {
          scheme: 'exact',
          price: PRICE,
          network: NETWORK,
          payTo: PAY_TO,
        },
      ],
      description:
        'Find verified work and/or personal emails for a LinkedIn profile across multiple data providers (Aleads, Apollo, Nymeria, ContactOut). Optional Hunter.io verification. Returns in <5s.',
      mimeType: 'application/json',
      // Only declare Bazaar discoverability on mainnet — Coinbase's crawler
      // ignores testnet endpoints, and we don't want noise in the dev catalog.
      extensions: DISCOVERABLE
        ? {
            bazaar: {
              discoverable: true,
              category: 'data',
              tags: ['email', 'linkedin', 'enrichment', 'b2b', 'sales-intelligence'],
            },
          }
        : undefined,
    },
  },
  server,
);
