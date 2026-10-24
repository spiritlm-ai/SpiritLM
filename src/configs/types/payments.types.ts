import type { CRYPTO_BOT_MODES } from "@/configs/consts/payments.const";
import type { z } from "zod";
import type { cryptoInvoiceSchema } from "@/configs/schemas/payments.schema";

export type CryptoInvoice = z.infer<typeof cryptoInvoiceSchema>;

export type CryptoBotMode = (typeof CRYPTO_BOT_MODES)[number];

export type CryptoBotConfig = {
  mode: CryptoBotMode;
  token: string;
  appId: string;
  baseUrl: string;
};

export type PaymentSummary = {
  id: string;
  amount: string;
  mode: CryptoBotMode;
  status: "CREATING" | "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "FAILED";
  invoiceUrl: string | null;
  expiresAt: string | null;
};

export type PaymentOverview = {
  mode: CryptoBotMode;
  testBalance: string;
  payment: PaymentSummary | null;
};
