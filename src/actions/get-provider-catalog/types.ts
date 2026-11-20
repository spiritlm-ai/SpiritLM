import type { z } from "zod";
import type { ActionState } from "@/configs/types/actions.types";
import type { ProviderModel } from "@/actions/save-provider-catalog/types";
import type { InputSchema } from "./schema";

export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = ActionState<InputType, ProviderModel[] | null>;
