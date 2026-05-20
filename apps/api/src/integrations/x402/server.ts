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
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
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

// Bazaar discovery extension.
//
// Coinbase's CDP Bazaar (https://docs.cdp.coinbase.com/x402/bazaar) indexes
// our endpoint only when the extension on our 402 response carries `info`
// (a worked example of what the endpoint accepts + returns) AND `schema`
// (a JSON Schema that strictly validates `info.input`). The older config
// shape we used (`{ discoverable, category, tags }`) is rejected silently
// by the facilitator's validator — visible only via the `EXTENSION-RESPONSES`
// header — which kept us out of the catalog despite serving payments.
//
// `declareDiscoveryExtension()` builds the proper `{ bazaar: { info, schema } }`
// payload from a friendlier config object. The `method` field is omitted on
// purpose — the middleware fills it from the route key ("POST /...").
const findEmailDiscovery = declareDiscoveryExtension({
  bodyType: 'json',
  // Example input shown in the Bazaar listing. URL mode is the canonical
  // path most buyers will use; the schema documents the name+company
  // alternative too. Keep this input minimal — only fields the example
  // exercises — so it cleanly passes its own schema.
  input: {
    linkedin_url: 'https://www.linkedin.com/in/satyanadella/',
  },
  inputSchema: {
    type: 'object',
    properties: {
      linkedin_url: {
        type: 'string',
        format: 'uri',
        description:
          'Full LinkedIn profile URL — most accurate input mode when available.',
      },
      full_name: {
        type: 'string',
        description:
          "Person's full name. Alternative to linkedin_url; requires company_domain (preferred) or company_name.",
      },
      first_name: { type: 'string' },
      last_name: { type: 'string' },
      company_domain: {
        type: 'string',
        description:
          "Company website domain, e.g. 'microsoft.com'. Use with full_name when no LinkedIn URL is available.",
      },
      company_name: {
        type: 'string',
        description:
          'Company name fallback when no domain is known.',
      },
      email_types: {
        type: 'array',
        items: { type: 'string', enum: ['work', 'personal'] },
        default: ['work', 'personal'],
      },
      verify: {
        type: 'boolean',
        description:
          'When true, runs Hunter.io deliverability verification on each email.',
        default: false,
      },
    },
  },
  output: {
    example: {
      linkedin_url: 'https://linkedin.com/in/satyanadella',
      emails: [
        {
          address: 'satya@microsoft.com',
          type: 'work',
          verified: true,
          source_provider: 'apollo',
        },
      ],
      person: { full_name: 'Satya Nadella', title: 'CEO' },
      company: { name: 'Microsoft', domain: 'microsoft.com' },
      providers_attempted: [
        { provider: 'apollo', found: true, error: null },
      ],
    },
  },
});

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
      extensions: DISCOVERABLE ? findEmailDiscovery : undefined,
    },
  },
  server,
);
