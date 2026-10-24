import { cryptoBotConfig } from "../../src/lib/crypto-pay";
import { reconcilePendingCryptoPayments } from "../../src/lib/crypto-payments";
import { verifyCryptoReconcileTriggerToken } from "../../src/lib/crypto-reconcile-auth";
import { db } from "../../src/lib/db";

export const config = {
  background: true,
};

export default async function cryptoReconcileBackground(request: Request) {
  const cryptoConfig = cryptoBotConfig();
  const suppliedToken = request.headers.get("x-spiritlm-reconcile");
  if (!verifyCryptoReconcileTriggerToken(cryptoConfig.token, suppliedToken)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await reconcilePendingCryptoPayments();
    console.info(
      `CryptoBot reconciliation checked ${result.checked} payment(s); ${result.failed} failed.`,
    );

    if (result.failed > 0) {
      throw new Error("Some payments could not be reconciled.");
    }
  } catch {
    console.error("CryptoBot background reconciliation failed.");
    throw new Error("CryptoBot background reconciliation failed.");
  } finally {
    await db.$disconnect();
  }
}
