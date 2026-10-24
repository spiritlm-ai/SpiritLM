import { z } from "zod";
import { CRYPTO_BOT_MODES } from "@/configs/consts/payments.const";

export const InputSchema = z.object({
  userId: z.string().min(1),
  mode: z.enum(CRYPTO_BOT_MODES),
  appId: z.string().regex(/^\d{1,32}$/),
  id: z.string().min(1).max(191).optional(),
});

