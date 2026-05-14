// One-shot: create an EVM EOA server wallet on Coinbase Developer Platform
// and print its address. Run once during initial setup; never again.
//
// Usage:
//   pnpm --filter @sundae/api cdp:create-eoa
//
// Requires the following in .env:
//   CDP_API_KEY_ID
//   CDP_API_KEY_SECRET
//   CDP_WALLET_SECRET   (already generated via the dashboard)
//
// Drop the printed address into .env as X402_PAY_TO_ADDRESS.
import 'dotenv/config';
import { CdpClient } from '@coinbase/cdp-sdk';

const apiKeyId = process.env.CDP_API_KEY_ID;
const apiKeySecret = process.env.CDP_API_KEY_SECRET;
const walletSecret = process.env.CDP_WALLET_SECRET;

if (!apiKeyId || !apiKeySecret || !walletSecret) {
  console.error(
    'Missing one or more of CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in .env',
  );
  process.exit(1);
}

const cdp = new CdpClient({ apiKeyId, apiKeySecret, walletSecret });

async function main() {
  const account = await cdp.evm.createAccount({ name: 'scoop-pay-to' });
  console.log('');
  console.log('Created EVM EOA:');
  console.log('  name:    scoop-pay-to');
  console.log('  address:', account.address);
  console.log('');
  console.log('Next: add to .env');
  console.log(`  X402_PAY_TO_ADDRESS=${account.address}`);
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
