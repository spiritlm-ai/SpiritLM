import { createHmac, timingSafeEqual } from "node:crypto";

const CRYPTO_RECONCILE_PURPOSE = "spiritlm:netlify:crypto-reconcile";

export function createCryptoReconcileTriggerToken(cryptoPayToken: string): string {
  return createHmac("sha256", cryptoPayToken)
    .update(CRYPTO_RECONCILE_PURPOSE)
    .digest("hex");
}

export function verifyCryptoReconcileTriggerToken(
  cryptoPayToken: string,
  suppliedToken: string | null,
): boolean {
  if (!suppliedToken || !/^[a-f\d]{64}$/i.test(suppliedToken)) return false;

  const expected = Buffer.from(createCryptoReconcileTriggerToken(cryptoPayToken), "hex");
  const supplied = Buffer.from(suppliedToken, "hex");
  return timingSafeEqual(expected, supplied);
}
