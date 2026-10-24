import { FINAL_REQUEST_STATUSES } from "@/configs/consts/proxy.const";
import { z } from "zod";
export const InputSchema = z.object({
  id: z.string().min(1),
  status: z.enum(FINAL_REQUEST_STATUSES),
  httpStatus: z.number().int().optional(),
  durationMs: z.number().nonnegative(),
  usage: z
    .object({
      inputTokens: z.number().int().nonnegative(),
      outputTokens: z.number().int().nonnegative(),
      totalTokens: z.number().int().nonnegative(),
      cachedTokens: z.number().int().nonnegative(),
      reasoningTokens: z.number().int().nonnegative(),
    })
    .nullable(),
});
