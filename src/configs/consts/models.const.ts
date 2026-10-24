import { IMAGES } from "../paths/images.paths";
import type { ModelGroup } from "../types/models.types";

// Confirmed customer tariffs, in ₽ per 1 million tokens.
export const MODEL_GROUPS: ModelGroup[] = [
  {
    provider: "openai",
    name: "OpenAI",
    icon: IMAGES.AI.OPENAI,
    modelProviderName: "GPT",
    modelProviderIcon: IMAGES.AI.LUNA,
    models: [
      { id: "openai/gpt-6-astra", name: "GPT 6 Astra", pricePerMillionTokens: "90 ₽", frontier: true },
      { id: "openai/gpt-6.1-sol", name: "GPT 6.1 Sol", pricePerMillionTokens: "27 ₽", frontier: true },
      { id: "openai/gpt-6-sol", name: "GPT 6 Sol", pricePerMillionTokens: "27 ₽", frontier: true },
      { id: "openai/gpt-6-luna", name: "GPT 6 Luna", pricePerMillionTokens: "3,60 ₽" },
      { id: "openai/gpt-5.6-sol", name: "GPT 5.6 Sol", pricePerMillionTokens: "36 ₽", frontier: true },
      { id: "openai/gpt-5.6-terra", name: "GPT 5.6 Terra", pricePerMillionTokens: "11,80 ₽" },
      { id: "openai/gpt-5.6-luna", name: "GPT 5.6 Luna", pricePerMillionTokens: "4,60 ₽" },
      { id: "openai/gpt-5.5", name: "GPT 5.5", pricePerMillionTokens: "36 ₽", frontier: true },
    ],
  },
  {
    provider: "anthropic",
    name: "Anthropic",
    icon: IMAGES.AI.ANTHROPIC,
    modelProviderName: "Claude",
    modelProviderIcon: IMAGES.AI.CLAUDE,
    models: [
      { id: "anthropic/claude-fable-5.1", name: "Claude Fable 5.1", pricePerMillionTokens: "72 ₽", frontier: true },
      { id: "anthropic/claude-fable-5", name: "Claude Fable 5", pricePerMillionTokens: "72 ₽", frontier: true },
      { id: "anthropic/claude-opus-5.5", name: "Claude Opus 5.5", pricePerMillionTokens: "36 ₽", frontier: true },
      { id: "anthropic/claude-opus-5", name: "Claude Opus 5", pricePerMillionTokens: "36 ₽", frontier: true },
      { id: "anthropic/claude-opus-4.8", name: "Claude Opus 4.8", pricePerMillionTokens: "36 ₽", frontier: true },
      { id: "anthropic/claude-opus-4.7", name: "Claude Opus 4.7", pricePerMillionTokens: "36 ₽", frontier: true },
      { id: "anthropic/claude-opus-4.6", name: "Claude Opus 4.6", pricePerMillionTokens: "36 ₽", frontier: true },
      { id: "anthropic/claude-sonnet-5.5", name: "Claude Sonnet 5.5", pricePerMillionTokens: "18 ₽", frontier: true },
      { id: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5", pricePerMillionTokens: "18 ₽", frontier: true },
      { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6", pricePerMillionTokens: "18 ₽" },
      { id: "anthropic/claude-haiku-5.5", name: "Claude Haiku 5.5", pricePerMillionTokens: "11,80 ₽" },
      { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", pricePerMillionTokens: "8,20 ₽" },
    ],
  },
  {
    provider: "deepseek",
    name: "DeepSeek",
    icon: IMAGES.AI.DEEPSEEK,
    modelProviderName: "DeepSeek",
    modelProviderIcon: IMAGES.AI.DEEPSEEK,
    models: [
      { id: "deepseek/deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", pricePerMillionTokens: "0,90 ₽" },
      { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro", pricePerMillionTokens: "4,60 ₽", frontier: true },
      { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash", pricePerMillionTokens: "0,90 ₽" },
    ],
  },
  {
    provider: "google",
    name: "Google",
    icon: IMAGES.AI.GOOGLE,
    modelProviderName: "Gemini",
    modelProviderIcon: IMAGES.AI.GOOGLE,
    models: [
      { id: "google/gemini-3.8-flash", name: "Gemini 3.8 Flash", pricePerMillionTokens: "18 ₽" },
      { id: "google/gemini-3.7-flash", name: "Gemini 3.7 Flash", pricePerMillionTokens: "18 ₽" },
      { id: "google/gemini-3.6-flash", name: "Gemini 3.6 Flash", pricePerMillionTokens: "18 ₽" },
      { id: "google/gemini-3.1-pro", name: "Gemini 3.1 Pro", pricePerMillionTokens: "22 ₽", frontier: true },
    ],
  },
  {
    provider: "xai",
    name: "xAI",
    icon: IMAGES.AI.XAI,
    modelProviderName: "Grok",
    modelProviderIcon: IMAGES.AI.XAI,
    models: [
      { id: "x-ai/grok-4.7", name: "Grok 4.7", pricePerMillionTokens: "4,60 ₽", frontier: true },
      { id: "x-ai/grok-4.6", name: "Grok 4.6", pricePerMillionTokens: "4,60 ₽", frontier: true },
      { id: "x-ai/grok-4.5", name: "Grok 4.5", pricePerMillionTokens: "4,60 ₽" },
    ],
  },
];
