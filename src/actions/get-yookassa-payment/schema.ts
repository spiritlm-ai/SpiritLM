import { z } from "zod";
import { scopeSchema } from "@/configs/schemas/yookassa-scope.schema";
export const InputSchema = scopeSchema.extend({
  id: z.string().min(1).max(191).optional(),
  requestId: z.uuid().optional(),
});
