import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { yooKassaConfig, yooKassaRequest } from "../src/lib/yookassa";
import { ApiError } from "../src/lib/api-error";
import { InputSchema } from "../src/actions/reserve-yookassa-payment/schema";
import { yooKassaPaymentSchema } from "../src/configs/schemas/yookassa.schema";
import {
  createYooKassaReconcileTriggerToken,
  verifyYooKassaReconcileTriggerToken,
} from "../src/lib/yookassa-reconcile-auth";
import { createCryptoReconcileTriggerToken } from "../src/lib/crypto-reconcile-auth";

const config = { mode: "test" as const, shopId: "123", secretKey: "test_secret" };

test("YooKassa accepts only explicit test configuration without live fallback", () => {
  const names = [
    "YOOKASSA_MODE",
    "YOOKASSA_SHOP_ID",
    "YOOKASSA_SECRET_KEY_TEST",
    "YOOKASSA_SECRET_KEY",
  ] as const;
  const old = names.map((name) => process.env[name]);
  try {
    process.env.YOOKASSA_SHOP_ID = "123";
    process.env.YOOKASSA_SECRET_KEY_TEST = "test_secret";
    process.env.YOOKASSA_SECRET_KEY = "live_private";
    for (const mode of ["", "live", "test/live", "invalid"]) {
      process.env.YOOKASSA_MODE = mode;
      assert.throws(yooKassaConfig, /недоступна/);
    }
    process.env.YOOKASSA_MODE = "test";
    assert.deepEqual(yooKassaConfig(), config);
    delete process.env.YOOKASSA_SECRET_KEY_TEST;
    assert.throws(yooKassaConfig, /недоступна/);
    process.env.YOOKASSA_SECRET_KEY_TEST = "live_private";
    assert.throws(yooKassaConfig, /недоступна/);
  } finally {
    names.forEach((name, index) => {
      if (old[index] === undefined) delete process.env[name];
      else process.env[name] = old[index];
    });
  }
});

test("YooKassa enforces RUB precision, limits, and safe return origins", () => {
  const input = {
    userId: "user",
    mode: "test",
    shopId: "123",
    requestId: "00000000-0000-4000-8000-000000000001",
    returnUrl: "https://spiritlm.example/dashboard",
  };
  for (const amount of ["100", "1000.01", "100000.00"]) {
    assert.equal(InputSchema.safeParse({ ...input, amount }).success, true);
  }
  for (const amount of ["99.99", "100000.01", "100.001", "1e3", "-100", "NaN"]) {
    assert.equal(InputSchema.safeParse({ ...input, amount }).success, false);
  }
  assert.equal(
    InputSchema.safeParse({ ...input, amount: "100", returnUrl: "javascript:alert(1)" })
      .success,
    false,
  );
  assert.equal(
    InputSchema.safeParse({
      ...input,
      amount: "100",
      returnUrl: "http://localhost:3000/dashboard",
    }).success,
    true,
  );
});

test("YooKassa uses Basic Auth and persisted idempotency keys without HTTP retries", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    calls += 1;
    const request = input instanceof Request ? input : new Request(input, init);
    assert.equal(request.url, "https://api.yookassa.ru/v3/payments");
    assert.equal(
      request.headers.get("Authorization"),
      `Basic ${Buffer.from("123:test_secret").toString("base64")}`,
    );
    assert.equal(request.headers.get("Idempotence-Key"), "original-key");
    assert.deepEqual(await request.json(), { capture: true });
    return Response.json({ private: "do-not-expose" }, { status: 500 });
  };
  try {
    await assert.rejects(
      yooKassaRequest(config, "payments", z.unknown(), {
        key: "original-key",
        body: { capture: true },
      }),
      (error: Error) => !error.message.includes("do-not-expose"),
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("YooKassa cancellation rejection is distinct from payment creation rejection", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    assert.equal(request.url, "https://api.yookassa.ru/v3/payments/payment-id/cancel");
    assert.equal(request.method, "POST");
    assert.equal(request.headers.get("Idempotence-Key"), "cancel-original-key");
    assert.deepEqual(await request.json(), {});
    return Response.json({ private: "do-not-expose" }, { status: 400 });
  };
  try {
    await assert.rejects(
      yooKassaRequest(config, "payments/payment-id/cancel", z.unknown(), {
        key: "cancel-original-key",
        body: {},
      }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.code === "yookassa_rejected" &&
        !error.message.includes("do-not-expose"),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("YooKassa malformed JSON is reported as an invalid response, not a connection failure", async (context) => {
  context.mock.method(globalThis, "fetch", async () =>
    new Response("not-json-private-body", { status: 200 }),
  );
  await assert.rejects(
    yooKassaRequest(config, "payments", z.unknown()),
    (error: unknown) =>
      error instanceof ApiError && error.code === "invalid_yookassa_response",
  );
});

test("YooKassa transport diagnostics contain only an operation and an allowed reason", async (context) => {
  const messages: unknown[][] = [];
  context.mock.method(console, "error", (...args: unknown[]) => messages.push(args));
  context.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("private upstream information", {
      cause: Object.assign(new Error("private connection details"), { code: "ENOTFOUND" }),
    });
  });
  await assert.rejects(yooKassaRequest(config, "payments", z.unknown()));
  assert.deepEqual(messages, [[
    "YooKassa transport failed",
    { operation: "read", reason: "ENOTFOUND" },
  ]]);
});

test("YooKassa rejects unexpected confirmation destinations and incomplete objects", () => {
  assert.equal(yooKassaPaymentSchema.safeParse({ status: "succeeded" }).success, false);
  const confirmation = yooKassaPaymentSchema.shape.confirmation;
  for (const url of [
    "http://yoomoney.ru/pay",
    "https://yoomoney.ru.evil.example/pay",
    "https://evil.example",
    "https://user:pass@yoomoney.ru",
  ]) {
    assert.equal(
      confirmation.safeParse({ type: "redirect", confirmation_url: url }).success,
      false,
    );
  }
  assert.equal(
    confirmation.safeParse({
      type: "redirect",
      confirmation_url: "https://yoomoney.ru/checkout/payments/bank-card",
    }).success,
    true,
  );
});

test("YooKassa background trigger is authenticated separately from CryptoBot", () => {
  const token = createYooKassaReconcileTriggerToken("test_secret");
  assert.equal(verifyYooKassaReconcileTriggerToken("test_secret", token), true);
  assert.equal(verifyYooKassaReconcileTriggerToken("other", token), false);
  assert.equal(verifyYooKassaReconcileTriggerToken("test_secret", null), false);
  assert.equal(
    verifyYooKassaReconcileTriggerToken(
      "test_secret",
      createCryptoReconcileTriggerToken("test_secret"),
    ),
    false,
  );
});
