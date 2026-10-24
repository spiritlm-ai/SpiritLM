import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";
import type { CryptoBotConfig } from "@/configs/types/payments.types";
import { ApiError } from "./api-error";
import { http } from "./http-client";

export function cryptoBotConfig(): CryptoBotConfig {
  const mode = process.env.CRYPTO_BOT_MODE;
  if (mode !== "test" && mode !== "live") {
    throw new ApiError(503, "payments_disabled", "Пополнение временно недоступно");
  }
  const token = mode === "test"
    ? process.env.CRYPTO_BOT_TOKEN_TEST
    : process.env.CRYPTO_BOT_TOKEN;
  // Crypto Pay tokens use the application ID as the numeric prefix.
  const appId = token?.match(/^(\d{1,32}):\S+$/)?.[1];
  if (!token || !appId) {
    throw new ApiError(503, "payments_disabled", "Пополнение временно недоступно");
  }
  return {
    mode,
    token,
    appId,
    baseUrl: mode === "test"
      ? "https://testnet-pay.crypt.bot/api/"
      : "https://pay.crypt.bot/api/",
  };
}

export async function cryptoPayRequest<T>(
  config: CryptoBotConfig,
  method: "createInvoice" | "deleteInvoice" | "getInvoices" | "getMe",
  body: Record<string, string | number | boolean>,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const response = await http.post(`${config.baseUrl}${method}`, {
      headers: { "Crypto-Pay-API-Token": config.token },
      json: body,
      signal: AbortSignal.timeout(PAYMENT_LIMITS.HTTP_TIMEOUT_MS),
    });
    const responseBody: unknown = await response.json();
    const rejected = z.object({
      ok: z.literal(false),
      error: z.object({ name: z.string().optional() }).passthrough().optional(),
    }).safeParse(responseBody);
    if (rejected.success) {
      const providerError = rejected.data.error?.name?.toUpperCase();
      if (providerError === "INVOICE_NOT_FOUND") {
        throw new ApiError(404, "crypto_invoice_not_found", "Счёт уже отсутствует в CryptoBot");
      }
      if (providerError === "INVOICE_ALREADY_PAID") {
        throw new ApiError(409, "crypto_invoice_already_paid", "Счёт уже оплачен");
      }
      throw new ApiError(502, "crypto_pay_rejected", "CryptoBot отклонил запрос. Попробуйте позже.");
    }
    if (!response.ok) throw new Error("Provider HTTP failure");
    const envelope = z.object({ ok: z.literal(true), result: schema }).safeParse(responseBody);
    if (!envelope.success) throw new Error("Invalid provider response");
    return envelope.data.result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      502,
      "crypto_pay_unavailable",
      "Не удалось связаться с CryptoBot. Повторите проверку позже.",
    );
  }
}

export function verifyCryptoSignature(
  body: Uint8Array,
  signature: string | null,
  token: string,
): boolean {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const secret = createHash("sha256").update(token).digest();
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
