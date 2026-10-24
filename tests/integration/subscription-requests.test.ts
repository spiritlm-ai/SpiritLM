import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { db } from "../../src/lib/db";
import { beginApiRequest } from "../../src/actions/begin-api-request";
import { finishApiRequest } from "../../src/actions/finish-api-request";
import { getSubscription } from "../../src/actions/get-subscription";
import { dashboardSummary } from "../../src/actions/dashboard-summary";
import { unwrapAction } from "../../src/lib/create-safe-action";
import { issueKey } from "../../src/lib/api-keys";
import { proxyChat } from "../../src/lib/chat-proxy";
import { withBackendFixture } from "../helpers/backend-fixture";
import { buySubscription } from "../helpers/subscription-fixture";

after(() => db.$disconnect());

function input(userId: string, apiKeyId: string) {
  return {
    userId,
    apiKeyId,
    diagnostic: false,
    model: "openai/gpt-6-sol",
    upstreamModel: "gpt-6-sol",
    streaming: false,
    price: "1000",
    reservation: "10",
  };
}
const usage = {
  inputTokens: 1000,
  outputTokens: 1000,
  totalTokens: 2000,
  cachedTokens: 0,
  reasoningTokens: 0,
};

test("subscription settlement refunds its own reserve and never touches money", async () =>
  withBackendFixture(async ({ user, key }) => {
    await db.user.update({ where: { id: user.id }, data: { balance: 390 } });
    const period = await buySubscription(user.id);
    await db.apiKey.update({
      where: { id: key.id },
      data: { useSubscription: true },
    });
    const request = unwrapAction(await beginApiRequest(input(user.id, key.id)));
    assert.equal(request.paymentSource, "SUBSCRIPTION");
    const reserved = unwrapAction(await getSubscription({ userId: user.id }));
    assert.equal(reserved.current?.remainingCredits, "635.00000000");
    assert.equal(reserved.current?.reservedCredits, "10.00000000");
    const finish = {
      id: request.id,
      status: "SUCCEEDED" as const,
      httpStatus: 200,
      durationMs: 10,
      usage,
    };
    const results = await Promise.all([
      finishApiRequest(finish),
      finishApiRequest(finish),
    ]);
    assert.equal(results.filter((r) => r.data === true).length, 1);
    assert.equal(
      (
        await db.subscriptionPeriod.findUniqueOrThrow({
          where: { id: period.id },
        })
      ).remainingCredits.toString(),
      "643",
    );
    assert.equal(
      (
        await db.user.findUniqueOrThrow({ where: { id: user.id } })
      ).balance.toString(),
      "0",
    );
    const summary = unwrapAction(
      await dashboardSummary({ userId: user.id, period: "30d" }),
    );
    assert.equal(summary.cost, "0");
    assert.equal(summary.subscriptionCreditsUsed, "2.00000000");
  }));

test("Nova excludes expensive models and fallback always requires permission", async () =>
  withBackendFixture(async ({ user, key }) => {
    await db.user.update({ where: { id: user.id }, data: { balance: 1000 } });
    await buySubscription(user.id);
    await db.apiKey.update({
      where: { id: key.id },
      data: { useSubscription: true },
    });
    for (const model of [
      "openai/gpt-6-astra",
      "anthropic/claude-fable-5",
      "anthropic/claude-fable-5.1",
    ]) {
      assert.equal(
        (await beginApiRequest({ ...input(user.id, key.id), model })).code,
        "subscription_model_unavailable",
      );
    }
    await db.apiKey.update({
      where: { id: key.id },
      data: { allowBalanceFallback: true },
    });
    const paid = unwrapAction(
      await beginApiRequest({
        ...input(user.id, key.id),
        model: "openai/gpt-6-astra",
      }),
    );
    assert.equal(paid.paymentSource, "BALANCE");
    unwrapAction(
      await finishApiRequest({
        id: paid.id,
        status: "FAILED",
        httpStatus: 502,
        durationMs: 1,
        usage: null,
      }),
    );
    assert.equal(
      (
        await db.user.findUniqueOrThrow({ where: { id: user.id } })
      ).balance.toString(),
      "610",
    );
  }));

test("subscription concurrency is shared across keys and cannot fall back around a rate limit", async () =>
  withBackendFixture(async ({ user, key }) => {
    await db.user.update({ where: { id: user.id }, data: { balance: 1000 } });
    const period = await buySubscription(user.id);
    await db.apiKey.update({
      where: { id: key.id },
      data: { useSubscription: true, allowBalanceFallback: true },
    });
    const another = await issueKey(user.id, "Second subscriber", {
      useSubscription: true,
      allowBalanceFallback: true,
    });
    const results = await Promise.all(
      Array.from(
        { length: period.concurrentRequests + 1 },
        (_, index) => beginApiRequest(input(user.id, index % 2 ? another.id : key.id)),
      ),
    );
    assert.equal(
      results.filter((r) => r.data).length,
      period.concurrentRequests,
      JSON.stringify(results),
    );
    assert.equal(
      results.filter((r) => r.code === "rate_limit_exceeded").length,
      1,
    );
    const request = results.find((r) => r.data)!.data!;
    unwrapAction(
      await finishApiRequest({
        id: request.id,
        status: "FAILED",
        httpStatus: 502,
        durationMs: 1,
        usage: null,
      }),
    );
    await db.apiRequest.createMany({
      data: Array.from({ length: 10 }, () => ({
        userId: user.id,
        apiKeyId: key.id,
        model: "openai/gpt-6-sol",
        upstreamModel: "gpt-6-sol",
        streaming: false,
        status: "FAILED",
        pricePerMillion: 27,
        paymentSource: "SUBSCRIPTION",
      })),
    });
    assert.equal(
      (await beginApiRequest(input(user.id, key.id))).code,
      "rate_limit_exceeded",
    );
  }));

test("exhausted or expired packages reject requests unless balance fallback is enabled", async () =>
  withBackendFixture(async ({ user, key }) => {
    await db.user.update({ where: { id: user.id }, data: { balance: 2000 } });
    const period = await buySubscription(user.id);
    await db.apiKey.update({
      where: { id: key.id },
      data: { useSubscription: true },
    });
    assert.equal(
      (await beginApiRequest({ ...input(user.id, key.id), reservation: "646" }))
        .code,
      "insufficient_subscription_credits",
    );
    await db.subscriptionPeriod.update({
      where: { id: period.id },
      data: { endsAt: new Date(Date.now() - 1) },
    });
    assert.equal(
      (await beginApiRequest(input(user.id, key.id))).code,
      "subscription_inactive",
    );
    await db.apiKey.update({
      where: { id: key.id },
      data: { allowBalanceFallback: true },
    });
    assert.equal(
      unwrapAction(await beginApiRequest(input(user.id, key.id))).paymentSource,
      "BALANCE",
    );
  }));

test("late settlement refunds only the original period, and unknown usage retains the reserve", async () =>
  withBackendFixture(async ({ user, key }) => {
    await db.user.update({ where: { id: user.id }, data: { balance: 2000 } });
    const first = await buySubscription(user.id);
    const next = await buySubscription(user.id, "vega");
    await db.apiKey.update({
      where: { id: key.id },
      data: { useSubscription: true },
    });
    const request = unwrapAction(await beginApiRequest(input(user.id, key.id)));
    await db.subscriptionPeriod.update({
      where: { id: first.id },
      data: { endsAt: new Date(Date.now() - 1) },
    });
    await db.subscriptionPeriod.update({
      where: { id: next.id },
      data: { startsAt: new Date(Date.now() - 1) },
    });
    unwrapAction(
      await finishApiRequest({
        id: request.id,
        status: "SUCCEEDED",
        httpStatus: 200,
        durationMs: 1,
        usage,
      }),
    );
    assert.equal(
      (
        await db.subscriptionPeriod.findUniqueOrThrow({
          where: { id: first.id },
        })
      ).remainingCredits.toString(),
      "643",
    );
    assert.equal(
      (
        await db.subscriptionPeriod.findUniqueOrThrow({
          where: { id: next.id },
        })
      ).remainingCredits.toString(),
      "1800",
    );
    const unknown = unwrapAction(await beginApiRequest(input(user.id, key.id)));
    unwrapAction(
      await finishApiRequest({
        id: unknown.id,
        status: "SUCCEEDED",
        httpStatus: 200,
        durationMs: 1,
        usage: null,
      }),
    );
    assert.equal(
      (
        await db.subscriptionPeriod.findUniqueOrThrow({
          where: { id: next.id },
        })
      ).remainingCredits.toString(),
      "1790",
    );
    assert.equal(
      (await db.apiRequest.findUniqueOrThrow({ where: { id: unknown.id } }))
        .usageKnown,
      false,
    );
  }));

test("subscription SSE works with zero money balance and settles actual usage", async () =>
  withBackendFixture(async ({ user, key, body, context, upstream }) => {
    await db.user.update({ where: { id: user.id }, data: { balance: 390 } });
    const period = await buySubscription(user.id);
    await db.apiKey.update({
      where: { id: key.id },
      data: { useSubscription: true },
    });
    upstream.reply = () =>
      new Response(
        'data: {"choices":[{"delta":{"content":"OK"}}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":14,"completion_tokens":2,"total_tokens":16}}\n\ndata: [DONE]\n\n',
        { headers: { "Content-Type": "text/event-stream" } },
      );
    const result = await proxyChat(
      { ...body, stream: true },
      { ...context, diagnostic: false },
    );
    assert.match(await result.response.text(), /DONE/);
    await result.completion;
    assert.equal(
      (
        await db.subscriptionPeriod.findUniqueOrThrow({
          where: { id: period.id },
        })
      ).remainingCredits.toFixed(8),
      "644.99998560",
    );
  }));

test("bare model aliases cannot bypass Nova exclusions", async () =>
  withBackendFixture(async ({ user, key, body, context, upstream }) => {
    await db.user.update({ where: { id: user.id }, data: { balance: 390 } });
    await buySubscription(user.id);
    await db.apiKey.update({
      where: { id: key.id },
      data: { useSubscription: true },
    });
    for (const model of ["gpt-6-astra", "claude-fable-5", "claude-fable-5.1"]) {
      await assert.rejects(
        proxyChat({ ...body, model }, { ...context, diagnostic: false }),
        (error: unknown) =>
          error instanceof Error &&
          "code" in error &&
          error.code === "subscription_model_unavailable",
      );
    }
    assert.equal(upstream.chatCalls, 0);
  }));

test("reading subscription status finalizes stale reservations without crediting a new package", async () =>
  withBackendFixture(async ({ user, key }) => {
    await db.user.update({ where: { id: user.id }, data: { balance: 390 } });
    const period = await buySubscription(user.id);
    await db.apiKey.update({
      where: { id: key.id },
      data: { useSubscription: true },
    });
    const request = unwrapAction(await beginApiRequest(input(user.id, key.id)));
    await db.apiRequest.update({
      where: { id: request.id },
      data: { createdAt: new Date(Date.now() - 180000) },
    });
    const summary = unwrapAction(await getSubscription({ userId: user.id }));
    assert.equal(summary.running, 0);
    assert.equal(summary.current?.reservedCredits, "0.00000000");
    assert.equal(summary.current?.remainingCredits, "635.00000000");
    const finalized = await db.apiRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    assert.equal(finalized.status, "INTERRUPTED");
    assert.equal(finalized.chargedCost.toString(), "10");
    assert.equal(finalized.subscriptionPeriodId, period.id);
  }));
