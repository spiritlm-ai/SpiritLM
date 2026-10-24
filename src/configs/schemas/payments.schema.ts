import { z } from "zod";

const decimal = z.string().regex(/^\d{1,12}(\.\d{1,18})?$/);

export const cryptoInvoiceSchema = z.object({
  invoice_id: z.number().int().positive().safe(),
  currency_type: z.literal("fiat"),
  fiat: z.literal("RUB"),
  amount: decimal,
  status: z.enum(["active", "paid", "expired"]),
  payload: z.string().min(1).max(191),
  bot_invoice_url: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "t.me" &&
      !url.username && !url.password && !url.port;
  }),
  expiration_date: z.iso.datetime({ offset: true }).optional(),
  paid_at: z.iso.datetime({ offset: true }).optional(),
  paid_asset: z.string().max(16).optional(),
  paid_amount: decimal.optional(),
  fee_asset: z.string().max(16).optional(),
  fee_amount: z.union([decimal, z.number().finite().nonnegative()])
    .transform(String).optional(),
});
