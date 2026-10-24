import type { z } from "zod";
import type { InputSchema } from "./schema";
import type { ActionState } from "@/configs/types/actions.types";
import type { SubscriptionOverview } from "@/configs/types/subscriptions.types";
type Result = SubscriptionOverview;
export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = ActionState<InputType, Result>;
