import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID, createHash, createHmac } from "node:crypto";
import { db } from "../../src/lib/db";
import { createCryptoPayment, cryptoPaymentOverview, reconcilePendingCryptoPayments } from "../../src/lib/crypto-payments";
import { applyCryptoInvoice } from "../../src/actions/apply-crypto-invoice";
import { POST as webhook } from "../../src/app/api/payments/cryptobot/webhook/route";
import { withCryptoFixture } from "../helpers/crypto-fixture";

after(() => db.$disconnect());

function notification(invoice: unknown, token = "777:test-token") {
  const body = JSON.stringify({ update_type: "invoice_paid", payload: invoice });
  const signature = createHmac("sha256", createHash("sha256").update(token).digest())
    .update(body).digest("hex");
  return new Request("https://spiritlm.example/api/payments/cryptobot/webhook", {
    method: "POST",
    headers: { "crypto-pay-api-signature": signature },
    body,
  });
}

test("concurrent creation is idempotent, and payment reads enforce ownership", async () =>
  withCryptoFixture(async ({ user, other, provider }) => {
    const requestId = randomUUID();
    const [first, second] = await Promise.all([
      createCryptoPayment(user.id, "1000.01", requestId),
      createCryptoPayment(user.id, "1000.01", requestId),
    ]);
    assert.equal(first.id, second.id);
    assert.equal(provider.creates, 1);
    await assert.rejects(createCryptoPayment(user.id, "2000", requestId));
    await assert.rejects(cryptoPaymentOverview(other.id, first.id, true));
    assert.equal(provider.reads, 0);
    assert.equal(await db.payment.count({ where: { userId: user.id } }), 1);
  }));

test("polling and duplicate signed webhooks credit the test balance exactly once", async () =>
  withCryptoFixture(async ({ user, pay }) => {
    const payment = await createCryptoPayment(user.id, "1000.01", randomUUID());
    const invoice = pay(1);
    const responses = await Promise.all([
      webhook(notification(invoice)),
      webhook(notification(invoice)),
      cryptoPaymentOverview(user.id, payment.id, true),
    ]);
    assert.equal((responses[0] as Response).status, 200);
    assert.equal((responses[1] as Response).status, 200);
    const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(account.testBalance.toFixed(8), "1000.01000000");
    assert.equal(account.balance.toFixed(8), "0.00000000");
    assert.equal(await db.balanceEntry.count({ where: { userId: user.id } }), 0);
    assert.equal((await cryptoPaymentOverview(user.id, payment.id)).payment?.status, "PAID");
  }));

test("invalid signatures and mismatching invoice data cannot credit a balance", async () =>
  withCryptoFixture(async ({ user, pay }) => {
    await createCryptoPayment(user.id, "1000", randomUUID());
    const invoice = pay(1);
    assert.equal((await webhook(notification(invoice, "wrong-token"))).status, 401);
    assert.equal((await webhook(notification({ ...invoice, amount: "999" }))).status, 409);
    assert.equal((await webhook(notification({ ...invoice, fiat: "USD" }))).status, 400);
    assert.equal((await webhook(notification({ ...invoice, invoice_id: 999 }))).status, 409);
    const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(account.testBalance.toString(), "0");
  }));

test("a lost creation response is recovered by payload without creating another invoice", async () =>
  withCryptoFixture(async ({ user, provider, pay }) => {
    provider.createResult = "lost";
    const requestId = randomUUID();
    const payment = await createCryptoPayment(user.id, "500", requestId);
    assert.equal(payment.status, "CREATING");
    assert.equal((await createCryptoPayment(user.id, "500", requestId)).id, payment.id);
    assert.equal(provider.creates, 1);
    pay(1);
    assert.equal((await cryptoPaymentOverview(user.id, payment.id, true)).payment?.status, "PAID");
    assert.equal(provider.creates, 1);
  }));

test("a rejected creation frees the pending limit and does not retry the same request", async () =>
  withCryptoFixture(async ({ user, provider }) => {
    provider.createResult = "rejected";
    const requestId = randomUUID();
    const payment = await createCryptoPayment(user.id, "500", requestId);
    assert.equal(payment.status, "FAILED");
    assert.equal((await createCryptoPayment(user.id, "500", requestId)).status, "FAILED");
    assert.equal(provider.creates, 1);
    provider.createResult = "ok";
    assert.equal((await createCryptoPayment(user.id, "500", randomUUID())).status, "PENDING");
  }));

test("an uncreated invoice is closed only after a complete successful recovery scan and its lifetime", async () =>
  withCryptoFixture(async ({ user, invoices, provider }) => {
    provider.createResult = "lost";
    const payment = await createCryptoPayment(user.id, "500", randomUUID());
    invoices.clear();
    assert.equal((await cryptoPaymentOverview(user.id, payment.id, true)).payment?.status, "CREATING");
    await db.payment.update({
      where: { id: payment.id },
      data: { createdAt: new Date(Date.now() - 31 * 60_000), checkedAt: null },
    });
    assert.equal((await cryptoPaymentOverview(user.id, payment.id, true)).payment?.status, "FAILED");
    assert.equal(provider.creates, 1);
  }));

test("late confirmation of an expired invoice is accepted and stale updates cannot undo payment", async () =>
  withCryptoFixture(async ({ user, invoices, pay }) => {
    const payment = await createCryptoPayment(user.id, "100", randomUUID());
    const expired = { ...invoices.get(1)!, status: "expired" as const };
    const result = await applyCryptoInvoice({ mode: "test", appId: "777", invoice: expired });
    assert.equal(result.data?.status, "EXPIRED");
    const paid = pay(1);
    assert.equal((await webhook(notification(paid))).status, 200);
    await applyCryptoInvoice({ mode: "test", appId: "777", invoice: expired });
    assert.equal((await cryptoPaymentOverview(user.id, payment.id)).payment?.status, "PAID");
  }));

test("live credits use the real ledger, remain atomic, and stay isolated from test credits", async () =>
  withCryptoFixture(async ({ user, other, pay }) => {
    await createCryptoPayment(user.id, "100", randomUUID());
    await webhook(notification(pay(1)));
    process.env.CRYPTO_BOT_MODE = "live";
    const payment = await createCryptoPayment(user.id, "500.01", randomUUID());
    const invoice = pay(2);
    const collision = await db.balanceEntry.create({
      data: { userId: other.id, operationId: "cryptobot:live:888:2", amount: "1", note: "Test collision" },
    });
    assert.equal((await webhook(notification(invoice, "888:live-token"))).status, 500);
    let account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(account.balance.toString(), "0");
    assert.equal((await cryptoPaymentOverview(user.id, payment.id)).payment?.status, "PENDING");
    await db.balanceEntry.delete({ where: { id: collision.id } });
    await Promise.all([
      webhook(notification(invoice, "888:live-token")),
      webhook(notification(invoice, "888:live-token")),
    ]);
    account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(account.balance.toFixed(2), "500.01");
    assert.equal(account.testBalance.toFixed(2), "100.00");
    assert.equal(await db.balanceEntry.count({ where: { userId: user.id } }), 1);
  }));

test("background reconciliation recovers payments while the modal is closed", async () =>
  withCryptoFixture(async ({ user, pay, provider }) => {
    await createCryptoPayment(user.id, "250", randomUUID());
    pay(1);
    assert.deepEqual(await reconcilePendingCryptoPayments(), { checked: 1, failed: 0 });
    assert.equal((await cryptoPaymentOverview(user.id)).payment?.status, "PAID");
    await reconcilePendingCryptoPayments();
    assert.equal(provider.reads, 1);
  }));

test("pending and hourly limits are enforced on the server", async () =>
  withCryptoFixture(async ({ user, provider }) => {
    for (let index = 0; index < 3; index += 1) {
      await createCryptoPayment(user.id, "100", randomUUID());
    }
    await assert.rejects(createCryptoPayment(user.id, "100", randomUUID()));
    assert.equal(provider.creates, 3);
    await db.payment.updateMany({ where: { userId: user.id }, data: { status: "EXPIRED" } });
    provider.createResult = "rejected";
    for (let index = 0; index < 7; index += 1) {
      await createCryptoPayment(user.id, "100", randomUUID());
    }
    await assert.rejects(createCryptoPayment(user.id, "100", randomUUID()));
    assert.equal(provider.creates, 10);
  }));
