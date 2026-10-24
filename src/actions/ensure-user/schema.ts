import { z } from "zod";
export const InputSchema = z.object({
  clerkId: z.string().startsWith("user_"),
});
