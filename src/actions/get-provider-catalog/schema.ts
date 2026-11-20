import { z } from "zod";

export const InputSchema = z.object({
  provider: z.string().trim().min(1).max(64),
});
