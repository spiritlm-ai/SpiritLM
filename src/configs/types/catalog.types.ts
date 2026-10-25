export type UpstreamModel = {
  id: string;
  context_window?: unknown;
  contextWindow?: unknown;
  context_length?: unknown;
  max_context_tokens?: unknown;
  max_output_tokens?: unknown;
  max_tokens?: unknown;
};

export type ModelLimits = {
  contextWindow?: number;
  maxOutputTokens?: number;
};
export type ModelCatalog = Map<string, ModelLimits>;
