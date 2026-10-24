import { z } from "zod";

export const InputSchema = z.object({ userId: z.string().min(1) });
