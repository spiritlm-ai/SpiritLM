import type { z } from "zod";
import type { ActionState } from "@/configs/types/actions.types";
import type { InputSchema } from "./schema";
import type { YooKassaPayment } from "@prisma/client";
export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = ActionState<
  InputType,
  { payment: YooKassaPayment | null; testBalance: string }
>;
