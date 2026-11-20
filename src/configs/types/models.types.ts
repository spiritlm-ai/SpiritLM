export type ModelProvider = "openai" | "anthropic" | "deepseek" | "google" | "xai" | "z-ai" | "nvidia";

export type Model = {
  id: string;
  name: string;
  contextWindow?: number;
  pricePerMillionTokens: string;
  frontier?: boolean;
};

export type ModelGroup = {
  provider: ModelProvider;
  name: string;
  icon: string;
  modelProviderName: string;
  modelProviderIcon: string;
  models: Model[];
};
