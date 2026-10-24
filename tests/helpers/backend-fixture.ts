import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../../src/lib/db";
import { issueKey } from "../../src/lib/api-keys";

export async function withBackendFixture(
  run: (fixture: {
    prefix: string;
    user: Awaited<ReturnType<typeof db.user.create>>;
    other: Awaited<ReturnType<typeof db.user.create>>;
    key: Awaited<ReturnType<typeof issueKey>>;
    authorized: () => Request;
    body: {
      model: string;
      messages: { role: string; content: string }[];
      max_tokens: number;
    };
    context: { userId: string; apiKeyId: string; diagnostic: boolean };
    upstream: {
      chatCalls: number;
      expectedModel: string;
      expectedTokenLimit: number | undefined;
      reply: () => Response;
    };
  }) => Promise<void>,
) {
  const prefix = `user_spiritlm_test_${randomUUID()}`;
  const users: string[] = [];
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.CHEAPVIBE_API_KEY;
  process.env.CHEAPVIBE_API_KEY = "test-upstream-key";
  const upstream = {
    chatCalls: 0,
    expectedModel: "deepseek-v4-flash",
    expectedTokenLimit: 8 as number | undefined,
    reply: (): Response =>
      Response.json({
        model: "deepseek-v4-flash",
        choices: [{ message: { role: "assistant", content: "OK" } }],
        usage: {
          prompt_tokens: 14,
          completion_tokens: 2,
          total_tokens: 16,
          prompt_tokens_details: { cached_tokens: 4 },
          completion_tokens_details: { reasoning_tokens: 1 },
        },
      }),
  };
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = request.url;
    assert.equal(new URL(url).origin, "https://ru.cheapvibecode.ru");
    if (url.endsWith("/models"))
      return Response.json({
        data: [
          { id: "deepseek-v4-flash", max_output_tokens: 128_000 },
          { id: "deepseek-v4.1-flash", max_output_tokens: 393_216 },
        ],
      });
    assert.equal(url, "https://ru.cheapvibecode.ru/v1/chat/completions");
    const payload = JSON.parse(await request.text());
    assert.equal(payload.model, upstream.expectedModel);
    assert.equal(payload.max_tokens, upstream.expectedTokenLimit);
    upstream.chatCalls += 1;
    return upstream.reply();
  };

  try {
    const user = await db.user.create({ data: { clerkId: prefix } });
    users.push(user.id);
    const other = await db.user.create({
      data: { clerkId: `${prefix}_other` },
    });
    users.push(other.id);
    const key = await issueKey(user.id, "Integration");
    const authorized = () =>
      new Request("https://spiritlm.example/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key.secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-v4-flash",
          messages: [{ role: "user", content: "OK" }],
          max_tokens: 8,
        }),
      });
    const body = {
      model: "deepseek/deepseek-v4-flash",
      messages: [{ role: "user", content: "OK" }],
      max_tokens: 8,
    };
    const context = { userId: user.id, apiKeyId: key.id, diagnostic: true };

    await run({
      prefix,
      user,
      other,
      key,
      authorized,
      body,
      context,
      upstream,
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.CHEAPVIBE_API_KEY;
    else process.env.CHEAPVIBE_API_KEY = originalKey;
    if (users.length) {
      await db.yooKassaPayment.deleteMany({ where: { userId: { in: users } } });
      await db.payment.deleteMany({ where: { userId: { in: users } } });
      await db.apiRequest.deleteMany({ where: { userId: { in: users } } });
      await db.subscriptionEntry.deleteMany({
        where: { period: { userId: { in: users } } },
      });
      await db.subscriptionPeriod.deleteMany({
        where: { userId: { in: users } },
      });
      await db.subscriptionOrder.deleteMany({
        where: { userId: { in: users } },
      });
      await db.balanceEntry.deleteMany({ where: { userId: { in: users } } });
      await db.apiKey.deleteMany({ where: { userId: { in: users } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
    }
  }
}
