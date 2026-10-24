import { z } from "zod";
import { applyCryptoInvoice } from "@/actions/apply-crypto-invoice";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";
import { cryptoBotConfig, verifyCryptoSignature } from "@/lib/crypto-pay";
import { cryptoInvoiceSchema } from "@/configs/schemas/payments.schema";
import { unwrapAction } from "@/lib/create-safe-action";
import { ApiError, errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const config = cryptoBotConfig();
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
    const body = Buffer.concat(chunks);
    if (!verifyCryptoSignature(body, request.headers.get("crypto-pay-api-signature"), config.token)) {
      throw new ApiError(401, "invalid_signature", "Некорректная подпись");
    }
    const update = z.object({
      update_type: z.literal("invoice_paid"),
      payload: cryptoInvoiceSchema.extend({ status: z.literal("paid") }),
    }).safeParse(JSON.parse(body.toString("utf8")));
    if (!update.success) {
      throw new ApiError(400, "invalid_webhook", "Некорректное уведомление");
    }
    const result = await applyCryptoInvoice({
      mode: config.mode,
      appId: config.appId,
      invoice: update.data.payload,
    });
    if (result.code === "payment_not_found") {
      // A valid notification may belong to another service using the same app.
      console.warn("CryptoBot webhook has no matching payment");
    } else {
      unwrapAction(result);
    }
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse(new ApiError(400, "invalid_webhook", "Некорректное уведомление"));
    }
    return errorResponse(error);
  }
}
