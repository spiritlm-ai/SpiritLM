import { z } from "zod";
export const InputSchema = z
  .object({
    userId: z.string().min(1),
    id: z.string().min(1),
    name: z.string().trim().min(1).max(48).optional(),
    useSubscription: z.boolean().optional(),
    allowBalanceFallback: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.useSubscription !== undefined ||
      data.allowBalanceFallback !== undefined,
  );
