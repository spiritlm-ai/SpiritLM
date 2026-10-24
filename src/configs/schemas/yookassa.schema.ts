import { z } from "zod";

export const yooKassaPaymentSchema = z.object({
  id: z.string().min(1).max(64),
  status: z.enum(["pending", "waiting_for_capture", "succeeded", "canceled"]),
  paid: z.boolean(),
  test: z.boolean(),
  amount: z.object({
    value: z.string().regex(/^\d{1,12}\.\d{2}$/),
    currency: z.string(),
  }),
  recipient: z.object({ account_id: z.string().min(1).max(32) }),
  payment_method: z.object({ type: z.string() }),
  metadata: z.object({ spiritlm_payment_id: z.string().min(1).max(191) }),
  confirmation: z
    .object({
      type: z.literal("redirect"),
      confirmation_url: z
        .url()
        .max(2048)
        .refine((value) => {
          const url = new URL(value);
          return (
            url.protocol === "https:" &&
            !url.username &&
            !url.password &&
            !url.port &&
            ["yoomoney.ru", "yookassa.ru"].some(
              (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
            )
          );
        }),
    })
    .optional(),
  created_at: z.iso.datetime({ offset: true }),
  expires_at: z.iso.datetime({ offset: true }).optional(),
  captured_at: z.iso.datetime({ offset: true }).optional(),
});
