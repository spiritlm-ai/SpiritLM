import assert from "node:assert/strict";
import { test } from "node:test";
import { docsCode } from "../src/configs/consts/docs.const";
import { MODEL_GROUPS } from "../src/configs/consts/models.const";

const code = docsCode("https://spiritlm.example/v1/");

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

test("OpenCode example uses Chat Completions and keeps all catalog IDs unchanged", () => {
  const config = JSON.parse(code.opencode);
  const provider = config.provider.spiritlm;
  assert.equal(provider.npm, "@ai-sdk/openai-compatible");
  assert.equal(provider.options.baseURL, "https://spiritlm.example/v1");
  assert.equal(provider.options.apiKey, "{env:SPIRITLM_API_KEY}");
  assert.deepEqual(
    Object.keys(provider.models),
    MODEL_GROUPS.flatMap((group) => group.models.map((model) => model.id)),
  );
  const modelId = config.model.slice("spiritlm/".length);
  assert.ok(provider.models[modelId]);
});

test("native Claude and Codex examples point at the compatibility endpoints", () => {
  assert.ok(code.anthropic.includes("https://spiritlm.example/v1/messages"));
  assert.ok(code.anthropic.includes("x-api-key: $SPIRITLM_API_KEY"));
  assert.ok(code.responses.includes("https://spiritlm.example/v1/responses"));
  assert.ok(code.codex.includes('base_url = "https://spiritlm.example/v1"'));
  assert.ok(code.claude.includes('"ANTHROPIC_BASE_URL": "https://spiritlm.example/v1"'));
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
