import { yooKassaConfig } from "../../src/lib/yookassa";
import { reconcilePendingYooKassaPayments } from "../../src/lib/yookassa-payments";
import { verifyYooKassaReconcileTriggerToken } from "../../src/lib/yookassa-reconcile-auth";
import { db } from "../../src/lib/db";

export const config = {
  background: true,
};

export default async function yooKassaReconcileBackground(request: Request) {
  const yooKassaSettings = yooKassaConfig();
  const suppliedToken = request.headers.get("x-spiritlm-reconcile");
  if (!verifyYooKassaReconcileTriggerToken(yooKassaSettings.secretKey, suppliedToken)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await reconcilePendingYooKassaPayments();
    console.info(
      `YooKassa reconciliation checked ${result.checked} payment(s); ${result.failed} failed.`,
    );

    if (result.failed > 0) {
      throw new Error("Some payments could not be reconciled.");
    }
  } catch {
    console.error("YooKassa background reconciliation failed.");
    throw new Error("YooKassa background reconciliation failed.");
  } finally {
    await db.$disconnect();
  }
}
