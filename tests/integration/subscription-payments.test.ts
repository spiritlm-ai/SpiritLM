import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { db } from "../../src/lib/db";
import {
  checkoutSubscription,
  subscriptionOrderStatus,
  cancelSubscriptionOrder,
} from "../../src/lib/subscriptions";
import { applyCryptoInvoice } from "../../src/actions/apply-crypto-invoice";
import { applyYookassaPayment } from "../../src/actions/apply-yookassa-payment";
import { getSubscription } from "../../src/actions/get-subscription";
import { unwrapAction } from "../../src/lib/create-safe-action";
import { withCryptoFixture } from "../helpers/crypto-fixture";
import { withYooKassaFixture } from "../helpers/yookassa-fixture";

after(() => db.$disconnect());
const origin = "https://spiritlm.example";

test("CryptoBot live activates a package exactly once without topping up money", async () =>
  withCryptoFixture(async ({ user, other, pay, provider }) => {
    process.env.CRYPTO_BOT_MODE = "live";
    const first = await checkoutSubscription(
      user.id,
      "sirius",
      "cryptobot",
      randomUUID(),
      origin,
    );
    const repeated = await checkoutSubscription(
      user.id,
      "sirius",
      "cryptobot",
      randomUUID(),
      origin,
    );
    assert.equal(first.id, repeated.id);
    assert.equal(provider.creates, 1);
    await assert.rejects(subscriptionOrderStatus(other.id, first.id));
    const invoice = pay(1);
    assert.equal(
      (
        await applyCryptoInvoice({
          mode: "live",
          appId: "888",
          invoice: { ...invoice, amount: "1" },
        })
      ).status,
      409,
    );
    const results = await Promise.all([
      applyCryptoInvoice({ mode: "live", appId: "888", invoice }),
      applyCryptoInvoice({ mode: "live", appId: "888", invoice }),
    ]);
    assert.ok(
      results.every((r) => r.data),
      JSON.stringify(results),
    );
    const summary = unwrapAction(await getSubscription({ userId: user.id }));
    assert.equal(summary.current?.credits, "3750.00000000");
    assert.equal(summary.balance, "0.00000000");
    assert.equal(
      await db.balanceEntry.count({ where: { userId: user.id } }),
      0,
    );
    assert.equal(
      await db.subscriptionPeriod.count({ where: { userId: user.id } }),
      1,
    );
  }));

test("test card activation is isolated, including duplicate confirmations", async () =>
  withYooKassaFixture(async ({ user, pay, provider }) => {
    const order = await checkoutSubscription(
      user.id,
      "vega",
      "card",
      randomUUID(),
      origin,
    );
    const remote = pay();
    await Promise.all([
      applyYookassaPayment({ mode: "test", shopId: "123", payment: remote }),
      applyYookassaPayment({ mode: "test", shopId: "123", payment: remote }),
    ]);
    assert.equal(provider.creates, 1);
    const summary = unwrapAction(await getSubscription({ userId: user.id }));
    assert.equal(summary.current, null);
    assert.equal(summary.testPeriods.length, 1);
    assert.equal(summary.testPeriods[0].credits, "1800.00000000");
    const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(account.balance.toString(), "0");
    assert.equal(account.testBalance.toString(), "0");
    assert.equal(
      (await subscriptionOrderStatus(user.id, order.id)).status,
      "PAID",
    );
  }));

test("lost CryptoBot response is recovered and expired payment can still activate once", async () =>
  withCryptoFixture(async ({ user, provider, invoices, pay }) => {
    provider.createResult = "lost";
    const order = await checkoutSubscription(
      user.id,
      "nova",
      "cryptobot",
      randomUUID(),
      origin,
    );
    assert.equal(order.status, "CREATING");
    const expired = { ...invoices.get(1)!, status: "expired" as const };
    unwrapAction(
      await applyCryptoInvoice({
        mode: "test",
        appId: "777",
        invoice: expired,
      }),
    );
    const second = await checkoutSubscription(
      user.id,
      "vega",
      "cryptobot",
      randomUUID(),
      origin,
    );
    assert.notEqual(second.id, order.id);
    unwrapAction(
      await applyCryptoInvoice({ mode: "test", appId: "777", invoice: pay(1) }),
    );
    assert.equal(
      (await subscriptionOrderStatus(user.id, order.id)).status,
      "PAID",
    );
    assert.equal(
      await db.subscriptionPeriod.count({ where: { userId: user.id } }),
      1,
    );
  }));

test("dismissed card checkout frees tariff selection but late payment still fulfills it", async () =>
  withYooKassaFixture(async ({ user, pay }) => {
    const order = await checkoutSubscription(
      user.id,
      "nova",
      "card",
      randomUUID(),
      origin,
    );
    assert.equal(
      (await cancelSubscriptionOrder(user.id, order.id)).status,
      "CANCELLED",
    );
    const second = await checkoutSubscription(
      user.id,
      "vega",
      "card",
      randomUUID(),
      origin,
    );
    assert.notEqual(second.id, order.id);
    unwrapAction(
      await applyYookassaPayment({
        mode: "test",
        shopId: "123",
        payment: pay(),
      }),
    );
    assert.equal(
      (await subscriptionOrderStatus(user.id, order.id)).status,
      "PAID",
    );
  }));

test("a card order without an invoice can be cancelled and does not block a new tariff", async () =>
  withYooKassaFixture(async ({ user, provider }) => {
    provider.cardAvailable = false;
    await assert.rejects(
      checkoutSubscription(user.id, "nova", "card", randomUUID(), origin),
    );
    const pending = await db.subscriptionOrder.findFirstOrThrow({
      where: { userId: user.id },
    });
    assert.equal(
      (await cancelSubscriptionOrder(user.id, pending.id)).status,
      "CANCELLED",
    );
    provider.cardAvailable = true;
    const next = await checkoutSubscription(
      user.id,
      "vega",
      "card",
      randomUUID(),
      origin,
    );
    assert.equal(next.status, "PENDING");
    assert.notEqual(next.id, pending.id);
  }));
