import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { saveProviderCatalog } from "../../src/actions/save-provider-catalog";
import { CHEAPVIBE_BASE_URL, CHEAPVIBE_PROVIDER_ID } from "../../src/configs/consts/proxy.const";
import { ApiError } from "../../src/lib/api-error";
import { syncCheapVibeCatalog } from "../../src/lib/cheapvibe-catalog-sync";
import { unwrapAction } from "../../src/lib/create-safe-action";
import { db } from "../../src/lib/db";
import { resolveModel, websiteModelGroups } from "../../src/lib/model-catalog";

after(() => db.$disconnect());

test("catalog sync preserves the latest valid upstream catalog and its coefficients", async (t) => {
  const where = { provider: CHEAPVIBE_PROVIDER_ID };
  assert.equal(await db.providerCatalogSnapshot.findUnique({ where }), null);
  const originalKey = process.env.CHEAPVIBE_API_KEY;
  process.env.CHEAPVIBE_API_KEY = "test-upstream-key";
  t.after(async () => {
    if (originalKey === undefined) delete process.env.CHEAPVIBE_API_KEY;
    else process.env.CHEAPVIBE_API_KEY = originalKey;
    await db.providerCatalogSnapshot.deleteMany({ where });
  });

  const model = {
    id: "unconfigured-model",
    display_name: "Example",
    owned_by: "example",
    multiplier: 0.45,
    base_multiplier: 0.19,
    fast_multiplier: 2.5,
  };
  let models: unknown[] = [model];
  t.mock.method(globalThis, "fetch", async (request: Request) => {
    assert.equal(request.url, `${CHEAPVIBE_BASE_URL}/models`);
    assert.equal(request.headers.get("Authorization"), "Bearer test-upstream-key");
    return Response.json({ data: models });
  });

  assert.deepEqual(await syncCheapVibeCatalog(), { modelCount: 1, updated: true });
  const snapshot = await db.providerCatalogSnapshot.findUniqueOrThrow({ where });
  assert.deepEqual(snapshot.models, [model]);

  for (const invalid of [
    [],
    [{ ...model, fast_multiplier: undefined }],
    [model, model],
  ]) {
    models = invalid;
    await assert.rejects(
      syncCheapVibeCatalog,
      (error: unknown) => error instanceof ApiError && error.code === "invalid_upstream_response",
    );
  }

  const stale = await saveProviderCatalog({
    ...where,
    fetchedAt: new Date(snapshot.fetchedAt.getTime() - 1),
    models: [{ ...model, multiplier: 999 }],
  });
  assert.equal(unwrapAction(stale), false);
  assert.deepEqual(await db.providerCatalogSnapshot.findUniqueOrThrow({ where }), snapshot);

  const changedModel = { ...model, multiplier: 0.7 };
  models = [changedModel];
  assert.deepEqual(await syncCheapVibeCatalog(), { modelCount: 1, updated: true });
  const updated = await db.providerCatalogSnapshot.findUniqueOrThrow({ where });
  assert.ok(updated.fetchedAt > snapshot.fetchedAt);
  assert.deepEqual(updated.models, [changedModel]);
});

test("website and proxy use the same prices for the supported model families", async (t) => {
  const provider = CHEAPVIBE_PROVIDER_ID;
  const where = { provider };
  assert.equal(await db.providerCatalogSnapshot.findUnique({ where }), null);
  t.after(() => db.providerCatalogSnapshot.deleteMany({ where }));

  const models = [
    { id: "gpt-6.2-astra", owned_by: "openai", multiplier: 8 },
    { id: "claude-fable-5-2", owned_by: "anthropic", multiplier: 4 },
    { id: "deepseek-v4.1-flash-1017", owned_by: "cheapvibecode", multiplier: 0.19 },
    { id: "gemini-3.8-flash", owned_by: "antigravity", multiplier: 2 },
    { id: "grok-4.7", owned_by: "xai", multiplier: 2 },
    { id: "composer-2.5-fast", owned_by: "xai", multiplier: 1 },
    { id: "glm-5.3", owned_by: "openai", multiplier: 1 },
    { id: "nemotron-3.5-super-vl", owned_by: "cheapvibecode", multiplier: 0.001 },
    { id: "unconfigured-model", owned_by: "openai", multiplier: 1 },
  ].map((model) => ({
    ...model,
    base_multiplier: 1,
    fast_multiplier: 2.5,
    context_window: 125_000,
    max_output_tokens: 16_000,
  }));
  unwrapAction(await saveProviderCatalog({ provider, fetchedAt: new Date(), models }));

  const groups = await websiteModelGroups();
  assert.deepEqual(groups.flatMap((group) =>
    group.models.map((model) => [model.id, model.pricePerMillionTokens]),
  ), [
    ["openai/gpt-6.2-astra", "80 ₽"],
    ["anthropic/claude-fable-5.2", "40 ₽"],
    ["deepseek/deepseek-v4.1-flash", "1,9 ₽"],
    ["google/gemini-3.8-flash", "20 ₽"],
    ["x-ai/grok-4.7", "20 ₽"],
    ["z-ai/glm-5.3", "10 ₽"],
    ["nvidia/nemotron-3.5-super-vl", "0,01 ₽"],
  ]);

  const originalKey = process.env.CHEAPVIBE_API_KEY;
  process.env.CHEAPVIBE_API_KEY = "test-upstream-key";
  t.after(() => {
    if (originalKey === undefined) delete process.env.CHEAPVIBE_API_KEY;
    else process.env.CHEAPVIBE_API_KEY = originalKey;
  });
  t.mock.method(globalThis, "fetch", async () => Response.json({ data: models }));
  const deepseek = await resolveModel("deepseek/deepseek-v4.1-flash");
  assert.equal(deepseek.upstreamId, "deepseek-v4.1-flash-1017");
  assert.equal(deepseek.price.toFixed(), "1.9");
  assert.equal(deepseek.maxOutputTokens, 16_000);
  assert.equal(deepseek.contextWindow, 125_000);
  assert.equal((await resolveModel("claude-fable-5-2")).id, "anthropic/claude-fable-5.2");
  assert.equal((await resolveModel("glm-5.3")).id, "z-ai/glm-5.3");
  const nemotron = await resolveModel("nvidia/nemotron-3.5-super-vl");
  assert.equal(nemotron.upstreamId, "nemotron-3.5-super-vl");
  assert.equal(nemotron.price.toFixed(), "0.01");
  await assert.rejects(resolveModel("composer-2.5-fast"), { code: "model_not_found" });
  await assert.rejects(resolveModel("unconfigured-model"), { code: "model_not_found" });
});
