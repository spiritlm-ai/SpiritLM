import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { Prisma } from "@prisma/client";
import { db } from "../../src/lib/db";
import { proxyChat } from "../../src/lib/chat-proxy";
import { ApiError } from "../../src/lib/api-error";
import { creditBalance } from "../../src/lib/balance";

import { withBackendFixture } from "../helpers/backend-fixture";

after(() => db.$disconnect());

test("customer generation reserves and settles the confirmed tariff", async () =>
  withBackendFixture(async ({ body, context, upstream, user, prefix }) => {
    await creditBalance(
      user.clerkId,
      new Prisma.Decimal("1"),
      `${prefix}_generation_credit`,
      "Integration test credit",
    );
    const result = await proxyChat(body, { ...context, diagnostic: false });
    assert.equal(result.response.status, 200);
    assert.equal(upstream.chatCalls, 1);
    await result.completion;
    const record = await db.apiRequest.findUniqueOrThrow({
      where: { id: result.response.headers.get("x-request-id")! },
    });
    assert.equal(record.estimatedCost?.toFixed(), "0.0000144");
    assert.equal(record.chargedCost.toFixed(), "0.0000144");
    const reserveEntry = await db.balanceEntry.findUniqueOrThrow({
      where: { operationId: `api-request:${record.id}:reserve` },
    });
    assert.ok(reserveEntry.amount.negated().gt(record.chargedCost));
    const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(account.balance.toFixed(), "0.9999856");
  }));

test("customer requests without balance do not reach the provider", async () =>
  withBackendFixture(async ({ body, context, upstream }) => {
    await assert.rejects(
      proxyChat(body, { ...context, diagnostic: false }),
      (error: unknown) => error instanceof ApiError && error.status === 402,
    );
    assert.equal(upstream.chatCalls, 0);
  }));

test("successful responses without usage retain the request reserve", async () =>
  withBackendFixture(async ({ body, context, upstream, user, prefix }) => {
    await creditBalance(
      user.clerkId,
      new Prisma.Decimal("1"),
      `${prefix}_unknown_usage_credit`,
      "Integration test credit",
    );
    upstream.reply = () =>
      Response.json({
        choices: [{ message: { role: "assistant", content: "OK" } }],
      });
    const result = await proxyChat(body, { ...context, diagnostic: false });
    await result.response.json();
    await result.completion;
    const record = await db.apiRequest.findUniqueOrThrow({
      where: { id: result.response.headers.get("x-request-id")! },
    });
    assert.equal(record.usageKnown, false);
    assert.equal(record.estimatedCost, null);
    const reserveEntry = await db.balanceEntry.findUniqueOrThrow({
      where: { operationId: `api-request:${record.id}:reserve` },
    });
    const reservedCost = reserveEntry.amount.negated();
    assert.equal(record.chargedCost.toFixed(), reservedCost.toFixed());
    const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(account.balance.toFixed(), new Prisma.Decimal(1).sub(reservedCost).toFixed());
  }));

test("ordinary response records usage and estimates without charging", async () =>
  withBackendFixture(async ({ body, context }) => {
    const result = await proxyChat(body, context);
    assert.equal((await result.response.json()).model, body.model);
    await result.completion;
    const record = await db.apiRequest.findUniqueOrThrow({
      where: { id: result.response.headers.get("x-request-id")! },
    });
    assert.equal(record.status, "SUCCEEDED");
    assert.equal(record.inputTokens, 14);
    assert.equal(record.outputTokens, 2);
    assert.equal(record.cachedTokens, 4);
    assert.equal(record.reasoningTokens, 1);
    assert.equal(record.totalTokens, 16);
    assert.equal(record.chargedCost.toString(), "0");
    assert.equal(record.estimatedCost?.toString(), "0.0000144");
  }));

test("upstream errors do not expose credentials or raw responses", async () =>
  withBackendFixture(async ({ body, context, upstream }) => {
    upstream.reply = () =>
      new Response("private-upstream-details", { status: 429 });
    await assert.rejects(
      proxyChat(body, context),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 429 &&
        !error.message.includes("private-upstream-details"),
    );
  }));
