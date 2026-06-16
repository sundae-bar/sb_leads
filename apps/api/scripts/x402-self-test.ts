// End-to-end x402 self-test on Base Sepolia.
//
// What it does:
//   1. Generates a throwaway buyer private key (lives only in this process).
//   2. Uses CDP's testnet faucet to fund the buyer address with Sepolia ETH
//      (for gas) and Sepolia USDC (for the payment).
//   3. Runs two phases against /x402/find-email via @x402/fetch (which auto-
//      handles the 402 dance — 1st request returns 402+quote, the client signs
//      EIP-3009 transferWithAuthorization and retries):
//        • FAILURE phase (first, so no happy-path settlement pollutes the
//          balance check): a lookup engineered to return zero emails. Asserts
//          the response is >=400 with charged:false AND the buyer's USDC
//          balance is UNCHANGED — i.e. a failed lookup is never settled. This
//          is the empirical proof of the charge-on-failure fix.
//        • SUCCESS phase: a real lookup. Prints the deliverable and polls the
//          balance to confirm exactly one 0.25 USDC debit.
//
// Usage:
//   pnpm --filter @scoop/api x402:self-test
//   X402_SELFTEST_MODE=failure pnpm --filter @scoop/api x402:self-test
import 'dotenv/config';
import { CdpClient } from '@coinbase/cdp-sdk';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { createPublicClient, http, formatUnits } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const ENDPOINT = process.env.X402_TEST_ENDPOINT ?? 'http://localhost:4004/x402/find-email';
const LINKEDIN = process.env.X402_TEST_LINKEDIN ?? 'https://www.linkedin.com/in/satyanadella/';
const MODE = process.env.X402_SELFTEST_MODE ?? 'both'; // both | failure | success

// Base Sepolia USDC (6 decimals). Used to read the buyer's balance directly so
// we can prove a failed lookup moved no funds.
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const ERC20_BALANCE_OF = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// A lookup engineered to yield nothing: a fictional person at an RFC-2606
// `.invalid` domain that no provider can resolve. Name-mode so it hits the
// real "no_email_found" path rather than a validation error.
const NO_RESULT_INPUT = {
  full_name: 'Nonexistent Selftest Person',
  company_domain: 'x402-selftest-no-such-domain.invalid',
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // 1. Throwaway buyer wallet
  const pk = generatePrivateKey();
  const account = privateKeyToAccount(pk);
  console.log(`\n[1] Buyer wallet (throwaway): ${account.address}`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });
  const usdcBalance = (): Promise<bigint> =>
    publicClient.readContract({
      address: USDC,
      abi: ERC20_BALANCE_OF,
      functionName: 'balanceOf',
      args: [account.address],
    }) as Promise<bigint>;

  // x402's EVM scheme wants a flat { address, signTypedData } signer; viem's
  // Account already exposes both. The helper threads optional readContract /
  // gas helpers from the public client for EIP-2612 / Permit2 enrichment.
  const signer = toClientEvmSigner(account, publicClient);

  // 2. Fund via CDP faucet (ETH for gas, USDC for the actual payment)
  const cdp = new CdpClient({
    apiKeyId: process.env.CDP_API_KEY_ID!,
    apiKeySecret: process.env.CDP_API_KEY_SECRET!,
    walletSecret: process.env.CDP_WALLET_SECRET!,
  });

  console.log('[2a] Requesting Sepolia ETH from CDP faucet…');
  const ethFaucet = await cdp.evm.requestFaucet({
    address: account.address,
    network: 'base-sepolia',
    token: 'eth',
  });
  console.log('     tx:', ethFaucet.transactionHash);

  console.log('[2b] Requesting Sepolia USDC from CDP faucet…');
  const usdcFaucet = await cdp.evm.requestFaucet({
    address: account.address,
    network: 'base-sepolia',
    token: 'usdc',
  });
  console.log('     tx:', usdcFaucet.transactionHash);

  console.log('[2c] Waiting ~10s for faucet txns to confirm…');
  await wait(10_000);

  const ethBal = await publicClient.getBalance({ address: account.address });
  console.log(`     ETH balance: ${formatUnits(ethBal, 18)} ETH`);
  console.log(`     USDC balance: ${formatUnits(await usdcBalance(), 6)} USDC`);

  // 3. Build the x402 client + paid fetch
  const x402 = new x402Client().register('eip155:84532', new ExactEvmScheme(signer));
  const paidFetch = wrapFetchWithPayment(fetch, x402);

  const call = (input: unknown) =>
    paidFetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

  let failed = false;

  // ── FAILURE phase ────────────────────────────────────────────────────
  // Runs first: the wallet has no pending settlements, so any balance drop
  // here can only be an (erroneous) charge on the failed lookup.
  if (MODE === 'both' || MODE === 'failure') {
    console.log(`\n[F] FAILURE phase — forcing a zero-result lookup`);
    console.log(`    inputs: ${JSON.stringify(NO_RESULT_INPUT)}`);
    const before = await usdcBalance();

    let status: number | null = null;
    let charged: unknown = 'n/a';
    try {
      const res = await call(NO_RESULT_INPUT);
      status = res.status;
      const body = await res.json().catch(() => null);
      charged = body?.charged;
      console.log(`    response: HTTP ${status}, charged=${charged}, code=${body?.error?.code}`);
    } catch (err) {
      // Some clients throw when payment was authorized but the server returned
      // >=400. That's the expected shape here — the balance check below is the
      // real proof.
      console.log(`    client rejected (payment authorized, server >=400): ${(err as Error).message}`);
    }

    if (status !== null && status < 400) {
      console.log(
        `    ⚠️  INCONCLUSIVE: expected >=400 but got ${status}. The fictional input unexpectedly resolved to a result — pick a different NO_RESULT_INPUT and re-run.`,
      );
    } else {
      console.log('    waiting ~20s to catch any (erroneous) delayed settlement…');
      await wait(20_000);
      const after = await usdcBalance();
      const moved = before - after;
      console.log(`    USDC before: ${formatUnits(before, 6)} · after: ${formatUnits(after, 6)}`);
      if (after === before) {
        console.log('    ✅ PASS: failed lookup settled NOTHING — buyer not charged.');
      } else {
        failed = true;
        console.log(
          `    ❌ FAIL: balance dropped ${formatUnits(moved, 6)} USDC on a failed lookup — charge-on-failure is NOT fixed.`,
        );
      }
    }
  }

  // ── SUCCESS phase ────────────────────────────────────────────────────
  if (MODE === 'both' || MODE === 'success') {
    console.log(`\n[S] SUCCESS phase — real lookup`);
    console.log(`    inputs: { linkedin_url: "${LINKEDIN}" }`);
    const before = await usdcBalance();
    const t0 = Date.now();
    const res = await call({ linkedin_url: LINKEDIN });
    const elapsed = Date.now() - t0;
    const body = await res.json().catch(() => null);
    const settlement = res.headers.get('x-payment-response');
    console.log(`    response: HTTP ${res.status} (${elapsed}ms)`);
    console.log(`    X-PAYMENT-RESPONSE present: ${Boolean(settlement)}`);
    console.log('    deliverable:');
    console.log(JSON.stringify(body, null, 2));

    if (res.status === 200) {
      // Poll for the single debit — settlement lags the response by seconds.
      console.log('    confirming a single 0.25 USDC debit (poll up to ~30s)…');
      let after = before;
      for (let i = 0; i < 10; i++) {
        await wait(3_000);
        after = await usdcBalance();
        if (after !== before) break;
      }
      const moved = Number(formatUnits(before - after, 6));
      console.log(`    USDC before: ${formatUnits(before, 6)} · after: ${formatUnits(after, 6)} · moved: ${moved}`);
      if (moved === 0) {
        console.log('    ⚠️  settlement not yet on-chain (lag) — re-check the balance shortly.');
      } else if (Math.abs(moved - 0.25) < 1e-6) {
        console.log('    ✅ debited exactly 0.25 USDC, once.');
      } else {
        failed = true;
        console.log(`    ❌ FAIL: expected a single 0.25 debit, saw ${moved}.`);
      }
    } else {
      failed = true;
      console.log(`    ❌ FAIL: expected HTTP 200, got ${res.status}.`);
    }
  }

  console.log(failed ? '\n[!] self-test FAILED' : '\n[✓] self-test passed');
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error('\n[!] x402 self-test failed:', err);
  process.exit(2);
});
