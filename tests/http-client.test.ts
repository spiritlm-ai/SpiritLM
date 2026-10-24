import assert from "node:assert/strict";
import { test } from "node:test";
import { http } from "../src/lib/http-client";
import { dashboardFetch } from "../src/lib/dashboard-client";

test("upstream HTTP failures are returned without automatic retries", async () => {
  let calls = 0;
  const client = http.extend({
    fetch: async () => {
      calls += 1;
      return new Response("private response", { status: 429 });
    },
  });
  const response = await client.post("https://upstream.example/chat", {
    json: { model: "test" },
  });
  assert.equal(response.status, 429);
  assert.equal(calls, 1);
});

test("transport forwards cancellation without retrying", async () => {
  let calls = 0;
  const client = http.extend({
    fetch: async (input) => {
      calls += 1;
      const request = input as Request;
      return new Promise<Response>((_resolve, reject) => {
        request.signal.addEventListener(
          "abort",
          () => reject(request.signal.reason),
          { once: true },
        );
      });
    },
  });
  const controller = new AbortController();
  const response = client("https://upstream.example/models", {
    signal: controller.signal,
  });
  const rejection = assert.rejects(
    response,
    (error: unknown) => error instanceof Error && error.name === "AbortError",
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  controller.abort();
  await rejection;
  assert.equal(calls, 1);
});

test("dashboard retains API error messages and supplied headers", async (context) => {
  context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const request = input as Request;
    assert.equal(request.headers.get("x-test"), "retained");
    return Response.json(
      { error: { message: "Ключ не найден" } },
      { status: 404 },
    );
  });
  await assert.rejects(
    dashboardFetch("https://dashboard.example/keys", {
      headers: new Headers({ "x-test": "retained" }),
    }),
    /Ключ не найден/,
  );
});
