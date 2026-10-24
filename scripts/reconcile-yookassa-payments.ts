import "./load-env.mjs";
import { db } from "../src/lib/db";
import { reconcilePendingYooKassaPayments } from "../src/lib/yookassa-payments";

try {
  const result = await reconcilePendingYooKassaPayments();
  console.info(`YooKassa: checked ${result.checked}, failed ${result.failed}`);
  if (result.failed) process.exitCode = 1;
} catch {
  console.error(
    "YooKassa reconciliation failed. Check configuration and database availability.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
