import type { z } from "zod";
import type { InputSchema } from "./schema";
import type { ActionState } from "@/configs/types/actions.types";
import type { SubscriptionOrder } from "@prisma/client";
type Result = SubscriptionOrder;
export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = ActionState<InputType, Result>;
