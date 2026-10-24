import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "../../src/lib/api-error";
import { readJson } from "../../src/lib/request-body";

test("JSON body limits reject oversized input", async () => {
  const request = new Request("https://spiritlm.example", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: "x".repeat(5000) }),
  });
  await assert.rejects(
    readJson(request, 4096),
    (error: unknown) => error instanceof ApiError && error.status === 413,
  );
});
