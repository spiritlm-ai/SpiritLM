import { z } from "zod";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";
import { yooKassaPaymentSchema } from "@/configs/schemas/yookassa.schema";
import { applyYookassaPayment } from "@/actions/apply-yookassa-payment";
import { yooKassaConfig, yooKassaRequest } from "@/lib/yookassa";
import { unwrapAction } from "@/lib/create-safe-action";
import { ApiError, errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const config = yooKassaConfig();
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "invalid_webhook", "Некорректное уведомление");
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > PAYMENT_LIMITS.WEBHOOK_MAX_BYTES) {
          await reader.cancel();
          throw new ApiError(413, "webhook_too_large", "Уведомление слишком большое");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const notification = z
      .object({
        type: z.literal("notification"),
        event: z.enum(["payment.succeeded", "payment.canceled"]),
        object: z.object({ id: z.string().regex(/^[a-zA-Z0-9-]{1,64}$/) }),
      })
      .safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!notification.success)
      throw new ApiError(400, "invalid_webhook", "Некорректное уведомление");
    // Notifications have no shared-secret signature. Verify with the shop's API;
    // never trust status, amounts, mode, or metadata from the incoming body.
    const remote = await yooKassaRequest(
      config,
      `payments/${encodeURIComponent(notification.data.object.id)}`,
      yooKassaPaymentSchema,
    );
    if (remote.id !== notification.data.object.id) {
      throw new ApiError(409, "payment_mismatch", "Данные платежа не совпадают");
    }
    const result = await applyYookassaPayment({
      mode: config.mode,
      shopId: config.shopId,
      payment: remote,
    });
    if (result.code !== "payment_not_found") unwrapAction(result);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse(
        new ApiError(400, "invalid_webhook", "Некорректное уведомление"),
      );
    }
    return errorResponse(error);
  }
}
