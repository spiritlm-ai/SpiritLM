import { createHmac, timingSafeEqual } from "node:crypto";

const YOOKASSA_RECONCILE_PURPOSE = "spiritlm:netlify:yookassa-reconcile";

export function createYooKassaReconcileTriggerToken(secretKey: string): string {
  return createHmac("sha256", secretKey).update(YOOKASSA_RECONCILE_PURPOSE).digest("hex");
}

export function verifyYooKassaReconcileTriggerToken(
  secretKey: string,
  suppliedToken: string | null,
): boolean {
  if (!suppliedToken || !/^[a-f\d]{64}$/i.test(suppliedToken)) return false;

  const expected = Buffer.from(createYooKassaReconcileTriggerToken(secretKey), "hex");
  const supplied = Buffer.from(suppliedToken, "hex");
  return timingSafeEqual(expected, supplied);
}
