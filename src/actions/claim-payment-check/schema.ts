import { z } from "zod";
export const InputSchema = z.object({ id: z.string().min(1) });

