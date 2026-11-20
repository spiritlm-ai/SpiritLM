import assert from "node:assert/strict";
import { test } from "node:test";
import { availableModels, websiteModelGroups } from "../src/lib/model-catalog";

test("next dev loads live models and prices without a database snapshot", async (t) => {
  const originalEnv = { ...process.env };
  Object.assign(process.env, {
    NODE_ENV: "development",
    CHEAPVIBE_API_KEY: "test-upstream-key",
  });
  delete process.env.DATABASE_URL;
  t.after(() => {
    for (const key of ["NODE_ENV", "CHEAPVIBE_API_KEY", "DATABASE_URL"]) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  const fetch = t.mock.method(globalThis, "fetch", async (request: Request) => {
    assert.equal(request.url, "https://ru.cheapvibecode.ru/v1/models");
    assert.equal(request.headers.get("Authorization"), "Bearer test-upstream-key");
    return Response.json({
      data: [
        { id: "gpt-6.2-astra", multiplier: 8, base_multiplier: 8, fast_multiplier: 2.5, max_output_tokens: 16_000 },
        { id: "composer-2.5-fast", owned_by: "xai", multiplier: 1, base_multiplier: 1, fast_multiplier: 1 },
      ],
    });
  });

  const groups = await websiteModelGroups();
  assert.deepEqual(groups.flatMap((group) =>
    group.models.map(({ id, pricePerMillionTokens }) => [id, pricePerMillionTokens]),
  ), [["openai/gpt-6.2-astra", "80 ₽"]]);
  const models = await availableModels();
  assert.deepEqual(models.map(({ id, price }) => [id, price.toFixed()]), [
    ["openai/gpt-6.2-astra", "80"],
  ]);
  assert.equal(fetch.mock.callCount(), 1);
});
