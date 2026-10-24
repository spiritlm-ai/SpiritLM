import { z } from "zod";
import { InputSchema } from "./schema";
import type { IssuedApiKey } from "@/configs/types/api.types";
import type { ActionState } from "@/configs/types/actions.types";

export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = ActionState<InputType, IssuedApiKey>;
