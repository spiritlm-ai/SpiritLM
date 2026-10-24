import type { z } from "zod";
import type { InputSchema } from "./schema";
import type { ActionState } from "@/configs/types/actions.types";
import type { Prisma } from "@prisma/client";
type Result = Prisma.SubscriptionOrderGetPayload<{
  include: { cryptoPayment: true; cardPayment: true };
}>;
export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = ActionState<InputType, Result>;
