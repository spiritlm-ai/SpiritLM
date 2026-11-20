import assert from "node:assert/strict";
import { test } from "node:test";
import { docsCode } from "../src/configs/consts/docs.const";
import { MODEL_GROUPS } from "../src/configs/consts/models.const";

const code = docsCode("https://spiritlm.example/v1/");
const modelIds = MODEL_GROUPS.flatMap((group) => group.models.map((model) => model.id));

function curlBody(example: string): Record<string, unknown> {
  const match = example.match(/-d '([\s\S]*)'$/);
  assert.ok(match, "curl example should include a quoted JSON body");
  return JSON.parse(match[1]);
}

test("copied curl examples expand credentials and send valid Chat Completions JSON", () => {
  assert.ok(code.models.includes("$SPIRITLM_BASE_URL/models"));
  assert.ok(code.models.includes("Authorization: Bearer $SPIRITLM_API_KEY"));

  for (const [example, streaming] of [[code.chat, false], [code.stream, true]] as const) {
    assert.ok(example.includes("$SPIRITLM_BASE_URL/chat/completions"));
    assert.ok(example.includes("Authorization: Bearer $SPIRITLM_API_KEY"));
    assert.ok(example.includes("Content-Type: application/json"));
    assert.equal(example.startsWith("curl -N"), streaming);
    const body = curlBody(example);
    assert.equal(body.stream, streaming);
    assert.ok(MODEL_GROUPS.some((group) =>
      group.models.some((model) => model.id === body.model),
    ));
    assert.deepEqual(body.messages, [{ role: "user", content: "Привет!" }]);
    assert.equal(body.max_tokens, 128);
  }
});

test("both OpenCode versions use Chat Completions and keep all catalog IDs unchanged", () => {
  const config = JSON.parse(code.opencode);
  const provider = config.providers.spiritlm;
  assert.equal(provider.package, "@opencode/ai/providers/openai-compatible");
  assert.equal(provider.settings.baseURL, "https://spiritlm.example/v1");
  assert.deepEqual(provider.env, ["SPIRITLM_API_KEY"]);
  assert.deepEqual(Object.keys(provider.models), modelIds);
  assert.equal(config.model, `spiritlm/${curlBody(code.chat).model}`);

  const legacy = JSON.parse(code.opencodeV1);
  assert.equal(legacy.provider.spiritlm.npm, "@ai-sdk/openai-compatible");
  assert.equal(legacy.provider.spiritlm.options.baseURL, provider.settings.baseURL);
  assert.equal(legacy.provider.spiritlm.options.apiKey, "{env:SPIRITLM_API_KEY}");
  assert.deepEqual(Object.keys(legacy.provider.spiritlm.models), modelIds);
  assert.equal(legacy.model, config.model);
});

test("native Claude and Codex examples point at the compatibility endpoints", () => {
  assert.ok(code.anthropic.includes("https://spiritlm.example/v1/messages"));
  assert.ok(code.anthropic.includes("x-api-key: $SPIRITLM_API_KEY"));
  assert.ok(code.responses.includes("https://spiritlm.example/v1/responses"));
  assert.ok(code.codex.includes('base_url = "https://spiritlm.example/v1"'));
  assert.equal(JSON.parse(code.claude).env.ANTHROPIC_BASE_URL, "https://spiritlm.example");
});

test("agent configurations use the supplied catalog and keep valid defaults after a sync", () => {
  const anthropic = MODEL_GROUPS.find((group) => group.provider === "anthropic");
  assert.ok(anthropic);
  const models = [
    { id: "anthropic/claude-new.1", name: "Claude New", pricePerMillionTokens: "10 ₽", contextWindow: 80_000 },
    { id: "anthropic/claude-new.2", name: "Claude Newer", pricePerMillionTokens: "10 ₽" },
  ];
  const synced = docsCode("https://spiritlm.example/v1", [{ ...anthropic, models }]);
  const claude = JSON.parse(synced.claude);
  assert.deepEqual(claude.modelPicker.options, models.map((model) => ({ model: model.id, label: model.name })));
  assert.equal(claude.model, models[0].id);
  assert.equal(curlBody(synced.anthropic).model, models[0].id);
  assert.deepEqual(Object.keys(JSON.parse(synced.opencode).providers.spiritlm.models), models.map((model) => model.id));
  assert.deepEqual(JSON.parse(synced.opencode).providers.spiritlm.models[models[0].id].limit, { context: 80_000 });
  assert.deepEqual(JSON.parse(synced.codexModels).models.map(({ slug }: { slug: string }) => slug), models.map((model) => model.id));
  assert.ok(synced.hermes.includes(`      - "${models[0].id}"\n      - "${models[1].id}"`));
  assert.ok(synced.kimi.startsWith(`default_model = "${models[0].id}"`));
  assert.ok(synced.kimi.includes(`[models."${models[0].id}"]`));
  assert.ok(synced.kimi.includes("max_context_size = 80000"));
  assert.equal(synced.kimiModelsWithoutContext, models[1].id);
});

test("documented SSE data frames parse as JSON until the terminal DONE marker", () => {
  const frames = code.streamResponse.trim().split("\n\n");
  assert.equal(frames.pop(), "data: [DONE]");
  const chunks = frames.map((frame) => JSON.parse(frame.slice("data: ".length)));
  assert.equal(chunks[0].choices[0].delta.content, "Привет!");
  const usageChunk = chunks.at(-1);
  assert.deepEqual(usageChunk.choices, []);
  assert.equal(
    usageChunk.usage.total_tokens,
    usageChunk.usage.prompt_tokens + usageChunk.usage.completion_tokens,
  );
  assert.equal(
    JSON.parse(code.streamError.slice("data: ".length)).error.code,
    "stream_interrupted",
  );
});
