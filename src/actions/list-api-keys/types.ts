import { z } from "zod";
import { InputSchema } from "./schema";
import type { ActionState } from "@/configs/types/actions.types";
import type { ApiKeySummary } from "@/configs/types/api.types";
export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = ActionState<InputType, ApiKeySummary[]>;
