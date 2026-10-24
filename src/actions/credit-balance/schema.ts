import { BALANCE_LIMITS } from "@/configs/consts/balance.const";
import { z } from "zod";
export const InputSchema = z.object({
  clerkId: z.string().startsWith("user_"),
  amount: z.string().regex(/^\d{1,7}(\.\d{1,8})?$/),
  operationId: z.string().min(1).max(BALANCE_LIMITS.OPERATION_ID_LENGTH),
  note: z.string().min(1).max(BALANCE_LIMITS.NOTE_LENGTH),
});
