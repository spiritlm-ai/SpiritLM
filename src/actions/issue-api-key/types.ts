import { z } from "zod";
import { InputSchema } from "./schema";
import type { ActionState } from "@/configs/types/actions.types";
import type { ApiKey } from "@prisma/client";
export type InputType = z.infer<typeof InputSchema>;
export type ReturnType = ActionState<
  InputType,
  Pick<
    ApiKey,
    | "id"
    | "name"
    | "prefix"
    | "createdAt"
    | "useSubscription"
    | "allowBalanceFallback"
  > & { secret: string }
>;
