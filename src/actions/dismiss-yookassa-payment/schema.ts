import { scopeSchema } from "@/configs/schemas/yookassa-scope.schema";
import { z } from "zod";

export const InputSchema = scopeSchema.extend({
  id: z.string().min(1).max(191),
});
