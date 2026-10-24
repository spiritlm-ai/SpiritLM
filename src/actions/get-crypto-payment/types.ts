import type { z } from "zod";
import type { ActionState } from "@/configs/types/actions.types";
import type { InputSchema } from "./schema";
import type { Payment } from "@prisma/client";

export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = ActionState<InputType, { payment: Payment | null; testBalance: string }>;

