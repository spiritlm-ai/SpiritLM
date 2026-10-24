import { z } from "zod";
import {
  CRYPTO_BOT_MODES,
  PAYMENT_LIMITS,
} from "@/configs/consts/payments.const";

export const InputSchema = z.object({
  userId: z.string().min(1),
  mode: z.enum(CRYPTO_BOT_MODES),
  appId: z.string().regex(/^\d{1,32}$/),
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
});
