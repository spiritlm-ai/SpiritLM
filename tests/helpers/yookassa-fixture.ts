import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { withBackendFixture } from "./backend-fixture";
import type { YooKassaPaymentObject } from "../../src/configs/types/yookassa.types";

export async function withYooKassaFixture(
  run: (fixture: {
    user: { id: string };
    other: { id: string };
    payments: Map<string, YooKassaPaymentObject>;
    provider: {
      creates: number;
      posts: number;
      reads: number;
      lists: number;
      loseResponse: boolean;
      unavailable: boolean;
      rejectCreation: boolean;
      cancellations: number;
      rejectCancellation: boolean;
      loseCancellationResponse: boolean;
      payOnCancellation: boolean;
      cardAvailable: boolean;
    };
    pay: () => YooKassaPaymentObject;
  }) => Promise<void>,
) {
  await withBackendFixture(async ({ user, other }) => {
    const originalFetch = globalThis.fetch;
    const names = [
      "YOOKASSA_MODE",
      "YOOKASSA_SHOP_ID",
      "YOOKASSA_SECRET_KEY_TEST",
    ] as const;
    const old = names.map((name) => process.env[name]);
    process.env.YOOKASSA_MODE = "test";
    process.env.YOOKASSA_SHOP_ID = "123";
    process.env.YOOKASSA_SECRET_KEY_TEST = "test_fixture";
    const payments = new Map<string, YooKassaPaymentObject>();
    const keys = new Map<string, { body: string; id: string }>();
    const provider = {
      creates: 0,
      posts: 0,
      reads: 0,
      lists: 0,
      loseResponse: false,
      unavailable: false,
      rejectCreation: false,
      cancellations: 0,
      rejectCancellation: false,
      loseCancellationResponse: false,
      payOnCancellation: false,
      cardAvailable: true,
    };
    globalThis.fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      assert.equal(url.origin, "https://api.yookassa.ru");
      assert.equal(
        request.headers.get("Authorization"),
        `Basic ${Buffer.from("123:test_fixture").toString("base64")}`,
      );
      if (provider.unavailable)
        return Response.json({ private: "private-error" }, { status: 503 });
      if (request.method === "GET" && url.pathname === "/v3/me") {
        return Response.json({
          test: true,
          payment_methods: provider.cardAvailable ? ["bank_card"] : ["sbp"],
        });
      }
      if (request.method === "POST" && url.pathname.endsWith("/cancel")) {
        provider.cancellations += 1;
        const id = url.pathname.split("/").at(-2)!;
        const remote = payments.get(id);
        assert.ok(remote);
        assert.equal(
          request.headers.get("Idempotence-Key"),
          `cancel-${remote.metadata.spiritlm_payment_id}`,
        );
        assert.deepEqual(await request.json(), {});
        if (provider.payOnCancellation) {
          remote.status = "succeeded";
          remote.paid = true;
          remote.captured_at = new Date().toISOString();
        }
        if (provider.rejectCancellation || remote.status !== "waiting_for_capture") {
          return Response.json({ private: "private-error" }, { status: 400 });
        }
        remote.status = "canceled";
        if (provider.loseCancellationResponse) throw new Error("Lost cancellation response");
        return Response.json(remote);
      }
      if (request.method === "POST") {
        assert.equal(url.pathname, "/v3/payments");
        provider.posts += 1;
        if (provider.rejectCreation)
          return Response.json({ private: "invalid credentials" }, { status: 401 });
        const key = request.headers.get("Idempotence-Key")!;
        const text = await request.text();
        const existing = keys.get(key);
        if (existing) {
          assert.equal(
            text,
            existing.body,
            "Recovery must reuse the exact original body",
          );
          return Response.json(payments.get(existing.id));
        }
        const body = JSON.parse(text);
        assert.ok(["bank_card", "sbp"].includes(body.payment_method_data.type));
        assert.equal(body.capture, true);
        assert.equal(body.confirmation.type, "redirect");
        assert.equal(body.amount.currency, "RUB");
        const id = randomUUID();
        provider.creates += 1;
        const remote: YooKassaPaymentObject = {
          id,
          status: "pending",
          paid: false,
          test: true,
          amount: body.amount,
          metadata: body.metadata,
          recipient: { account_id: "123" },
          payment_method: { type: body.payment_method_data.type },
          confirmation: {
            type: "redirect",
            confirmation_url: `https://yoomoney.ru/checkout/payments/bank-card?orderId=${id}`,
          },
          created_at: new Date().toISOString(),
        };
        payments.set(id, remote);
        keys.set(key, { body: text, id });
        if (provider.loseResponse) throw new Error("Lost response after creation");
        return Response.json(remote);
      }
      if (url.pathname === "/v3/payments") {
        provider.lists += 1;
        return Response.json({ items: [...payments.values()] });
      }
      provider.reads += 1;
      const remote = payments.get(decodeURIComponent(url.pathname.split("/").pop()!));
      return remote ? Response.json(remote) : Response.json({}, { status: 404 });
    };
    try {
      await run({
        user,
        other,
        payments,
        provider,
        pay: () => {
          const remote = [...payments.values()][0];
          remote.status = "succeeded";
          remote.paid = true;
          remote.captured_at = new Date().toISOString();
          return remote;
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
      names.forEach((name, index) => {
        if (old[index] === undefined) delete process.env[name];
        else process.env[name] = old[index];
      });
    }
  });
}
