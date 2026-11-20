import { z } from "zod";

export const ProviderModelSchema = z.object({
  id: z.string().trim().min(1),
  display_name: z.string().optional(),
  owned_by: z.string().optional(),
  multiplier: z.number().nonnegative(),
  base_multiplier: z.number().nonnegative(),
  fast_multiplier: z.number().nonnegative(),
  context_window: z.number().int().positive().optional().catch(undefined),
  max_output_tokens: z.number().int().positive().optional().catch(undefined),
});

export const ProviderModelsSchema = z.array(ProviderModelSchema).min(1).refine(
  (models) => new Set(models.map((model) => model.id)).size === models.length,
  { message: "Каталог содержит повторяющиеся ID моделей" },
);

export const InputSchema = z.object({
  provider: z.string().trim().min(1).max(64),
  fetchedAt: z.date(),
  models: ProviderModelsSchema,
});
