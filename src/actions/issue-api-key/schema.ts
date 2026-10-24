import { API_KEY_CONFIG } from "@/configs/consts/api-keys.const";
import { z } from "zod";
export const InputSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(1).max(API_KEY_CONFIG.NAME_LENGTH),
  useSubscription: z.boolean().optional(),
  allowBalanceFallback: z.boolean().optional(),
});
