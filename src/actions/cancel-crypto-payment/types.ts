import type { z } from "zod";
import type { InputSchema } from "./schema";

export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = { data: boolean };
