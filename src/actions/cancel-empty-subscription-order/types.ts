import type { z } from "zod";
import type { InputSchema } from "./schema";
import type { ActionState } from "@/configs/types/actions.types";
type Result = boolean;
export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = ActionState<InputType, Result>;
