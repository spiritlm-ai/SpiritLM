import assert from "node:assert/strict";
import { withBackendFixture } from "./backend-fixture";
import type { CryptoInvoice } from "../../src/configs/types/payments.types";

export async function withCryptoFixture(
  run: (fixture: {
    user: { id: string };
    other: { id: string };
    invoices: Map<number, CryptoInvoice>;
    provider: { creates: number; reads: number; createResult: "ok" | "lost" | "rejected" };
    pay: (id: number, asset?: "USDT" | "TON") => CryptoInvoice;
  }) => Promise<void>,
) {
  await withBackendFixture(async ({ user, other }) => {
    const originalFetch = globalThis.fetch;
    const names = ["CRYPTO_BOT_MODE", "CRYPTO_BOT_TOKEN", "CRYPTO_BOT_TOKEN_TEST"] as const;
    const previous = names.map((name) => process.env[name]);
    process.env.CRYPTO_BOT_MODE = "test";
    process.env.CRYPTO_BOT_TOKEN_TEST = "777:test-token";
    process.env.CRYPTO_BOT_TOKEN = "888:live-token";
    const invoices = new Map<number, CryptoInvoice>();
    const provider = { creates: 0, reads: 0, createResult: "ok" as "ok" | "lost" | "rejected" };
    globalThis.fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      assert.ok(["https://testnet-pay.crypt.bot", "https://pay.crypt.bot"].includes(url.origin));
      assert.equal(request.headers.get("Crypto-Pay-API-Token"),
        url.hostname.startsWith("testnet") ? "777:test-token" : "888:live-token");
      const body = await request.json();
      if (url.pathname === "/api/createInvoice") {
        provider.creates += 1;
        assert.equal(body.accepted_assets, "USDT,TON");
        assert.equal(body.fiat, "RUB");
        assert.equal(body.currency_type, "fiat");
        if (provider.createResult === "rejected") {
          return Response.json({ ok: false, error: { name: "private-provider-error" } });
        }
        const id = provider.creates;
        const invoice: CryptoInvoice = {
          invoice_id: id,
          payload: body.payload,
          currency_type: "fiat",
          fiat: "RUB",
          amount: body.amount,
          status: "active",
          bot_invoice_url: `https://t.me/CryptoTestnetBot?start=${id}`,
          expiration_date: new Date(Date.now() + 1_800_000).toISOString(),
        };
        invoices.set(id, invoice);
        if (provider.createResult === "lost") throw new Error("Connection lost after invoice creation");
        return Response.json({ ok: true, result: invoice });
      }
      assert.equal(url.pathname, "/api/getInvoices");
      provider.reads += 1;
      const items = [...invoices.values()]
        .filter((invoice) => !body.invoice_ids || String(invoice.invoice_id) === body.invoice_ids)
        .reverse().slice(body.offset, body.offset + body.count);
      return Response.json({ ok: true, result: { items } });
    };
    try {
      await run({
        user,
        other,
        invoices,
        provider,
        pay: (id, asset = "USDT") => {
          const invoice = invoices.get(id)!;
          invoice.status = "paid";
          invoice.paid_at = new Date().toISOString();
          invoice.paid_asset = asset;
          invoice.paid_amount = "1.23456789";
          invoice.fee_asset = "USDT";
          invoice.fee_amount = "0.01";
          return invoice;
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
      names.forEach((name, index) => {
        if (previous[index] === undefined) delete process.env[name];
        else process.env[name] = previous[index];
      });
    }
  });
}
