import "./load-env.mjs";
import { db } from "../src/lib/db";
import { reconcilePendingCryptoPayments } from "../src/lib/crypto-payments";

async function main() {
  try {
    const result = await reconcilePendingCryptoPayments();
    console.log(`Checked: ${result.checked}; failed: ${result.failed}`);
    if (result.failed) process.exitCode = 1;
  } catch {
    console.error("Payment reconciliation failed. Check configuration and database availability.");
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
