import assert from "node:assert/strict";
import { test } from "node:test";
import { availableModels, resolveModel } from "../src/lib/model-catalog";

test("catalog exposes only upstream models with current prices", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.CHEAPVIBE_API_KEY;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  process.env.CHEAPVIBE_API_KEY = "test-upstream-key";
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    assert.equal(request.url, "https://ru.cheapvibecode.ru/v1/models");
    return Response.json({
      data: [
        { multiplier: 8, id: "gpt-6-astra", context_window: 900_000, max_output_tokens: 8192 },
        { multiplier: 9, id: "openai/gpt-6-astra", context_window: 400_000, max_output_tokens: 4096 },
        { multiplier: 4, id: "anthropic/claude-fable-5", context_length: 800_000, max_output_tokens: 16384 },
        { multiplier: 4, id: "claude-fable-5-2", context_window: 1_000_000, max_output_tokens: 131_072 },
        { multiplier: 4, id: "claude-opus-4-7", context_window: 700_000 },
        { multiplier: 2, id: "grok-4.7", context_window: -1, contextWindow: 500_000 },
        { multiplier: 2, id: "grok-4.6", context_window: "500000", max_context_tokens: 450_000 },
        { multiplier: 2, id: "grok-4.5", context_window: 1.5, contextWindow: 0, context_length: null, max_tokens: 16_000 },
        { id: "gemini-3.8-flash", multiplier: 2 },
        { id: "gemini-3.6-flash" },
        { id: "unconfigured-model", multiplier: 1 },
      ],
    });
  };
  try {
    const models = await availableModels();
    assert.equal(models.find(({ id }) => id === "google/gemini-3.8-flash")?.price.toFixed(), "20");
    for (const id of ["gemini-3.6-flash", "gemini-3.7-flash"]) {
      await assert.rejects(resolveModel(id), { code: "model_not_found" });
    }
    const gpt = await resolveModel("openai/gpt-6-astra");
    assert.equal(gpt.upstreamId, "gpt-6-astra");
    assert.equal(gpt.maxOutputTokens, 8192);
    assert.equal(gpt.contextWindow, 900_000);
    assert.equal((await resolveModel("claude-opus-4.7")).contextWindow, 700_000);
    assert.equal((await resolveModel("grok-4.7")).contextWindow, 500_000);
    assert.equal((await resolveModel("grok-4.6")).contextWindow, 450_000);
    // Invalid context metadata must not use max_tokens (an output limit).
    assert.equal((await resolveModel("grok-4.5")).contextWindow, 500_000);
    const claude = await resolveModel("anthropic/claude-fable-5");
    assert.equal(claude.upstreamId, "anthropic/claude-fable-5");
    assert.equal(claude.maxOutputTokens, 16384);
    assert.equal(claude.contextWindow, 800_000);
    const fable = await resolveModel("claude-fable-5-2");
    assert.equal(fable.id, "anthropic/claude-fable-5.2");
    assert.equal(fable.upstreamId, "claude-fable-5-2");
    assert.ok(!models.some((model) => model.id === "unconfigured-model"));
    assert.ok(!models.some((model) => model.id === "openai/gpt-5.5"));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.CHEAPVIBE_API_KEY;
    else process.env.CHEAPVIBE_API_KEY = originalKey;
    if (originalDatabaseUrl !== undefined) process.env.DATABASE_URL = originalDatabaseUrl;
  }
});
