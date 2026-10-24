import {
  SUBSCRIPTION_PLAN_IDS,
  SUBSCRIPTION_METHODS,
} from "@/configs/consts/subscriptions.const";
import { z } from "zod";
export const InputSchema = z.object({
  userId: z.string().min(1),
  requestId: z.uuid(),
  planId: z.enum(SUBSCRIPTION_PLAN_IDS),
  method: z.enum(SUBSCRIPTION_METHODS),
  mode: z.enum(["test", "live"]),
});
