import assert from "node:assert/strict";
import { test } from "node:test";
import { MODEL_GROUPS } from "../src/configs/consts/models.const";
import { availableModels, resolveModel } from "../src/lib/model-catalog";

test("catalog keeps configured models when upstream discovery omits them", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.CHEAPVIBE_API_KEY;
  process.env.CHEAPVIBE_API_KEY = "test-upstream-key";
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    assert.equal(request.url, "https://ru.cheapvibecode.ru/v1/models");
    return Response.json({
      data: [
        { id: "gpt-6-astra", max_output_tokens: 8192 },
        { id: "openai/gpt-6-astra", max_output_tokens: 4096 },
        { id: "anthropic/claude-fable-5", max_output_tokens: 16384 },
        { id: "unconfigured-model" },
      ],
    });
  };
  try {
    const models = await availableModels();
    const configured = MODEL_GROUPS.flatMap((group) => group.models);
    assert.deepEqual(models.map((model) => model.id), configured.map((model) => model.id));
    for (const model of models) {
      assert.ok(model.price.greaterThan(0));
    }
    const gpt = await resolveModel("openai/gpt-6-astra");
    assert.equal(gpt.upstreamId, "gpt-6-astra");
    assert.equal(gpt.maxOutputTokens, 8192);
    const claude = await resolveModel("anthropic/claude-fable-5");
    assert.equal(claude.upstreamId, "anthropic/claude-fable-5");
    assert.equal(claude.maxOutputTokens, 16384);
    for (const id of ["openai/gpt-6.1-sol", "anthropic/claude-fable-5.1"]) {
      const model = models.find((item) => item.id === id);
      assert.ok(model);
      assert.equal(model.maxOutputTokens, undefined);
      assert.equal(model.upstreamId, id.split("/")[1]);
      assert.equal((await resolveModel(id)).id, id);
    }
    assert.ok(!models.some((model) => model.id === "unconfigured-model"));
    assert.ok(!models.some((model) => model.id === "openai/gpt-5.5"));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.CHEAPVIBE_API_KEY;
    else process.env.CHEAPVIBE_API_KEY = originalKey;
  }
});
