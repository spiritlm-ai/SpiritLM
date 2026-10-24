import { z } from "zod";
import { DASHBOARD_PERIOD_VALUES } from "@/configs/consts/dashboard.const";

export const InputSchema = z.object({
  userId: z.string().min(1),
  period: z.enum(DASHBOARD_PERIOD_VALUES).default("2d"),
});
