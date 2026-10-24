import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { db } from "../../src/lib/db";
import { proxyChat } from "../../src/lib/chat-proxy";

import { withBackendFixture } from "../helpers/backend-fixture";

after(() => db.$disconnect());

test("SSE survives split UTF-8 and split CRLF, retaining usage", async () =>
  withBackendFixture(async ({ body, context, upstream }) => {
    const source = new TextEncoder().encode(
      [
        'data: {"model":"deepseek-v4-flash","choices":[{"delta":{"content":"Привет"}}]}',
        "",
        'data: {"choices":[],"usage":{"prompt_tokens":14,"completion_tokens":2,"total_tokens":16}}',
        "",
        "data: [DONE]",
        "",
        "",
      ].join("\r\n"),
    );
    let offset = 0;
    upstream.reply = () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            if (offset === source.length) return controller.close();
            controller.enqueue(source.slice(offset, ++offset));
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    const result = await proxyChat({ ...body, stream: true }, context);
    const text = await result.response.text();
    await result.completion;
    assert.ok(text.includes("Привет"));
    assert.ok(text.includes(body.model));
    assert.ok(text.includes("data: [DONE]"));
    const record = await db.apiRequest.findUniqueOrThrow({
      where: { id: result.response.headers.get("x-request-id")! },
    });
    assert.equal(record.totalTokens, 16);
    assert.equal(record.usageKnown, true);
  }));

test("truncated SSE remains unknown usage instead of zero tokens", async () =>
  withBackendFixture(async ({ body, context, upstream }) => {
    upstream.reply = () =>
      new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n', {
        headers: { "Content-Type": "text/event-stream" },
      });
    const result = await proxyChat({ ...body, stream: true }, context);
    await assert.rejects(result.response.text());
    await result.completion;
    const record = await db.apiRequest.findUniqueOrThrow({
      where: { id: result.response.headers.get("x-request-id")! },
    });
    assert.equal(record.status, "INTERRUPTED");
    assert.equal(record.usageKnown, false);
    assert.equal(record.totalTokens, null);
  }));

test("stream timeout finalizes unknown usage without retrying upstream", async (testContext) =>
  withBackendFixture(async ({ body, context, upstream }) => {
    const originalTimeout = globalThis.setTimeout;
    testContext.mock.method(
      globalThis,
      "setTimeout",
      (
        handler: (...args: unknown[]) => void,
        delay?: number,
        ...args: unknown[]
      ) => {
        return originalTimeout(handler, delay === 90_000 ? 30 : delay, ...args);
      },
    );
    upstream.reply = () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n',
              ),
            );
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    const result = await proxyChat({ ...body, stream: true }, context);
    await assert.rejects(result.response.text());
    await result.completion;
    const record = await db.apiRequest.findUniqueOrThrow({
      where: { id: result.response.headers.get("x-request-id")! },
    });
    assert.equal(record.status, "INTERRUPTED");
    assert.equal(record.usageKnown, false);
    assert.equal(record.totalTokens, null);
    assert.equal(upstream.chatCalls, 1);
  }));
