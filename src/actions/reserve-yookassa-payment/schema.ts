import { z } from "zod";
import { scopeSchema } from "@/configs/schemas/yookassa-scope.schema";
import { PAYMENT_LIMITS } from "@/configs/consts/payments.const";
export const InputSchema = scopeSchema.extend({
  requestId: z.uuid(),
  subscriptionOrderId: z.string().min(1).optional(),
  amount: z
    .string()
    .regex(/^\d{1,6}(\.\d{1,2})?$/)
    .refine(
      (value) =>
        Number(value) >= PAYMENT_LIMITS.MIN_AMOUNT &&
        Number(value) <= PAYMENT_LIMITS.MAX_AMOUNT,
    ),
  returnUrl: z
    .url()
    .max(2048)
    .refine((value) => {
      const url = new URL(value);
      return (
        (url.protocol === "https:" ||
          (url.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(url.hostname))) &&
        !url.username &&
        !url.password
      );
    }),
});
