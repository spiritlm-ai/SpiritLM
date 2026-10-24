import { z } from "zod";
export const scopeSchema = z.object({
  userId: z.string().min(1),
  mode: z.literal("test"),
  shopId: z.string().regex(/^\d{1,32}$/),
});
