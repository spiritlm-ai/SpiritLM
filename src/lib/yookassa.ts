import { z } from "zod";
import { YOOKASSA } from "@/configs/consts/yookassa.const";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";
import type { YooKassaConfig } from "@/configs/types/yookassa.types";
import { ApiError } from "./api-error";
import { http } from "./http-client";

export function yooKassaPaymentMethod(returnUrl: string) {
  // The persisted return marker identifies the original request body for recovery.
  return new URL(returnUrl).searchParams.get("payment_method") === "sbp"
    ? "sbp"
    : "bank_card";
}

function transportFailureReason(error: unknown): string {
  const allowedCodes = new Set<string>(YOOKASSA.TRANSPORT_ERROR_CODES);
  let current = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") break;
    if ("code" in current && typeof current.code === "string" && allowedCodes.has(current.code)) {
      return current.code;
    }
    current = "cause" in current ? current.cause : undefined;
  }
  return error instanceof Error && error.name === "TimeoutError" ? "timeout" : "unknown";
}

export function yooKassaConfig(): YooKassaConfig {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey = process.env.YOOKASSA_SECRET_KEY_TEST?.trim();
  if (
    process.env.YOOKASSA_MODE !== "test" ||
    !shopId ||
    !/^\d{1,32}$/.test(shopId) ||
    !secretKey?.startsWith("test_")
  ) {
    throw new ApiError(
      503,
      "yookassa_unavailable",
      "Тестовая оплата банковской картой недоступна",
    );
  }
  return { mode: "test", shopId, secretKey };
}

export async function requireYooKassaBankCard(config: YooKassaConfig): Promise<void> {
  const shop = await yooKassaRequest(
    config,
    "me",
    z.object({ test: z.boolean(), payment_methods: z.array(z.string()) }),
  );
  if (!shop.test) {
    throw new ApiError(503, "payment_environment", "Окружение магазина ЮKassa не совпадает");
  }
  if (!shop.payment_methods.includes("bank_card")) {
    throw new ApiError(
      503,
      "yookassa_card_unavailable",
      "Оплата картой недоступна в тестовом магазине ЮKassa. Выберите другой способ оплаты.",
    );
  }
}

export async function yooKassaRequest<T>(
  config: YooKassaConfig,
  path: string,
  schema: z.ZodType<T>,
  creation?: { key: string; body: unknown },
): Promise<T> {
  try {
    const response = await http(new URL(path, YOOKASSA.BASE_URL), {
      method: creation ? "POST" : "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.shopId}:${config.secretKey}`).toString("base64")}`,
        ...(creation ? { "Idempotence-Key": creation.key } : {}),
      },
      ...(creation ? { json: creation.body } : {}),
      signal: AbortSignal.timeout(PAYMENT_LIMITS.HTTP_TIMEOUT_MS),
    });
    if (!response.ok) {
      // Authentication/validation errors are safe to report without upstream bodies.
      throw new ApiError(
        502,
        creation && path === "payments" && [400, 401, 403, 404, 422].includes(response.status)
          ? "yookassa_creation_rejected"
          : "yookassa_rejected",
        "ЮKassa не смогла обработать платёж. Попробуйте проверить статус позже.",
      );
    }
    const body: unknown = await response.json().catch(() => {
      throw new ApiError(
        502,
        "invalid_yookassa_response",
        "ЮKassa вернула некорректные данные платежа",
      );
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        502,
        "invalid_yookassa_response",
        "ЮKassa вернула некорректные данные платежа",
      );
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("YooKassa transport failed", {
      operation: creation ? (path === "payments" ? "create" : "cancel") : "read",
      reason: transportFailureReason(error),
    });
    throw new ApiError(
      502,
      "yookassa_unavailable",
      "Не удалось связаться с ЮKassa. Проверьте статус платежа позже.",
    );
  }
}
