import { API_KEY_CONFIG } from "@/configs/consts/api-keys.const";
import { z } from "zod";

export const InputSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(API_KEY_CONFIG.NAME_LENGTH),
});
