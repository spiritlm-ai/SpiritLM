import { z } from "zod";
export const InputSchema = z.object({
  mode: z.literal("test"),
  shopId: z.string().regex(/^\d{1,32}$/),
});
