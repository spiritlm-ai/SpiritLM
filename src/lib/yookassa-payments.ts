import type { YooKassaPayment } from "@prisma/client";
import { z } from "zod";
import { dismissYookassaPayment } from "@/actions/dismiss-yookassa-payment";
import { failYookassaPayment } from "@/actions/fail-yookassa-payment";
import { reserveYookassaPayment } from "@/actions/reserve-yookassa-payment";
import { getYookassaPayment } from "@/actions/get-yookassa-payment";
import { applyYookassaPayment } from "@/actions/apply-yookassa-payment";
import { claimYookassaCheck } from "@/actions/claim-yookassa-check";
import { listPendingYookassaPayments } from "@/actions/list-pending-yookassa-payments";
import { yooKassaPaymentSchema } from "@/configs/schemas/yookassa.schema";
import { YOOKASSA } from "@/configs/consts/yookassa.const";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";
import type {
  PaymentOverview,
  PaymentSummary,
} from "@/configs/types/payments.types";
import type {
  YooKassaConfig,
  YooKassaPaymentObject,
} from "@/configs/types/yookassa.types";
import {
  requireYooKassaBankCard,
  yooKassaConfig,
  yooKassaPaymentMethod,
  yooKassaRequest,
} from "./yookassa";
import { unwrapAction } from "./create-safe-action";
import { ApiError } from "./api-error";

function summarize(payment: YooKassaPayment): PaymentSummary {
  const expiresAt = new Date(
    payment.createdAt.getTime() + YOOKASSA.INVOICE_LIFETIME_MS,
  );
  const pending = ["CREATING", "PENDING"].includes(payment.status);
  const status =
    pending && payment.dismissedAt
      ? "CANCELLED"
      : pending && expiresAt.getTime() <= Date.now()
        ? "EXPIRED"
        : payment.status;
  return {
    id: payment.id,
    mode: "test",
    amount: payment.amount.toFixed(2),
    status,
    invoiceUrl: status === "PENDING" ? payment.invoiceUrl : null,
    expiresAt: expiresAt.toISOString(),
  };
}

async function submitPayment(payment: YooKassaPayment, config: YooKassaConfig) {
  const paymentMethod = yooKassaPaymentMethod(payment.returnUrl);
  const remote = await yooKassaRequest(
    config,
    "payments",
    yooKassaPaymentSchema,
    {
      key: payment.idempotenceKey,
      body: {
        amount: {
          value: payment.amount.toFixed(2),
          currency: payment.currency,
        },
        payment_method_data: { type: paymentMethod },
        capture: true,
        confirmation: { type: "redirect", return_url: payment.returnUrl },
        description: payment.subscriptionOrderId
          ? "Тестовая подписка SpiritLM на 30 дней"
          : paymentMethod === "sbp"
            ? YOOKASSA.LEGACY_SBP_DESCRIPTION
            : YOOKASSA.DESCRIPTION,
        metadata: { spiritlm_payment_id: payment.id },
      },
    },
  );
  if (remote.metadata.spiritlm_payment_id !== payment.id) {
    throw new ApiError(502, "payment_mismatch", "Данные платежа не совпадают");
  }
  return unwrapAction(
    await applyYookassaPayment({
      mode: config.mode,
      shopId: config.shopId,
      payment: remote,
    }),
  );
}

export async function createYooKassaPayment(
  userId: string,
  amount: string,
  requestId: string,
  origin: string,
  subscriptionOrderId?: string,
): Promise<PaymentSummary> {
  const config = yooKassaConfig();
  const existing = unwrapAction(
    await getYookassaPayment({
      userId,
      requestId,
      mode: config.mode,
      shopId: config.shopId,
    }),
  ).payment;
  // Availability only gates new invoices; an earlier accepted request must remain recoverable.
  if (!existing) await requireYooKassaBankCard(config);
  const { payment, created } = unwrapAction(
    await reserveYookassaPayment({
      userId,
      amount,
      requestId,
      mode: config.mode,
      shopId: config.shopId,
      subscriptionOrderId,
      returnUrl: new URL(
        subscriptionOrderId
          ? `/dashboard/subscription?payment_method=bank_card&order=${encodeURIComponent(subscriptionOrderId)}`
          : "/dashboard?payment_method=bank_card",
        origin,
      ).toString(),
    }),
  );
  if (!created) {
    await reconcileYooKassaPayment(payment, config);
    const result = unwrapAction(
      await getYookassaPayment({
        userId,
        id: payment.id,
        mode: config.mode,
        shopId: config.shopId,
      }),
    );
    return summarize(result.payment!);
  }
  try {
    return summarize(await submitPayment(payment, config));
  } catch (error) {
    // The provider may already have accepted the payment. Keep its identity
    // and recover using the persisted idempotency key, never a fresh key.
    if (
      error instanceof ApiError &&
      error.code === "yookassa_creation_rejected"
    ) {
      // Only a definitive rejection of the first attempt can close a reservation.
      // A recovery failure must never discard an earlier accepted payment.
      unwrapAction(await failYookassaPayment({ id: payment.id }));
      return summarize({ ...payment, status: "FAILED" });
    }
    return summarize(payment);
  }
}

export async function reconcileYooKassaPayment(
  payment: YooKassaPayment,
  config: YooKassaConfig,
  force = false,
): Promise<void> {
  if (payment.mode !== config.mode || payment.shopId !== config.shopId) {
    throw new ApiError(
      409,
      "payment_environment",
      "Окружение платежа не совпадает",
    );
  }
  if (payment.creditedAt || ["CANCELLED", "FAILED"].includes(payment.status))
    return;
  if (!force && !unwrapAction(await claimYookassaCheck({ id: payment.id })))
    return;
  if (payment.providerId) {
    const remote = await yooKassaRequest(
      config,
      `payments/${encodeURIComponent(payment.providerId)}`,
      yooKassaPaymentSchema,
    );
    if (
      remote.id !== payment.providerId ||
      remote.metadata.spiritlm_payment_id !== payment.id
    ) {
      throw new ApiError(
        502,
        "payment_mismatch",
        "Данные платежа не совпадают",
      );
    }
    unwrapAction(
      await applyYookassaPayment({
        mode: config.mode,
        shopId: config.shopId,
        payment: remote,
      }),
    );
    return;
  }
  if (Date.now() - payment.createdAt.getTime() < YOOKASSA.CREATE_RECOVERY_MS) {
    await submitPayment(payment, config);
    return;
  }
  // After the idempotency retention window POST could create a second charge.
  // Scan the original time range instead; incomplete recovery never closes it.
  let cursor: string | undefined;
  const to = new Date(
    payment.createdAt.getTime() + YOOKASSA.CREATE_RECOVERY_MS,
  );
  for (let page = 0; page < PAYMENT_LIMITS.RECOVERY_PAGES; page += 1) {
    const query = new URLSearchParams({
      "created_at.gte": new Date(
        payment.createdAt.getTime() - 60_000,
      ).toISOString(),
      "created_at.lte": to.toISOString(),
      limit: String(PAYMENT_LIMITS.PAGE_SIZE),
      ...(cursor ? { cursor } : {}),
    });
    const result = await yooKassaRequest(
      config,
      `payments?${query}`,
      z.object({
        items: z.array(z.unknown()),
        next_cursor: z.string().optional(),
      }),
    );
    for (const item of result.items) {
      const identity = z
        .object({ metadata: z.object({ spiritlm_payment_id: z.string() }) })
        .safeParse(item);
      if (
        !identity.success ||
        identity.data.metadata.spiritlm_payment_id !== payment.id
      )
        continue;
      const remote = yooKassaPaymentSchema.safeParse(item);
      if (!remote.success)
        throw new ApiError(
          502,
          "invalid_yookassa_response",
          "Некорректные данные платежа",
        );
      unwrapAction(
        await applyYookassaPayment({
          mode: config.mode,
          shopId: config.shopId,
          payment: remote.data,
        }),
      );
      return;
    }
    cursor = result.next_cursor;
    if (!cursor) break;
  }
  throw new ApiError(
    503,
    "recovery_pending",
    "Статус платежа уточняется. Обратитесь в поддержку.",
  );
}

export async function cancelYooKassaPaymentForUser(
  userId: string,
  id: string,
): Promise<PaymentSummary> {
  const config = yooKassaConfig();
  const scope = { userId, id, mode: config.mode, shopId: config.shopId };
  let { payment } = unwrapAction(await getYookassaPayment(scope));
  if (!payment)
    throw new ApiError(404, "payment_not_found", "Платёж не найден");
  if (payment.status === "CREATING") {
    await reconcileYooKassaPayment(payment, config, true);
    payment = unwrapAction(await getYookassaPayment(scope)).payment;
    if (!payment)
      throw new ApiError(404, "payment_not_found", "Платёж не найден");
  }
  if (["PAID", "CANCELLED", "FAILED", "EXPIRED"].includes(payment.status)) {
    return summarize(payment);
  }
  if (payment.status !== "PENDING" || !payment.providerId) {
    throw new ApiError(
      409,
      "payment_not_cancellable",
      "Этот счёт пока нельзя отменить",
    );
  }

  const path = `payments/${encodeURIComponent(payment.providerId)}`;
  let remote = await yooKassaRequest(config, path, yooKassaPaymentSchema);
  const applyRemote = async (current: YooKassaPaymentObject) => {
    if (
      current.id !== payment.providerId ||
      current.metadata.spiritlm_payment_id !== payment.id
    ) {
      throw new ApiError(
        502,
        "payment_mismatch",
        "Данные платежа не совпадают",
      );
    }
    return unwrapAction(
      await applyYookassaPayment({
        mode: config.mode,
        shopId: config.shopId,
        payment: current,
      }),
    );
  };
  const current = await applyRemote(remote);
  if (["PAID", "CANCELLED"].includes(current.status)) return summarize(current);
  // Redirect payments cannot be canceled while the customer has not paid.
  // Only an authorized two-stage payment can be canceled through this API.
  if (remote.status !== "waiting_for_capture") {
    // Dismiss locally while reconciliation continues until the provider's final status.
    // A late successful payment must still credit the account exactly once.
    return summarize(unwrapAction(await dismissYookassaPayment(scope)));
  }
  let cancellationError: unknown;
  try {
    remote = await yooKassaRequest(
      config,
      `${path}/cancel`,
      yooKassaPaymentSchema,
      {
        key: `cancel-${payment.id}`,
        body: {},
      },
    );
  } catch (error) {
    cancellationError = error;
    // Payment may have completed, or cancellation may have succeeded before a timeout.
    // Read the provider directly, bypassing the background check throttle.
    remote = await yooKassaRequest(config, path, yooKassaPaymentSchema);
  }
  const latest = await applyRemote(remote);
  if (["PAID", "CANCELLED"].includes(latest.status)) return summarize(latest);
  if (cancellationError) throw cancellationError;
  throw new ApiError(
    409,
    "payment_not_cancellable",
    "Не удалось отменить счёт",
  );
}

export async function yooKassaPaymentOverview(
  userId: string,
  id?: string,
  reconcile = false,
): Promise<PaymentOverview> {
  const config = yooKassaConfig();
  const scope = { userId, id, mode: config.mode, shopId: config.shopId };
  let result = unwrapAction(await getYookassaPayment(scope));
  if (reconcile && result.payment) {
    await reconcileYooKassaPayment(result.payment, config);
    result = unwrapAction(await getYookassaPayment(scope));
  }
  return {
    mode: config.mode,
    testBalance: result.testBalance,
    payment: result.payment ? summarize(result.payment) : null,
  };
}

export async function reconcilePendingYooKassaPayments() {
  const config = yooKassaConfig();
  const payments = unwrapAction(
    await listPendingYookassaPayments({
      mode: config.mode,
      shopId: config.shopId,
    }),
  );
  let failed = 0;
  for (const payment of payments) {
    try {
      await reconcileYooKassaPayment(payment, config);
    } catch {
      failed += 1;
      console.error("YooKassa reconciliation failed", payment.id);
    }
  }
  return { checked: payments.length, failed };
}
