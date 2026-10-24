import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { db } from "../../src/lib/db";
import {
  createYooKassaPayment,
  yooKassaPaymentOverview,
  reconcilePendingYooKassaPayments,
  cancelYooKassaPaymentForUser,
} from "../../src/lib/yookassa-payments";
import { applyYookassaPayment } from "../../src/actions/apply-yookassa-payment";
import { unwrapAction } from "../../src/lib/create-safe-action";
import { POST as webhook } from "../../src/app/api/payments/yookassa/webhook/route";
import { withYooKassaFixture } from "../helpers/yookassa-fixture";
import { YOOKASSA } from "../../src/configs/consts/yookassa.const";
import { reserveYookassaPayment } from "../../src/actions/reserve-yookassa-payment";
import { yooKassaConfig, yooKassaRequest } from "../../src/lib/yookassa";
import { yooKassaPaymentSchema } from "../../src/configs/schemas/yookassa.schema";

after(() => db.$disconnect());
const origin = "https://spiritlm.example";

test("YooKassa creates a bank-card redirect and returns to the card form", async () =>
  withYooKassaFixture(async ({ user, payments }) => {
    const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    const remote = [...payments.values()][0];
    assert.equal(remote.payment_method.type, "bank_card");
    assert.equal(payment.status, "PENDING");
    assert.ok(payment.invoiceUrl);
    const stored = await db.yooKassaPayment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    assert.equal(new URL(stored.returnUrl).searchParams.get("payment_method"), "bank_card");
  }));

test("YooKassa preserves the original body when recovering an earlier SBP invoice", async () =>
  withYooKassaFixture(async ({ user, provider, pay }) => {
    const { payment } = unwrapAction(
      await reserveYookassaPayment({
        userId: user.id,
        amount: "100",
        requestId: randomUUID(),
        mode: "test",
        shopId: "123",
        returnUrl: `${origin}/dashboard?payment_method=sbp`,
      }),
    );
    provider.loseResponse = true;
    await assert.rejects(
      yooKassaRequest(yooKassaConfig(), "payments", yooKassaPaymentSchema, {
        key: payment.idempotenceKey,
        body: {
          amount: { value: "100.00", currency: "RUB" },
          payment_method_data: { type: "sbp" },
          capture: true,
          confirmation: { type: "redirect", return_url: payment.returnUrl },
          description: YOOKASSA.LEGACY_SBP_DESCRIPTION,
          metadata: { spiritlm_payment_id: payment.id },
        },
      }),
    );
    pay();
    await allowCheck(payment.id);
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id, true)).payment?.status,
      "PAID",
    );
    assert.equal(provider.creates, 1);
    assert.equal(provider.posts, 2);
  }));

test("YooKassa unavailable bank cards fails before reserving or creating an invoice", async () =>
  withYooKassaFixture(async ({ user, provider }) => {
    provider.cardAvailable = false;
    await assert.rejects(
      createYooKassaPayment(user.id, "100", randomUUID(), origin),
      /Оплата картой недоступна в тестовом магазине ЮKassa/,
    );
    assert.equal(provider.posts, 0);
    assert.equal(provider.creates, 0);
    assert.equal(await db.yooKassaPayment.count({ where: { userId: user.id } }), 0);
  }));

test("YooKassa existing requests remain recoverable after bank cards become unavailable", async () =>
  withYooKassaFixture(async ({ user, provider, pay }) => {
    provider.loseResponse = true;
    const requestId = randomUUID();
    const payment = await createYooKassaPayment(user.id, "100", requestId, origin);
    provider.cardAvailable = false;
    pay();
    await allowCheck(payment.id);
    const recovered = await createYooKassaPayment(user.id, "100", requestId, origin);
    assert.equal(recovered.status, "PAID");
    assert.equal(provider.creates, 1);
  }));

function notification(id: string, extra = {}) {
  return new Request(`${origin}/api/payments/yookassa/webhook`, {
    method: "POST",
    body: JSON.stringify({
      type: "notification",
      event: "payment.succeeded",
      object: { id, ...extra },
    }),
  });
}
async function allowCheck(id: string) {
  await db.yooKassaPayment.update({ where: { id }, data: { checkedAt: null } });
}

test("YooKassa pending cancellation dismisses the invoice and keeps late payments recoverable", async () =>
  withYooKassaFixture(async ({ user, other, provider, pay }) => {
    const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    await assert.rejects(cancelYooKassaPaymentForUser(other.id, payment.id), /не найден/);
    const cancelled = await cancelYooKassaPaymentForUser(user.id, payment.id);
    assert.equal(cancelled.status, "CANCELLED");
    assert.equal(cancelled.invoiceUrl, null);
    assert.equal(provider.cancellations, 0);
    assert.equal(
      (await yooKassaPaymentOverview(user.id)).payment?.status,
      "CANCELLED",
    );
    await allowCheck(payment.id);
    await reconcilePendingYooKassaPayments();
    assert.equal(
      (await yooKassaPaymentOverview(user.id)).payment?.status,
      "CANCELLED",
    );
    pay();
    await allowCheck(payment.id);
    await reconcilePendingYooKassaPayments();
    assert.equal((await yooKassaPaymentOverview(user.id)).testBalance, "100.00");
    await allowCheck(payment.id);
    await reconcilePendingYooKassaPayments();
    assert.equal((await yooKassaPaymentOverview(user.id)).testBalance, "100.00");
  }));

test("YooKassa invoices expire locally after ten minutes without losing a late payment", async () =>
  withYooKassaFixture(async ({ user, provider, pay }) => {
    const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    const stored = await db.yooKassaPayment.findUniqueOrThrow({ where: { id: payment.id } });
    assert.equal(
      new Date(payment.expiresAt!).getTime() - stored.createdAt.getTime(),
      YOOKASSA.INVOICE_LIFETIME_MS,
    );
    await db.yooKassaPayment.update({
      where: { id: payment.id },
      data: { createdAt: new Date(Date.now() - YOOKASSA.INVOICE_LIFETIME_MS - 1) },
    });
    const expired = (await yooKassaPaymentOverview(user.id)).payment!;
    assert.equal(expired.status, "EXPIRED");
    assert.equal(expired.invoiceUrl, null);
    pay();
    await allowCheck(payment.id);
    await reconcilePendingYooKassaPayments();
    const paid = await yooKassaPaymentOverview(user.id);
    assert.equal(paid.payment?.status, "PAID");
    assert.equal(paid.testBalance, "100.00");
    assert.equal(provider.creates, 1);
  }));

test("YooKassa dismissed and expired invoices do not block new invoices", async () =>
  withYooKassaFixture(async ({ user }) => {
    for (let index = 0; index < 3; index += 1) {
      const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
      await cancelYooKassaPaymentForUser(user.id, payment.id);
    }
    for (let index = 0; index < 3; index += 1) {
      const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
      await db.yooKassaPayment.update({
        where: { id: payment.id },
        data: { createdAt: new Date(Date.now() - YOOKASSA.INVOICE_LIFETIME_MS - 1) },
      });
    }
    const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    assert.equal(payment.status, "PENDING");
  }));

test("YooKassa cancellation checks ownership, confirms provider cancellation and allows a new invoice", async () =>
  withYooKassaFixture(async ({ user, other, provider, payments }) => {
    const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    [...payments.values()][0].status = "waiting_for_capture";
    await assert.rejects(cancelYooKassaPaymentForUser(other.id, payment.id), /не найден/);
    assert.equal(provider.cancellations, 0);
    assert.equal(
      (await cancelYooKassaPaymentForUser(user.id, payment.id)).status,
      "CANCELLED",
    );
    assert.equal(
      (await cancelYooKassaPaymentForUser(user.id, payment.id)).status,
      "CANCELLED",
    );
    assert.equal(provider.cancellations, 1);
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).testBalance,
      "0.00",
    );
    const next = await createYooKassaPayment(user.id, "500", randomUUID(), origin);
    assert.notEqual(next.id, payment.id);
    assert.equal(next.status, "PENDING");
  }));

test("YooKassa cancellation reconciles a concurrent payment exactly once", async () =>
  withYooKassaFixture(async ({ user, provider, payments }) => {
    const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    [...payments.values()][0].status = "waiting_for_capture";
    provider.payOnCancellation = true;
    assert.equal(
      (await cancelYooKassaPaymentForUser(user.id, payment.id)).status,
      "PAID",
    );
    assert.equal(
      (await cancelYooKassaPaymentForUser(user.id, payment.id)).status,
      "PAID",
    );
    assert.equal(provider.cancellations, 1);
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).testBalance,
      "100.00",
    );
  }));

test("YooKassa cancellation detects an already paid pending invoice without canceling it", async () =>
  withYooKassaFixture(async ({ user, provider, pay }) => {
    const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    pay();
    assert.equal(
      (await cancelYooKassaPaymentForUser(user.id, payment.id)).status,
      "PAID",
    );
    assert.equal(provider.cancellations, 0);
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).testBalance,
      "100.00",
    );
  }));

test("YooKassa cancellation recovers a lost provider response", async () =>
  withYooKassaFixture(async ({ user, provider, payments }) => {
    const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    [...payments.values()][0].status = "waiting_for_capture";
    provider.loseCancellationResponse = true;
    assert.equal(
      (await cancelYooKassaPaymentForUser(user.id, payment.id)).status,
      "CANCELLED",
    );
    assert.equal(provider.reads, 2);
  }));

test("YooKassa rejected or unavailable cancellation keeps the payment pending", async () =>
  withYooKassaFixture(async ({ user, provider, payments }) => {
    const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    [...payments.values()][0].status = "waiting_for_capture";
    provider.rejectCancellation = true;
    await assert.rejects(cancelYooKassaPaymentForUser(user.id, payment.id));
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).payment?.status,
      "PENDING",
    );
    assert.equal(provider.cancellations, 1);
    provider.unavailable = true;
    await assert.rejects(cancelYooKassaPaymentForUser(user.id, payment.id));
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).payment?.status,
      "PENDING",
    );
  }));

test("YooKassa cancellation recovers a creating payment before cancelling it", async () =>
  withYooKassaFixture(async ({ user, provider, payments }) => {
    provider.loseResponse = true;
    const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    [...payments.values()][0].status = "waiting_for_capture";
    assert.equal(payment.status, "CREATING");
    await db.yooKassaPayment.update({
      where: { id: payment.id },
      data: { checkedAt: new Date() },
    });
    assert.equal(
      (await cancelYooKassaPaymentForUser(user.id, payment.id)).status,
      "CANCELLED",
    );
    assert.equal(provider.cancellations, 1);
    assert.equal(provider.creates, 1);
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).payment?.status,
      "CANCELLED",
    );
  }));

test("YooKassa creating payment cancellation preserves a completed payment", async () =>
  withYooKassaFixture(async ({ user, provider, pay }) => {
    provider.loseResponse = true;
    const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    pay();
    assert.equal(
      (await cancelYooKassaPaymentForUser(user.id, payment.id)).status,
      "PAID",
    );
    assert.equal(provider.cancellations, 0);
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).testBalance,
      "100.00",
    );
  }));

test("YooKassa unavailable recovery never invents cancellation of a creating payment", async () =>
  withYooKassaFixture(async ({ user, provider }) => {
    provider.loseResponse = true;
    const payment = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    provider.unavailable = true;
    await assert.rejects(cancelYooKassaPaymentForUser(user.id, payment.id));
    assert.equal(provider.cancellations, 0);
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).payment?.status,
      "CREATING",
    );
  }));

test("YooKassa concurrent creation reuses identity and enforces account ownership", async () =>
  withYooKassaFixture(async ({ user, other, provider }) => {
    const requestId = randomUUID();
    const [a, b] = await Promise.all([
      createYooKassaPayment(user.id, "1000.01", requestId, origin),
      createYooKassaPayment(user.id, "1000.01", requestId, origin),
    ]);
    assert.equal(a.id, b.id);
    assert.equal(provider.creates, 1);
    await assert.rejects(createYooKassaPayment(user.id, "2000", requestId, origin));
    await assert.rejects(yooKassaPaymentOverview(other.id, a.id, true));
    assert.equal(provider.reads, 0);
  }));

test("YooKassa webhook and polling races credit test balance exactly once", async () =>
  withYooKassaFixture(async ({ user, pay }) => {
    const payment = await createYooKassaPayment(user.id, "1000.01", randomUUID(), origin);
    const remote = pay();
    await allowCheck(payment.id);
    const results = await Promise.all([
      webhook(notification(remote.id)),
      webhook(notification(remote.id)),
      yooKassaPaymentOverview(user.id, payment.id, true),
    ]);
    assert.equal((results[0] as Response).status, 200);
    assert.equal((results[1] as Response).status, 200);
    const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(account.testBalance.toFixed(8), "1000.01000000");
    assert.equal(account.balance.toString(), "0");
    assert.equal(await db.balanceEntry.count({ where: { userId: user.id } }), 0);
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).payment?.status,
      "PAID",
    );
  }));

test("YooKassa distrusts webhook payment data and requires server-confirmed success", async () =>
  withYooKassaFixture(async ({ user, payments }) => {
    const payment = await createYooKassaPayment(user.id, "1000", randomUUID(), origin);
    const remote = [...payments.values()][0];
    assert.equal(
      (await webhook(notification(remote.id, { status: "succeeded", paid: true })))
        .status,
      200,
    );
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).payment?.status,
      "PENDING",
    );
    const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(account.testBalance.toString(), "0");
    assert.equal((await webhook(notification(randomUUID()))).status, 502);
  }));

test("YooKassa rejects mode, shop, amount, currency, metadata and method mismatches", async () =>
  withYooKassaFixture(async ({ user, pay }) => {
    await createYooKassaPayment(user.id, "1000", randomUUID(), origin);
    const remote = pay();
    const changes = [
      { test: false },
      { recipient: { account_id: "456" } },
      { amount: { value: "999.00", currency: "RUB" } },
      { amount: { value: "1000.00", currency: "USD" } },
      { payment_method: { type: "sbp" } },
      { paid: false },
      { captured_at: undefined },
      { id: randomUUID() },
      { metadata: { spiritlm_payment_id: "unknown" } },
    ];
    // Bind providerId first, then ensure no alternate payment can settle it.
    for (const change of changes) {
      const result = await applyYookassaPayment({
        mode: "test",
        shopId: "123",
        payment: { ...remote, ...change },
      });
      assert.ok(result.error);
    }
    const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(account.testBalance.toString(), "0");
    assert.equal(account.balance.toString(), "0");
  }));

test("YooKassa recovers a lost create response with the same key and body", async () =>
  withYooKassaFixture(async ({ user, provider, pay }) => {
    provider.loseResponse = true;
    const requestId = randomUUID();
    const payment = await createYooKassaPayment(user.id, "500", requestId, origin);
    assert.equal(payment.status, "CREATING");
    pay();
    await allowCheck(payment.id);
    const recovered = await createYooKassaPayment(
      user.id,
      "500",
      requestId,
      "https://different.example",
    );
    assert.equal(recovered.status, "PAID");
    assert.equal(provider.creates, 1);
    assert.equal(provider.posts, 2);
  }));

test("YooKassa old orphans are recovered by listing without another POST", async () =>
  withYooKassaFixture(async ({ user, provider, pay }) => {
    provider.loseResponse = true;
    const payment = await createYooKassaPayment(user.id, "500", randomUUID(), origin);
    pay();
    await db.yooKassaPayment.update({
      where: { id: payment.id },
      data: {
        checkedAt: null,
        createdAt: new Date(Date.now() - YOOKASSA.CREATE_RECOVERY_MS - 60_000),
      },
    });
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id, true)).payment?.status,
      "PAID",
    );
    assert.equal(provider.lists, 1);
    assert.equal(provider.posts, 1);
  }));

test("YooKassa background recovery settles closed-tab payments and preserves cancellation", async () =>
  withYooKassaFixture(async ({ user, payments, pay }) => {
    const first = await createYooKassaPayment(user.id, "500", randomUUID(), origin);
    pay();
    await allowCheck(first.id);
    const reconciled = await reconcilePendingYooKassaPayments();
    assert.equal(reconciled.failed, 0);
    assert.equal(
      (await yooKassaPaymentOverview(user.id, first.id)).payment?.status,
      "PAID",
    );
    const second = await createYooKassaPayment(user.id, "100", randomUUID(), origin);
    const remote = [...payments.values()][1];
    remote.status = "canceled";
    await allowCheck(second.id);
    assert.equal(
      (await yooKassaPaymentOverview(user.id, second.id, true)).payment?.status,
      "CANCELLED",
    );
    remote.status = "pending";
    unwrapAction(
      await applyYookassaPayment({ mode: "test", shopId: "123", payment: remote }),
    );
    assert.equal(
      (await yooKassaPaymentOverview(user.id, second.id)).payment?.status,
      "CANCELLED",
    );
  }));

test("YooKassa local expiry preserves unresolved provider recovery", async () =>
  withYooKassaFixture(async ({ user, provider, payments }) => {
    const payment = await createYooKassaPayment(user.id, "500", randomUUID(), origin);
    provider.unavailable = true;
    await allowCheck(payment.id);
    await assert.rejects(yooKassaPaymentOverview(user.id, payment.id, true));
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).payment?.status,
      "PENDING",
    );
    provider.unavailable = false;
    payments.clear();
    await db.yooKassaPayment.update({
      where: { id: payment.id },
      data: {
        providerId: null,
        status: "CREATING",
        checkedAt: null,
        createdAt: new Date(Date.now() - YOOKASSA.CREATE_RECOVERY_MS - 60_000),
      },
    });
    await assert.rejects(yooKassaPaymentOverview(user.id, payment.id, true));
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).payment?.status,
      "EXPIRED",
    );
    const unresolved = await db.yooKassaPayment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    assert.equal(unresolved.status, "CREATING");
    assert.equal(unresolved.creditedAt, null);
    assert.equal(provider.posts, 1);
  }));

test("YooKassa rejects malformed and oversized webhook bodies", async () =>
  withYooKassaFixture(async ({ provider }) => {
    for (const body of [
      "invalid-json",
      "{}",
      JSON.stringify({
        type: "notification",
        event: "payment.succeeded",
        object: { id: "../invalid" },
      }),
    ]) {
      const response = await webhook(
        new Request(`${origin}/webhook`, { method: "POST", body }),
      );
      assert.equal(response.status, 400);
    }
    assert.equal(
      (
        await webhook(
          new Request(`${origin}/webhook`, { method: "POST", body: "x".repeat(65537) }),
        )
      ).status,
      413,
    );
    assert.equal(provider.reads, 0);
  }));

test("YooKassa initial definitive rejections release reservations without retrying", async () =>
  withYooKassaFixture(async ({ user, provider }) => {
    provider.rejectCreation = true;
    const requestId = randomUUID();
    const payment = await createYooKassaPayment(user.id, "500", requestId, origin);
    assert.equal(payment.status, "FAILED");
    assert.equal(
      (await createYooKassaPayment(user.id, "500", requestId, origin)).status,
      "FAILED",
    );
    assert.equal(provider.posts, 1);
    assert.equal(
      (
        await db.user.findUniqueOrThrow({ where: { id: user.id } })
      ).testBalance.toString(),
      "0",
    );
  }));

test("YooKassa recovery rejections keep an earlier ambiguous payment recoverable", async () =>
  withYooKassaFixture(async ({ user, provider, pay }) => {
    provider.loseResponse = true;
    const payment = await createYooKassaPayment(user.id, "500", randomUUID(), origin);
    provider.rejectCreation = true;
    await allowCheck(payment.id);
    await assert.rejects(yooKassaPaymentOverview(user.id, payment.id, true));
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id)).payment?.status,
      "CREATING",
    );
    provider.rejectCreation = false;
    pay();
    await allowCheck(payment.id);
    assert.equal(
      (await yooKassaPaymentOverview(user.id, payment.id, true)).payment?.status,
      "PAID",
    );
    assert.equal(provider.creates, 1);
  }));
