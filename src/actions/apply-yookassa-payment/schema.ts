import { z } from "zod";
import { yooKassaPaymentSchema } from "@/configs/schemas/yookassa.schema";
export const InputSchema = z.object({
  mode: z.literal("test"),
  shopId: z.string().regex(/^\d{1,32}$/),
  payment: yooKassaPaymentSchema,
});
