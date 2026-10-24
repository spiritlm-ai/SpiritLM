import assert from "node:assert/strict";
import { test } from "node:test";
import { chatRequest, nativeResponse } from "../src/lib/compatibility-api";

test("Anthropic Messages requests convert system, text, and tool results to Chat Completions", () => {
  const converted = chatRequest({
    model: "anthropic/claude-sonnet-4.6",
    system: "Be concise",
    max_tokens: 100,
    messages: [
      { role: "assistant", content: [{ type: "tool_use", id: "call_1", name: "lookup", input: { q: "x" } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "call_1", content: "found" }] },
    ],
    tools: [{ name: "lookup", input_schema: { type: "object" } }],
  }, "anthropic");
  assert.deepEqual(converted.messages, [
    { role: "system", content: "Be concise" },
    { role: "assistant", content: "", tool_calls: [{ id: "call_1", type: "function", function: { name: "lookup", arguments: '{"q":"x"}' } }] },
    { role: "tool", tool_call_id: "call_1", content: "found" },
  ]);
  assert.deepEqual(converted.tools, [{ type: "function", function: { name: "lookup", description: undefined, parameters: { type: "object" } } }]);
});

test("Responses API function call and result items convert to a tool round trip", () => {
  const converted = chatRequest({
    model: "gpt/example",
    max_output_tokens: 64,
    input: [
      { type: "function_call", call_id: "call_1", name: "lookup", arguments: '{"q":"x"}' },
      { type: "function_call_output", call_id: "call_1", output: "found" },
    ],
  }, "responses");
  assert.equal(converted.max_completion_tokens, 64);
  assert.deepEqual(converted.messages, [
    { role: "assistant", content: "", tool_calls: [{ id: "call_1", type: "function", function: { name: "lookup", arguments: '{"q":"x"}' } }] },
    { role: "tool", tool_call_id: "call_1", content: "found" },
  ]);
});

test("native non-stream responses preserve text and usage", () => {
  const source = {
    id: "chatcmpl_1",
    created: 1,
    choices: [{ message: { role: "assistant", content: "Hello" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 },
  };
  const anthropic = nativeResponse(source, "anthropic", "claude-model");
  assert.deepEqual(anthropic.content, [{ type: "text", text: "Hello" }]);
  assert.deepEqual(anthropic.usage, { input_tokens: 4, output_tokens: 2 });
  const responses = nativeResponse(source, "responses", "gpt-model");
  assert.equal(responses.output_text, "Hello");
  assert.deepEqual(responses.usage, { input_tokens: 4, output_tokens: 2, total_tokens: 6 });
});
