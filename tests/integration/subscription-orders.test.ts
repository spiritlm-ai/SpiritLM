import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { db } from "../../src/lib/db";
import { reserveSubscriptionOrder } from "../../src/actions/reserve-subscription-order";
import { getSubscriptionOrder } from "../../src/actions/get-subscription-order";
import { getSubscription } from "../../src/actions/get-subscription";
import { updateApiKey } from "../../src/actions/update-api-key";
import { unwrapAction } from "../../src/lib/create-safe-action";
import { SUBSCRIPTION_PERIOD_MS } from "../../src/configs/consts/subscriptions.const";
import { withBackendFixture } from "../helpers/backend-fixture";
import { buySubscription } from "../helpers/subscription-fixture";

after(() => db.$disconnect());

test("balance purchase is atomic, idempotent and isolated from test money", async () =>
  withBackendFixture(async ({ user, other }) => {
    await db.user.update({
      where: { id: user.id },
      data: { balance: 390, testBalance: 10000 },
    });
    const input = {
      userId: user.id,
      planId: "nova" as const,
      method: "balance" as const,
      mode: "live" as const,
      requestId: randomUUID(),
    };
    const results = await Promise.all([
      reserveSubscriptionOrder(input),
      reserveSubscriptionOrder(input),
    ]);
    assert.ok(
      results.every((r) => r.data),
      JSON.stringify(results),
    );
    assert.equal(results[0].data!.id, results[1].data!.id);
    assert.equal(
      await db.subscriptionPeriod.count({ where: { userId: user.id } }),
      1,
    );
    assert.equal(
      (
        await db.user.findUniqueOrThrow({ where: { id: user.id } })
      ).balance.toString(),
      "0",
    );
    assert.equal(
      await db.balanceEntry.count({ where: { userId: user.id } }),
      1,
    );
    assert.equal(
      (
        await getSubscriptionOrder({
          userId: other.id,
          id: results[0].data!.id,
        })
      ).status,
      404,
    );
    assert.equal(
      (await reserveSubscriptionOrder({ ...input, requestId: randomUUID() }))
        .code,
      "insufficient_balance",
    );
    assert.equal(
      await db.subscriptionOrder.count({ where: { userId: user.id } }),
      1,
    );
    assert.equal(
      (await reserveSubscriptionOrder({ ...input, planId: "vega" })).code,
      "subscription_conflict",
    );
  }));

test("concurrent different purchases cannot overdraw the balance", async () =>
  withBackendFixture(async ({ user }) => {
    await db.user.update({ where: { id: user.id }, data: { balance: 390 } });
    const results = await Promise.all(
      [buySubscription(user.id), buySubscription(user.id)].map((p) =>
        p.then(
          () => true,
          () => false,
        ),
      ),
    );
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(
      (
        await db.user.findUniqueOrThrow({ where: { id: user.id } })
      ).balance.toString(),
      "0",
    );
  }));

test("future tariffs queue for exactly 30 days without resetting the active package", async () =>
  withBackendFixture(async ({ user }) => {
    await db.user.update({ where: { id: user.id }, data: { balance: 10000 } });
    const first = await buySubscription(user.id);
    const second = await buySubscription(user.id, "vega");
    assert.equal(
      first.endsAt.getTime() - first.startsAt.getTime(),
      SUBSCRIPTION_PERIOD_MS,
    );
    assert.equal(second.startsAt.getTime(), first.endsAt.getTime());
    assert.equal(
      second.endsAt.getTime() - second.startsAt.getTime(),
      SUBSCRIPTION_PERIOD_MS,
    );
    assert.equal(second.credits.toString(), "1800");
    const summary = unwrapAction(await getSubscription({ userId: user.id }));
    assert.equal(summary.current?.planId, "nova");
    assert.equal(summary.upcoming[0].planId, "vega");
    await db.subscriptionPeriod.update({
      where: { id: first.id },
      data: {
        startsAt: new Date(Date.now() - SUBSCRIPTION_PERIOD_MS),
        endsAt: new Date(Date.now() - 1),
      },
    });
    await db.subscriptionPeriod.update({
      where: { id: second.id },
      data: { startsAt: new Date(Date.now() - 1) },
    });
    assert.equal(
      unwrapAction(await getSubscription({ userId: user.id })).current?.planId,
      "vega",
    );
  }));

test("key permissions default off, can change without rotating a secret, and enforce ownership", async () =>
  withBackendFixture(async ({ user, other, key }) => {
    const original = await db.apiKey.findUniqueOrThrow({
      where: { id: key.id },
    });
    assert.equal(original.useSubscription, false);
    assert.equal(
      (
        await updateApiKey({
          userId: other.id,
          id: key.id,
          useSubscription: true,
        })
      ).status,
      404,
    );
    unwrapAction(
      await updateApiKey({
        userId: user.id,
        id: key.id,
        useSubscription: true,
        allowBalanceFallback: true,
      }),
    );
    const updated = await db.apiKey.findUniqueOrThrow({
      where: { id: key.id },
    });
    assert.equal(updated.hash, original.hash);
    assert.equal(updated.allowBalanceFallback, true);
    unwrapAction(
      await updateApiKey({
        userId: user.id,
        id: key.id,
        useSubscription: false,
      }),
    );
    assert.equal(
      (await db.apiKey.findUniqueOrThrow({ where: { id: key.id } }))
        .allowBalanceFallback,
      false,
    );
  }));
