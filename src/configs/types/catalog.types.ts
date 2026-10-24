export type UpstreamModel = {
  id: string;
  max_output_tokens?: unknown;
  max_tokens?: unknown;
};

export type ModelLimits = { maxOutputTokens?: number };
export type ModelCatalog = Map<string, ModelLimits>;
