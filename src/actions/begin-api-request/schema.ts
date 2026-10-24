import { z } from "zod";
export const InputSchema = z.object({
  userId: z.string().min(1),
  apiKeyId: z.string().optional(),
  diagnostic: z.boolean(),
  model: z.string().min(1),
  upstreamModel: z.string().min(1),
  streaming: z.boolean(),
  price: z.string(),
  reservation: z.string().regex(/^\d+(?:\.\d{1,8})?$/),
});
