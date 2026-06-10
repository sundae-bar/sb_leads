// One-shot mainnet payment to our own /x402/find-email endpoint.
//
// Why: Coinbase Bazaar (the x402 discovery feed that agentic.market
// republishes from) only indexes resources after the CDP mainnet
// facilitator has settled at least one real payment for them. Serving a
// proper HTTP 402 response is necessary but not sufficient — Coinbase
// observes settlements, not the public web.
//
// What this script does:
//   1. Loads a pre-funded buyer wallet from X402_BUYER_PRIVATE_KEY.
//   2. POSTs to https://api.scoop.sundaebar.ai/x402/find-email
//      (no payment header) → server returns HTTP 402 + payment requirements.
//   3. `@x402/fetch` signs an EIP-3009 transferWithAuthorization for
//      $0.25 USDC (Base mainnet) to our payTo wallet and retries.
//   4. Our middleware forwards the signature to the CDP mainnet facilitator
//      (api.cdp.coinbase.com/platform/v2/x402), which verifies + broadcasts
//      the transfer.
//   5. Once settled, our handler runs and returns the deliverable.
//   6. CDP now has a record of a settlement for our URL → Bazaar indexes
//      us within minutes; agentic.market republishes within ~24h.
//
// Pre-flight (one-time setup):
//   1. Create a fresh EVM EOA — DIFFERENT from our receiving wallet
//      (X402_PAY_TO_ADDRESS). You can't pay yourself from yourself in this
//      protocol; payer and receiver must be different addresses. The easiest
//      way to generate one:
//        openssl rand -hex 32                 # this is your private key
//      Then derive the address (this script prints it on first run if you
//      pass a key it doesn't recognise as funded).
//   2. Fund the buyer wallet with ~$0.30 USDC on Base mainnet. Withdraw
//      directly to Base from any CEX (Coinbase / Binance / etc.) that
//      supports USDC withdrawals on Base. The Base USDC contract is
//      0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 — make sure your
//      withdrawal lands at THAT contract, not Ethereum mainnet USDC.
//      ETH for gas is usually NOT required — the facilitator pays gas
//      under the `exact` scheme.
//   3. Add to your local .env (NEVER commit, NEVER push to Railway):
//        X402_BUYER_PRIVATE_KEY=0x<your-64-char-hex-key>
//   4. Run:
//        pnpm --filter @scoop/api x402:mainnet-pay-once
//
// Cost: $0.25 USDC paid from your buyer wallet to our receiver wallet.
// Both addresses are yours, so net cost is ~$0 (minus negligible
// facilitator overhead — first 1k settlements/month are free on CDP).

import 'dotenv/config';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { createPublicClient, formatUnits, getContract, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const ENDPOINT =
  process.env.X402_MAINNET_ENDPOINT ??
  'https://api.scoop.sundaebar.ai/x402/find-email';
const LINKEDIN =
  process.env.X402_TEST_LINKEDIN ?? 'https://www.linkedin.com/in/satyanadella/';

// Base mainnet USDC contract — used purely for a pre-flight balance check
// so we can fail fast with a useful error instead of a cryptic settle error.
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const USDC_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;
const MINIMUM_USDC_UNITS = 250_000n; // $0.25, 6 decimals

async function main() {
  const pk = process.env.X402_BUYER_PRIVATE_KEY;
  if (!pk) {
    console.error(
      '\n[!] X402_BUYER_PRIVATE_KEY is not set.\n' +
        '    Generate one with:  openssl rand -hex 32\n' +
        '    Then add to your local .env as:  X402_BUYER_PRIVATE_KEY=0x<key>\n' +
        '    Fund the resulting address with ~$0.30 USDC on Base mainnet.',
    );
    process.exit(2);
  }

  const normalisedPk = pk.startsWith('0x') ? pk : `0x${pk}`;
  const account = privateKeyToAccount(normalisedPk as `0x${string}`);
  console.log(`\n[1] Buyer wallet: ${account.address}`);
  console.log(`    (this address must be PRE-FUNDED with USDC on Base mainnet)`);

  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  // 2. Pre-flight: check the buyer wallet actually holds enough USDC. The
  // facilitator's error messages on under-funded settlement are cryptic;
  // a one-line balance check up front saves debugging time.
  const usdc = getContract({
    address: USDC_BASE,
    abi: USDC_ABI,
    client: publicClient,
  });
  const balance = (await usdc.read.balanceOf([account.address])) as bigint;
  console.log(`[2] USDC balance: ${formatUnits(balance, 6)} USDC on Base mainnet`);

  if (balance < MINIMUM_USDC_UNITS) {
    console.error(
      `\n[!] Buyer wallet has ${formatUnits(balance, 6)} USDC; need at least ${formatUnits(
        MINIMUM_USDC_UNITS,
        6,
      )}.\n` +
        `    Fund ${account.address} with USDC on Base mainnet (contract ${USDC_BASE}).\n` +
        `    Withdraw to "Base" network from your CEX — NOT Ethereum mainnet.`,
    );
    process.exit(2);
  }

  // 3. Build the x402 client. Same shape as the testnet self-test, but
  // pointing at Base mainnet (eip155:8453) instead of Sepolia (eip155:84532).
  // The signer is a thin viem-account wrapper exposing the methods x402's
  // EVM scheme calls during EIP-3009 authorisation.
  const signer = toClientEvmSigner(account, publicClient);
  const x402 = new x402Client().register(
    'eip155:8453',
    new ExactEvmScheme(signer),
  );

  // Wrap fetch with a logger that surfaces every interesting x402 header on
  // every hop. Without this the wrapper hides the 402-then-200 dance and we
  // never see whether Bazaar's validator accepted the extension. We
  // specifically watch for:
  //   payment-required    — 402 quote from our server (1st hop)
  //   payment-response    — settle result from CDP (2nd hop, on success)
  //   extension-responses — Bazaar's verdict on each declared extension
  //                         (the smoking gun: rejected = invisible to catalog)
  const bazaarVerdict = { seen: false, accepted: false, raw: '' };
  const loggingFetch: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method ?? 'GET';
    console.log(`\n  → ${method} ${url}`);
    const reqHeaders = new Headers(init?.headers);
    const sigHeader = reqHeaders.get('payment-signature');
    if (sigHeader) {
      console.log(
        `    payment-signature: ${sigHeader.slice(0, 60)}… (${sigHeader.length} chars total)`,
      );
    }

    const res = await fetch(input, init);
    console.log(`  ← HTTP ${res.status} ${res.statusText}`);

    for (const headerName of [
      'payment-required',
      'payment-response',
      'extension-responses',
    ] as const) {
      const value = res.headers.get(headerName);
      if (!value) continue;
      const decoded = tryDecodeBase64Json(value);
      console.log(`    ${headerName}:`);
      if (decoded !== null && typeof decoded === 'object') {
        const pretty = JSON.stringify(decoded, null, 2)
          .split('\n')
          .map((l) => '      ' + l)
          .join('\n');
        console.log(pretty);
      } else {
        console.log(
          `      ${value.length > 200 ? value.slice(0, 200) + '…' : value}`,
        );
      }

      // Snapshot Bazaar's verdict — what we actually care about. Header
      // shape is `{ <extension-name>: { status: "accepted" | "rejected", ... } }`
      // or a list of those. We just look for the bazaar key.
      if (headerName === 'extension-responses' && decoded && typeof decoded === 'object') {
        const bazaarEntry = extractBazaarEntry(decoded);
        if (bazaarEntry) {
          bazaarVerdict.seen = true;
          bazaarVerdict.raw = JSON.stringify(bazaarEntry);
          bazaarVerdict.accepted =
            (bazaarEntry as { status?: string }).status === 'accepted';
        }
      }
    }
    return res;
  };
  const paidFetch = wrapFetchWithPayment(loggingFetch, x402);

  // 4. The actual call. `paidFetch` does the 402 retry internally:
  //    - first request returns 402 + payment requirements,
  //    - signer signs an EIP-3009 authorisation for the quoted amount,
  //    - second request includes the signature; our middleware forwards
  //      it to the CDP facilitator, which settles + broadcasts the USDC
  //      transfer on Base.
  console.log(`\n[3] Calling ${ENDPOINT}`);
  console.log(`    payload: { linkedin_url: "${LINKEDIN}" }`);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await paidFetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkedin_url: LINKEDIN }),
    });
  } catch (err) {
    console.error('\n[!] paidFetch failed mid-flow:', err);
    process.exit(2);
  }
  const elapsed = Date.now() - t0;

  console.log(`\n[4] Final response: HTTP ${res.status} (${elapsed}ms total)`);
  const body = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }
  console.log('    deliverable:');
  console.log(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2));

  // 5. Print the post-payment balance so the user can see the deduction.
  // Sleep briefly so the public RPC node has time to pick up the new block.
  await new Promise((r) => setTimeout(r, 4000));
  const balanceAfter = (await usdc.read.balanceOf([account.address])) as bigint;
  console.log(
    `\n[5] USDC balance after settle: ${formatUnits(balanceAfter, 6)} USDC ` +
      `(spent ${formatUnits(balance - balanceAfter, 6)})`,
  );

  // 6. Crisp pass/fail summary — what actually matters is Bazaar's verdict.
  console.log('\n[6] Bazaar indexation verdict:');
  if (!bazaarVerdict.seen) {
    console.log(
      `    ⚠  No EXTENSION-RESPONSES header observed. Either the server did not\n` +
        `       advertise a bazaar extension, or the facilitator did not echo a\n` +
        `       verdict. The catalog probably will not pick us up from this settle.`,
    );
  } else if (bazaarVerdict.accepted) {
    console.log(`    ✅ ACCEPTED by Coinbase facilitator. We should land in the`);
    console.log(`       Bazaar catalog within ~10 minutes (cache TTL). Poll with:`);
    console.log(`         pnpm --filter @scoop/api discovery:poll once --full`);
  } else {
    console.log(`    ❌ REJECTED. Raw verdict: ${bazaarVerdict.raw}`);
    console.log(`       Fix the extension shape; settle again.`);
  }
  console.log(
    `\n    agentic.market republishes from Bazaar on its own schedule (~24h).`,
  );
}

function tryDecodeBase64Json(value: string): unknown {
  // x402 standard: most diagnostic headers are base64(JSON). Fall back to
  // returning the raw string if it isn't.
  try {
    const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}

function extractBazaarEntry(decoded: unknown): unknown {
  // The EXTENSION-RESPONSES payload's exact shape isn't fully nailed in the
  // docs; we've seen two patterns:
  //   { bazaar: { status: "accepted" | "rejected", errors?: [...] } }
  //   [{ name: "bazaar", status: "accepted", ... }]
  // Walk both.
  if (decoded && typeof decoded === 'object') {
    const rec = decoded as Record<string, unknown>;
    if (rec.bazaar) return rec.bazaar;
    if (Array.isArray(decoded)) {
      return decoded.find(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          (entry as { name?: string }).name === 'bazaar',
      );
    }
  }
  return null;
}

main().catch((err) => {
  console.error('\n[!] x402 mainnet pay-once failed:', err);
  process.exit(2);
});
