import { z } from "zod";
import type { ApiRequest } from "@prisma/client";
import type { ActionState } from "@/configs/types/actions.types";
import { InputSchema } from "./schema";

export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = ActionState<InputType, ApiRequest | null>;
