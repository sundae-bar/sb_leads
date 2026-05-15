// End-to-end x402 self-test on Base Sepolia.
//
// What it does:
//   1. Generates a throwaway buyer private key (lives only in this process).
//   2. Uses CDP's testnet faucet to fund the buyer address with Sepolia ETH
//      (for gas) and Sepolia USDC (for the payment).
//   3. Hits our local /x402/find-email endpoint via @x402/fetch — which auto-
//      handles the 402 dance: 1st request returns 402+quote, the client signs
//      EIP-3009 transferWithAuthorization for $0.25 USDC and retries.
//   4. Server's middleware verifies the signature via the facilitator, our
//      handler runs, the deliverable comes back.
//
// Usage:
//   pnpm --filter @scoop/api x402:self-test
import 'dotenv/config';
import { CdpClient } from '@coinbase/cdp-sdk';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { createPublicClient, http, formatUnits } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const ENDPOINT = process.env.X402_TEST_ENDPOINT ?? 'http://localhost:4004/x402/find-email';
const LINKEDIN = process.env.X402_TEST_LINKEDIN ?? 'https://www.linkedin.com/in/satyanadella/';

async function main() {
  // 1. Throwaway buyer wallet
  const pk = generatePrivateKey();
  const account = privateKeyToAccount(pk);
  console.log(`\n[1] Buyer wallet (throwaway): ${account.address}`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });
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
  await new Promise((r) => setTimeout(r, 10_000));

  const ethBal = await publicClient.getBalance({ address: account.address });
  console.log(`     ETH balance: ${formatUnits(ethBal, 18)} ETH`);
  // USDC balance read intentionally skipped — the x402 client will fail loudly if insufficient.

  // 3. Build the x402 client + paid fetch
  const x402 = new x402Client().register(
    'eip155:84532',
    new ExactEvmScheme(signer),
  );
  const paidFetch = wrapFetchWithPayment(fetch, x402);

  // 4. The actual call. Single fetch — the wrapper does the 402 retry internally.
  console.log(`\n[3] Calling ${ENDPOINT}`);
  console.log(`    inputs: { linkedin_url: "${LINKEDIN}" }`);
  const t0 = Date.now();
  const res = await paidFetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ linkedin_url: LINKEDIN }),
  });
  const elapsed = Date.now() - t0;

  console.log(`\n[4] Response: HTTP ${res.status} (${elapsed}ms)`);
  const body = await res.json();
  console.log('    deliverable:');
  console.log(JSON.stringify(body, null, 2));
}

main().catch((err) => {
  console.error('\n[!] x402 self-test failed:', err);
  process.exit(2);
});
