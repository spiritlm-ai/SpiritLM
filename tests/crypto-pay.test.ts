import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { test } from "node:test";
import { z } from "zod";
import { cryptoBotConfig, cryptoPayRequest, verifyCryptoSignature } from "../src/lib/crypto-pay";
import {
  createCryptoReconcileTriggerToken,
  verifyCryptoReconcileTriggerToken,
} from "../src/lib/crypto-reconcile-auth";
import { InputSchema } from "../src/actions/reserve-crypto-payment/schema";

test("payment mode fails closed and selects only the matching token and endpoint", () => {
  const previous = { ...process.env };
  try {
    process.env.CRYPTO_BOT_TOKEN = "123:live-secret";
    process.env.CRYPTO_BOT_TOKEN_TEST = "456:test-secret";
    for (const mode of [undefined, "", "production", "TEST"]) {
      if (mode === undefined) delete process.env.CRYPTO_BOT_MODE;
      else process.env.CRYPTO_BOT_MODE = mode;
      assert.throws(() => cryptoBotConfig(), /недоступно/);
    }
    process.env.CRYPTO_BOT_MODE = "test";
    assert.equal(cryptoBotConfig().baseUrl, "https://testnet-pay.crypt.bot/api/");
    assert.equal(cryptoBotConfig().token, "456:test-secret");
    assert.equal(cryptoBotConfig().appId, "456");
    delete process.env.CRYPTO_BOT_TOKEN_TEST;
    assert.throws(() => cryptoBotConfig(), /недоступно/);
    process.env.CRYPTO_BOT_MODE = "live";
    assert.equal(cryptoBotConfig().token, "123:live-secret");
    assert.equal(cryptoBotConfig().baseUrl, "https://pay.crypt.bot/api/");
  } finally {
    process.env = previous;
  }
});

test("webhook signature covers the exact raw body and rejects malformed signatures", () => {
  const token = "123:signature-test";
  const body = Buffer.from('{ "hello": "Привет" }\r\n');
  const signature = createHmac("sha256", createHash("sha256").update(token).digest())
    .update(body).digest("hex");
  assert.equal(verifyCryptoSignature(body, signature, token), true);
  assert.equal(verifyCryptoSignature(body, signature, "another-token"), false);
  assert.equal(verifyCryptoSignature(Buffer.from('{"hello":"Привет"}'), signature, token), false);
  for (const invalid of [null, "", "a", "0".repeat(64), "z".repeat(64)]) {
    assert.equal(verifyCryptoSignature(body, invalid, token), false);
  }
});

test("scheduled reconciliation trigger requires a token derived from the Crypto Pay token", () => {
  const cryptoPayToken = "123:reconcile-test";
  const triggerToken = createCryptoReconcileTriggerToken(cryptoPayToken);

  assert.equal(verifyCryptoReconcileTriggerToken(cryptoPayToken, triggerToken), true);
  assert.equal(verifyCryptoReconcileTriggerToken("other-token", triggerToken), false);
  assert.equal(verifyCryptoReconcileTriggerToken(cryptoPayToken, "invalid"), false);
  assert.equal(verifyCryptoReconcileTriggerToken(cryptoPayToken, null), false);
});

test("payment validation enforces RUB amount precision and limits", () => {
  const base = {
    userId: "user-test",
    appId: "123",
    mode: "test",
    requestId: "e01d38ee-09a7-4fc4-aa10-06fc803a4c89",
  };
  for (const amount of ["100", "100.01", "100000.00"]) {
    assert.equal(InputSchema.safeParse({ ...base, amount }).success, true);
  }
  for (const amount of ["0", "99.99", "100000.01", "-100", "1e3", "100.001", "NaN"]) {
    assert.equal(InputSchema.safeParse({ ...base, amount }).success, false);
  }
});

test("Crypto Pay failures are sanitized and are never automatically retried", async (context) => {
  const config = {
    mode: "test" as const,
    appId: "123",
    token: "123:test-private-token",
    baseUrl: "https://testnet-pay.crypt.bot/api/",
  };
  let calls = 0;
  context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const request = input as Request;
    assert.equal(request.headers.get("Crypto-Pay-API-Token"), config.token);
    calls += 1;
    return new Response("private provider response", { status: 500 });
  });
  await assert.rejects(
    cryptoPayRequest(config, "getMe", {}, z.unknown()),
    (error: unknown) => error instanceof Error &&
      !error.message.includes("private") && !error.message.includes(config.token),
  );
  assert.equal(calls, 1);
});
