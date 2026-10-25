import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { db } from "../../src/lib/db";
import { GET as balance } from "../../src/app/v1/account/balance/route";
import { GET as usage } from "../../src/app/v1/account/usage/route";
import { GET as subscription } from "../../src/app/v1/account/subscription/route";
import { GET as models } from "../../src/app/v1/spiritcode/models/route";
import { GET as publicModels } from "../../src/app/v1/models/route";
import { MODEL_GROUPS } from "../../src/configs/consts/models.const";
import { withBackendFixture } from "../helpers/backend-fixture";
import { buySubscription } from "../helpers/subscription-fixture";

const originalClerkSecret = process.env.CLERK_SECRET_KEY;

async function profile(request: Request) {
  process.env.CLERK_SECRET_KEY = "sk_test_mock";
  const { GET } = await import("../../src/app/v1/account/route");
  return GET(request);
}

after(async () => {
  if (originalClerkSecret === undefined) delete process.env.CLERK_SECRET_KEY;
  else process.env.CLERK_SECRET_KEY = originalClerkSecret;
  await db.$disconnect();
});

test("SpiritCode profile reads Clerk on the server and returns only public account fields", async () =>
  withBackendFixture(async ({ user, key }) => {
    const upstreamFetch = globalThis.fetch;
    let clerkCalls = 0;
    globalThis.fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      assert.equal(new URL(request.url).pathname, `/v1/users/${user.clerkId}`);
      clerkCalls += 1;
      return Response.json({
        object: "user",
        id: user.clerkId,
        first_name: "Анна",
        username: "anna",
        last_name: "Тестовая",
        primary_email_address_id: "email_test",
        email_addresses: [{
          object: "email_address",
          id: "email_test",
          email_address: "anna@example.com",
          linked_to: [],
        }],
        private_metadata: { internal_secret: "private-value" },
      });
    };
    try {
      const response = await profile(new Request("https://spiritlm.example/v1/account", {
        headers: { Authorization: `Bearer ${key.secret}` },
      }));
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.id, user.id);
      assert.equal(result.name, "Анна Тестовая");
      assert.equal(result.username, "anna");
      assert.equal(result.email, "anna@example.com");
      assert.equal(result.created_at, user.createdAt.toISOString());
      assert.equal(result.key.masked, `${key.prefix}…`);
      const serialized = JSON.stringify(result);
      for (const secret of [key.secret, "private-value", user.clerkId, "sk_test_mock"]) {
        assert.ok(!serialized.includes(secret));
      }
      assert.equal(clerkCalls, 1);
    } finally {
      globalThis.fetch = upstreamFetch;
    }
  }));

test("SpiritCode account routes reject missing, invalid and revoked keys", async () =>
  withBackendFixture(async ({ key }) => {
    const handlers = [profile, balance, usage, subscription, models];
    for (const handler of handlers) {
      for (const authorization of ["", "Bearer invalid"]) {
        const response = await handler(new Request("https://spiritlm.example/v1/account", {
          headers: { authorization },
        }));
        assert.equal(response.status, 401);
        assert.equal(response.headers.get("Cache-Control"), "no-store");
        assert.equal((await response.json()).error.code, "invalid_api_key");
      }
    }
    await db.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
    for (const handler of handlers) {
      const response = await handler(new Request("https://spiritlm.example/v1/account", {
        headers: { Authorization: `Bearer ${key.secret}` },
      }));
      assert.equal(response.status, 401);
    }
  }));

test("SpiritCode account balance and usage are exact, isolated and preserve unknown tokens", async () =>
  withBackendFixture(async ({ user, other, key, body }) => {
    const request = (path: string) => new Request(`https://spiritlm.example${path}`, {
      headers: { Authorization: `Bearer ${key.secret}` },
    });
    await db.user.update({ where: { id: user.id }, data: { balance: "10.00000001" } });
    await db.user.update({ where: { id: other.id }, data: { balance: "999" } });
    const response = await balance(request("/v1/account/balance?userId=other"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { balance: "10.00000001", currency: "RUB" });
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    await db.apiRequest.createMany({
      data: [user.id, other.id].map((userId) => ({
        userId,
        model: body.model,
        upstreamModel: "deepseek-v4-flash",
        status: "SUCCEEDED",
        streaming: false,
        pricePerMillion: "0.90",
        chargedCost: "0.00000001",
        totalTokens: userId === other.id ? 999 : null,
      })),
    });
    for (const period of ["2d", "7d", "30d", "all"]) {
      const result = await usage(request(`/v1/account/usage?period=${period}`));
      assert.equal(result.status, 200);
      const data = await result.json();
      assert.equal(data.cost, "0.00000001");
      assert.equal(data.total_tokens, null);
      assert.equal(data.known_tokens, 0);
      assert.equal(data.unknown_usage_count, 1);
      assert.equal(data.requests, 1);
    }
    assert.equal((await usage(request("/v1/account/usage?period=invalid"))).status, 400);
    const empty = await subscription(request("/v1/account/subscription"));
    assert.deepEqual(await empty.json(), { current: null, upcoming: [], running: 0, recent: 0 });
  }));

test("SpiritCode metadata preserves unknown capabilities and exposes no upstream credentials", async () =>
  withBackendFixture(async ({ key }) => {
    const response = await models(new Request("https://spiritlm.example/v1/spiritcode/models", {
      headers: { Authorization: `Bearer ${key.secret}` },
    }));
    assert.equal(response.status, 200);
    const payload = await response.json();
    const expectedIds = MODEL_GROUPS.flatMap((group) => group.models.map((model) => model.id));
    assert.deepEqual(payload.data.map((model: { id: string }) => model.id), expectedIds);
    const publicResponse = await publicModels(new Request("https://spiritlm.example/v1/models", {
      headers: { Authorization: `Bearer ${key.secret}` },
    }));
    assert.equal(publicResponse.status, 200);
    const publicPayload = await publicResponse.json();
    assert.deepEqual(publicPayload.data.map((model: { id: string }) => model.id), expectedIds);
    for (const model of payload.data) {
      assert.equal(model.tool_calling, null);
      const configured = MODEL_GROUPS.flatMap((group) => group.models)
        .find((item) => item.id === model.id);
      assert.ok(configured);
      const expectedContext = model.id === "deepseek/deepseek-v4-flash"
        ? 262_144
        : configured.contextWindow;
      assert.equal(model.context_window, expectedContext);
      assert.equal(
        publicPayload.data.find((item: { id: string }) => item.id === model.id).context_window,
        expectedContext,
      );
      assert.equal(model.sample_price, true);
      assert.equal(typeof model.price_per_million_tokens, "string");
      assert.equal(model.currency, "RUB");
    }
    const text = JSON.stringify(payload);
    assert.ok(!text.includes("test-upstream-key"));
    assert.ok(!text.includes("upstreamId"));
  }));

test("SpiritCode exposes exhausted live subscriptions and queued periods without test periods", async () =>
  withBackendFixture(async ({ user, key }) => {
    await db.user.update({ where: { id: user.id }, data: { balance: 1000 } });
    const current = await buySubscription(user.id);
    const upcoming = await buySubscription(user.id);
    await db.subscriptionPeriod.update({
      where: { id: current.id },
      data: { remainingCredits: "0" },
    });
    // A queued test period must not be advertised as usable subscription access.
    await db.subscriptionPeriod.update({
      where: { id: upcoming.id },
      data: { mode: "test" },
    });
    const response = await subscription(new Request("https://spiritlm.example/v1/account/subscription", {
      headers: { Authorization: `Bearer ${key.secret}` },
    }));
    const data = await response.json();
    assert.equal(data.current.id, current.id);
    assert.equal(data.current.remainingCredits, "0.00000000");
    assert.equal(data.current.concurrentRequests, current.concurrentRequests);
    assert.deepEqual(data.upcoming, []);
    assert.ok(!JSON.stringify(data).includes(upcoming.id));
  }));
