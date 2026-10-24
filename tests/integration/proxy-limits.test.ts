import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { Prisma } from "@prisma/client";
import { db } from "../../src/lib/db";
import { proxyChat } from "../../src/lib/chat-proxy";
import { ApiError } from "../../src/lib/api-error";
import { PROXY_LIMITS } from "../../src/configs/consts/proxy.const";

import { withBackendFixture } from "../helpers/backend-fixture";

after(() => db.$disconnect());

test("coding client output limits pass through without a 4096 ceiling", async () =>
  withBackendFixture(async ({ body, context, upstream }) => {
    upstream.reply = () =>
      Response.json({
        choices: [{ message: { role: "assistant", content: "OK" } }],
        usage: { prompt_tokens: 14, completion_tokens: 2, total_tokens: 16 },
      });
    upstream.expectedModel = "deepseek-v4.1-flash";
    upstream.expectedTokenLimit = 32_768;
    const result = await proxyChat(
      {
        ...body,
        model: "deepseek/deepseek-v4.1-flash",
        max_tokens: 32_768,
      },
      context,
    );
    assert.equal(result.response.status, 200);
    await result.response.json();
    await result.completion;
    upstream.expectedModel = "deepseek-v4-flash";
    upstream.expectedTokenLimit = undefined;
    const defaults = await proxyChat(
      { model: body.model, messages: body.messages },
      context,
    );
    await defaults.response.json();
    await defaults.completion;
    upstream.expectedTokenLimit = 8;
    const before = upstream.chatCalls;
    await assert.rejects(
      proxyChat({ ...body, max_tokens: 128_001 }, context),
      (error: unknown) =>
        error instanceof ApiError && error.code === "invalid_token_limit",
    );
    assert.equal(upstream.chatCalls, before);
  }));

test("concurrency limit and cancellation finalize request records", async () =>
  withBackendFixture(async ({ user, body, context, upstream }) => {
    upstream.reply = () =>
      new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n', {
        headers: { "Content-Type": "text/event-stream" },
      });
    const running: Awaited<ReturnType<typeof proxyChat>>[] = [];
    try {
      for (let index = 0; index < PROXY_LIMITS.CONCURRENT_REQUESTS; index += 1) {
        running.push(await proxyChat({ ...body, stream: true }, context));
      }
      await assert.rejects(
        proxyChat(body, context),
        (error: unknown) => error instanceof ApiError && error.status === 429,
      );
    } finally {
      await Promise.all(running.map((result) => result.response.body!.cancel()));
      await Promise.all(running.map((result) => result.completion));
    }
    assert.equal(
      await db.apiRequest.count({
        where: { userId: user.id, status: "RUNNING" },
      }),
      0,
    );
  }));

test("request rate limit is enforced across persisted requests", async () =>
  withBackendFixture(async ({ user, body, context }) => {
    const count = await db.apiRequest.count({ where: { userId: user.id } });
    await db.apiRequest.createMany({
      data: Array.from({ length: 20 - count }, () => ({
        userId: user.id,
        model: body.model,
        upstreamModel: "deepseek-v4-flash",
        streaming: false,
        diagnostic: true,
        status: "FAILED",
        pricePerMillion: new Prisma.Decimal("0.90"),
      })),
    });
    await assert.rejects(
      proxyChat(body, context),
      (error: unknown) => error instanceof ApiError && error.status === 429,
    );
  }));

test("concurrent admission never exceeds the running request limit", async () =>
  withBackendFixture(async ({ user, context, body }) => {
    const { beginApiRequest } =
      await import("../../src/actions/begin-api-request");
    const input = {
      ...context,
      model: body.model,
      upstreamModel: "deepseek-v4-flash",
      streaming: true,
      price: "0.90",
      reservation: "0",
    };
    const results = await Promise.all(
      Array.from(
        { length: PROXY_LIMITS.CONCURRENT_REQUESTS + 1 },
        () => beginApiRequest(input),
      ),
    );
    assert.equal(
      results.filter((result) => result.data).length,
      PROXY_LIMITS.CONCURRENT_REQUESTS,
    );
    assert.equal(
      results.filter((result) => result.code === "rate_limit_exceeded").length,
      1,
    );
    assert.equal(
      await db.apiRequest.count({
        where: { userId: user.id, status: "RUNNING" },
      }),
      PROXY_LIMITS.CONCURRENT_REQUESTS,
    );
  }));
