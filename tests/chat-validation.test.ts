import "../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateChat, validateModelTokenLimit } from "../src/lib/chat-proxy";
import { ApiError } from "../src/lib/api-error";

for (const field of ["max_tokens", "max_completion_tokens"]) {
  test(`accepts a client ${field} above 4096 for model-specific validation`, () => {
    assert.doesNotThrow(() => validateChat({
      model: "deepseek/deepseek-v4.1-flash",
      messages: [{ role: "user", content: "привет" }],
      [field]: 32_768,
    }));
  });
}

test("uses the model output limit instead of a common ceiling", () => {
  const body = { max_tokens: 393_216 };
  assert.doesNotThrow(() => validateModelTokenLimit(body, 393_216));
  assert.throws(
    () => validateModelTokenLimit({ max_tokens: 393_217 }, 393_216),
    (error: unknown) => error instanceof ApiError && error.code === "invalid_token_limit",
  );
  assert.doesNotThrow(() => validateModelTokenLimit(body));
});

test("still rejects invalid numeric limits and conflicting limit fields", () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, "32768", null]) {
    assert.throws(() => validateChat({
      model: "deepseek/deepseek-v4.1-flash",
      messages: [{ role: "user", content: "привет" }],
      max_tokens: value,
    }));
  }
  assert.throws(() => validateChat({
    model: "deepseek/deepseek-v4.1-flash",
    messages: [{ role: "user", content: "привет" }],
    max_tokens: 32_768,
    max_completion_tokens: 32_768,
  }));
});
