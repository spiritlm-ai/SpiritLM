import type { z } from "zod";
import type { ActionState } from "@/configs/types/actions.types";
import type { SpiritCodeAccount } from "@/configs/types/spiritcode.types";
import type { InputSchema } from "./schema";

export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = ActionState<InputType, SpiritCodeAccount>;
