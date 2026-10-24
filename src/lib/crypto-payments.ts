import type { Payment } from "@prisma/client";
import { z } from "zod";
import { reserveCryptoPayment } from "@/actions/reserve-crypto-payment";
import { failCryptoPayment } from "@/actions/fail-crypto-payment";
import { getCryptoPayment } from "@/actions/get-crypto-payment";
import { claimPaymentCheck } from "@/actions/claim-payment-check";
import { applyCryptoInvoice } from "@/actions/apply-crypto-invoice";
import { listPendingCryptoPayments } from "@/actions/list-pending-crypto-payments";
import { cancelCryptoPayment } from "@/actions/cancel-crypto-payment";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";
import type {
  CryptoBotConfig,
  PaymentOverview,
  PaymentSummary,
} from "@/configs/types/payments.types";
import { ApiError } from "./api-error";
import { unwrapAction } from "./create-safe-action";
import { cryptoInvoiceSchema } from "@/configs/schemas/payments.schema";
import { cryptoBotConfig, cryptoPayRequest } from "./crypto-pay";

function summarize(payment: Payment, config: CryptoBotConfig): PaymentSummary {
  return {
    id: payment.id,
    amount: payment.amount.toFixed(2),
    mode: config.mode,
    status: payment.status,
    invoiceUrl: payment.invoiceUrl,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
  };
}

export async function createCryptoPayment(
  userId: string,
  amount: string,
  requestId: string,
  subscriptionOrderId?: string,
): Promise<PaymentSummary> {
  const config = cryptoBotConfig();
  const { payment, created } = unwrapAction(
    await reserveCryptoPayment({
      userId,
      amount,
      requestId,
      subscriptionOrderId,
      mode: config.mode,
      appId: config.appId,
    }),
  );
  if (!created) return summarize(payment, config);

  try {
    const invoice = await cryptoPayRequest(
      config,
      "createInvoice",
      {
        currency_type: "fiat",
        fiat: "RUB",
        amount: payment.amount.toFixed(2),
        // Crypto Pay API still uses the TON asset code after the TON → GRAM rename.
        accepted_assets: "USDT,TON",
        expires_in: PAYMENT_LIMITS.INVOICE_SECONDS,
        payload: payment.id,
        description: payment.subscriptionOrderId
          ? `${config.mode === "test" ? "Тестовая подписка" : "Подписка"} SpiritLM на 30 дней`
          : config.mode === "test"
            ? "Тестовое пополнение SpiritLM"
            : "Пополнение баланса SpiritLM",
        allow_comments: false,
      },
      cryptoInvoiceSchema,
    );
    if (invoice.payload !== payment.id) {
      throw new ApiError(
        502,
        "invoice_mismatch",
        "Данные счёта не совпадают с платежом",
      );
    }
    return summarize(
      unwrapAction(
        await applyCryptoInvoice({
          mode: config.mode,
          appId: config.appId,
          invoice,
        }),
      ),
      config,
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === "crypto_pay_rejected") {
      unwrapAction(await failCryptoPayment({ id: payment.id }));
      return summarize({ ...payment, status: "FAILED" }, config);
    }
    // The provider may have created an invoice before a timeout or a DB failure.
    // Keep the original payment and recover its invoice by payload; never retry creation.
    return summarize(payment, config);
  }
}

export async function cancelCryptoPaymentForUser(
  userId: string,
  id: string,
): Promise<PaymentSummary> {
  const config = cryptoBotConfig();
  const input = { userId, id, mode: config.mode, appId: config.appId };
  const { payment } = unwrapAction(await getCryptoPayment(input));
  if (!payment)
    throw new ApiError(404, "payment_not_found", "Платёж не найден");
  if (
    payment.status === "PAID" ||
    payment.status === "EXPIRED" ||
    payment.status === "CANCELLED" ||
    payment.status === "FAILED"
  ) {
    return summarize(payment, config);
  }
  if (payment.status !== "PENDING" || payment.invoiceId === null) {
    throw new ApiError(
      409,
      "payment_not_cancellable",
      "Этот счёт пока нельзя отменить",
    );
  }

  let deleted = false;
  try {
    deleted = await cryptoPayRequest(
      config,
      "deleteInvoice",
      {
        invoice_id: Number(payment.invoiceId),
      },
      z.boolean(),
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "crypto_invoice_not_found"
    ) {
      unwrapAction(
        await cancelCryptoPayment({
          id,
          userId,
          mode: config.mode,
          appId: config.appId,
        }),
      );
      const latest = unwrapAction(await getCryptoPayment(input)).payment;
      if (latest) return summarize(latest, config);
    }
    if (
      !(error instanceof ApiError) ||
      !["crypto_pay_rejected", "crypto_invoice_already_paid"].includes(
        error.code,
      )
    )
      throw error;
    // A paid invoice cannot be deleted. Reconcile it before reporting the outcome.
    await reconcileCryptoPayment(payment, config, true);
    const latest = unwrapAction(await getCryptoPayment(input)).payment;
    if (latest && latest.status !== "PENDING") return summarize(latest, config);
    throw error;
  }

  if (!deleted) {
    await reconcileCryptoPayment(payment, config, true);
    const latest = unwrapAction(await getCryptoPayment(input)).payment;
    if (latest && latest.status !== "PENDING") return summarize(latest, config);
    throw new ApiError(
      409,
      "payment_not_cancellable",
      "Не удалось отменить счёт",
    );
  }

  unwrapAction(
    await cancelCryptoPayment({
      id,
      userId,
      mode: config.mode,
      appId: config.appId,
    }),
  );
  const latest = unwrapAction(await getCryptoPayment(input)).payment;
  if (!latest) throw new ApiError(404, "payment_not_found", "Платёж не найден");
  return summarize(latest, config);
}

export async function reconcileCryptoPayment(
  payment: Payment,
  config: CryptoBotConfig,
  force = false,
): Promise<void> {
  if (payment.mode !== config.mode || payment.appId !== config.appId) {
    throw new ApiError(
      409,
      "payment_environment",
      "Окружение платежа не совпадает",
    );
  }
  if (payment.creditedAt || payment.status === "FAILED") return;
  if (!force && !unwrapAction(await claimPaymentCheck({ id: payment.id })))
    return;

  for (let page = 0; page < PAYMENT_LIMITS.RECOVERY_PAGES; page += 1) {
    const { items } = await cryptoPayRequest(
      config,
      "getInvoices",
      {
        ...(payment.invoiceId ? { invoice_ids: payment.invoiceId } : {}),
        count: PAYMENT_LIMITS.PAGE_SIZE,
        offset: page * PAYMENT_LIMITS.PAGE_SIZE,
      },
      z.object({ items: z.array(z.unknown()) }),
    );
    for (const item of items) {
      const identity = z
        .object({
          payload: z.string().optional(),
          invoice_id: z.number(),
        })
        .safeParse(item);
      if (!identity.success || identity.data.payload !== payment.id) continue;
      const invoice = cryptoInvoiceSchema.safeParse(item);
      if (!invoice.success) {
        throw new ApiError(
          502,
          "invalid_invoice",
          "CryptoBot вернул некорректный счёт",
        );
      }
      unwrapAction(
        await applyCryptoInvoice({
          mode: config.mode,
          appId: config.appId,
          invoice: invoice.data,
        }),
      );
      return;
    }
    if (payment.invoiceId) return;
    if (items.length < PAYMENT_LIMITS.PAGE_SIZE) {
      // Only close an orphan after a complete successful provider listing and
      // the full invoice lifetime. A delayed signed payment can still settle it.
      if (
        payment.status === "CREATING" &&
        Date.now() - payment.createdAt.getTime() >
          PAYMENT_LIMITS.INVOICE_SECONDS * 1000
      ) {
        unwrapAction(await failCryptoPayment({ id: payment.id }));
      }
      return;
    }
  }
  throw new ApiError(
    503,
    "recovery_pending",
    "Сверка счёта ещё не завершена. Обратитесь в поддержку.",
  );
}

export async function cryptoPaymentOverview(
  userId: string,
  id?: string,
  reconcile = false,
): Promise<PaymentOverview> {
  const config = cryptoBotConfig();
  const input = { userId, id, mode: config.mode, appId: config.appId };
  let result = unwrapAction(await getCryptoPayment(input));
  if (reconcile && result.payment) {
    await reconcileCryptoPayment(result.payment, config);
    result = unwrapAction(await getCryptoPayment(input));
  }
  return {
    mode: config.mode,
    testBalance: result.testBalance,
    payment: result.payment ? summarize(result.payment, config) : null,
  };
}

export async function reconcilePendingCryptoPayments() {
  const config = cryptoBotConfig();
  const payments = unwrapAction(
    await listPendingCryptoPayments({
      mode: config.mode,
      appId: config.appId,
    }),
  );
  let failed = 0;
  for (const payment of payments) {
    try {
      await reconcileCryptoPayment(payment, config);
    } catch {
      failed += 1;
      console.error("CryptoBot reconciliation failed", payment.id);
    }
  }
  return { checked: payments.length, failed };
}
