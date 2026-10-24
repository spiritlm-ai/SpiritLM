export type ModelProvider = "openai" | "anthropic" | "deepseek" | "google" | "xai";

export type Model = {
  id: string;
  name: string;
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
