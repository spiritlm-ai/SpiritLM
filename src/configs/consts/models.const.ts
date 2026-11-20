import { IMAGES } from "../paths/images.paths";
import type { ModelGroup, ModelProvider } from "../types/models.types";

export const CHEAPVIBE_MODEL_FAMILIES: Record<ModelProvider, string> = {
  openai: "gpt-",
  anthropic: "claude-",
  deepseek: "deepseek-",
  google: "gemini-",
  xai: "grok-",
  "z-ai": "glm-",
  nvidia: "nemotron-",
};

export const CHEAPVIBE_LEGACY_MODEL_IDS: ReadonlyMap<string, string> = new Map([
  ["deepseek-v4-pro-0813", "deepseek-v4-pro"],
  ["deepseek-v4.1-flash-1017", "deepseek-v4.1-flash"],
  ["deepseek-v4-flash-0731", "deepseek-v4-flash"],
]);

// Context windows verified against the upstream /v1/models catalog on 2026-10-25.
// Preset catalog and sample prices per 1 MTok before the first successful sync.
// Frontier highlights the current upper-tier entries in the supported model families.
export const MODEL_GROUPS: ModelGroup[] = [
  {
    provider: "openai",
    name: "OpenAI",
    icon: IMAGES.AI.OPENAI,
    modelProviderName: "GPT",
    modelProviderIcon: IMAGES.AI.LUNA,
    models: [
      {
        id: "openai/gpt-6.2-astra",
        contextWindow: 1_050_000,
        name: "GPT 6.2 Astra",
        pricePerMillionTokens: "80 ₽",
        frontier: true,
      },
      {
        id: "openai/gpt-6.2-sol",
        contextWindow: 1_050_000,
        name: "GPT 6.2 Sol",
        pricePerMillionTokens: "30 ₽",
        frontier: true,
      },
      {
        id: "openai/gpt-6-astra",
        contextWindow: 1_050_000,
        name: "GPT 6 Astra",
        pricePerMillionTokens: "90 ₽",
      },
      {
        id: "openai/gpt-6.1-sol",
        contextWindow: 1_050_000,
        name: "GPT 6.1 Sol",
        pricePerMillionTokens: "27 ₽",
      },
      {
        id: "openai/gpt-6-sol",
        contextWindow: 1_050_000,
        name: "GPT 6 Sol",
        pricePerMillionTokens: "27 ₽",
      },
      {
        id: "openai/gpt-6-luna",
        contextWindow: 1_050_000,
        name: "GPT 6 Luna",
        pricePerMillionTokens: "3,60 ₽",
      },
      {
        id: "openai/gpt-5.6-sol",
        contextWindow: 1_050_000,
        name: "GPT 5.6 Sol",
        pricePerMillionTokens: "36 ₽",
      },
      {
        id: "openai/gpt-5.6-terra",
        contextWindow: 1_050_000,
        name: "GPT 5.6 Terra",
        pricePerMillionTokens: "11,80 ₽",
      },
      {
        id: "openai/gpt-5.6-luna",
        contextWindow: 1_050_000,
        name: "GPT 5.6 Luna",
        pricePerMillionTokens: "4,60 ₽",
      },
    ],
  },
  {
    provider: "anthropic",
    name: "Anthropic",
    icon: IMAGES.AI.ANTHROPIC,
    modelProviderName: "Claude",
    modelProviderIcon: IMAGES.AI.CLAUDE,
    models: [
      {
        id: "anthropic/claude-fable-5.2",
        contextWindow: 1_000_000,
        name: "Claude Fable 5.2",
        pricePerMillionTokens: "80 ₽",
        frontier: true,
      },
      {
        id: "anthropic/claude-fable-5.1",
        contextWindow: 1_000_000,
        name: "Claude Fable 5.1",
        pricePerMillionTokens: "72 ₽",
      },
      {
        id: "anthropic/claude-fable-5",
        contextWindow: 1_000_000,
        name: "Claude Fable 5",
        pricePerMillionTokens: "72 ₽",
      },
      {
        id: "anthropic/claude-opus-5.5",
        contextWindow: 1_000_000,
        name: "Claude Opus 5.5",
        pricePerMillionTokens: "36 ₽",
        frontier: true,
      },
      {
        id: "anthropic/claude-opus-5",
        contextWindow: 1_000_000,
        name: "Claude Opus 5",
        pricePerMillionTokens: "36 ₽",
      },
      {
        id: "anthropic/claude-opus-4.8",
        contextWindow: 1_000_000,
        name: "Claude Opus 4.8",
        pricePerMillionTokens: "36 ₽",
      },
      {
        id: "anthropic/claude-opus-4.7",
        contextWindow: 1_000_000,
        name: "Claude Opus 4.7",
        pricePerMillionTokens: "36 ₽",
      },
      {
        id: "anthropic/claude-opus-4.6",
        contextWindow: 200_000,
        name: "Claude Opus 4.6",
        pricePerMillionTokens: "36 ₽",
      },
      {
        id: "anthropic/claude-sonnet-5.5",
        contextWindow: 1_000_000,
        name: "Claude Sonnet 5.5",
        pricePerMillionTokens: "18 ₽",
        frontier: true,
      },
      {
        id: "anthropic/claude-sonnet-5",
        contextWindow: 1_000_000,
        name: "Claude Sonnet 5",
        pricePerMillionTokens: "18 ₽",
      },
      {
        id: "anthropic/claude-sonnet-4.6",
        contextWindow: 200_000,
        name: "Claude Sonnet 4.6",
        pricePerMillionTokens: "18 ₽",
      },
      {
        id: "anthropic/claude-haiku-5.5",
        contextWindow: 1_000_000,
        name: "Claude Haiku 5.5",
        pricePerMillionTokens: "11,80 ₽",
      },
      {
        id: "anthropic/claude-haiku-4.5",
        contextWindow: 200_000,
        name: "Claude Haiku 4.5",
        pricePerMillionTokens: "8,20 ₽",
      },
    ],
  },
  {
    provider: "deepseek",
    name: "DeepSeek",
    icon: IMAGES.AI.DEEPSEEK,
    modelProviderName: "DeepSeek",
    modelProviderIcon: IMAGES.AI.DEEPSEEK,
    models: [
      {
        id: "deepseek/deepseek-v4.1-flash",
        contextWindow: 1_048_576,
        name: "DeepSeek V4.1 Flash",
        pricePerMillionTokens: "0,90 ₽",
        frontier: true,
      },
      {
        id: "deepseek/deepseek-v4-pro",
        contextWindow: 1_048_576,
        name: "DeepSeek V4 Pro",
        pricePerMillionTokens: "4,60 ₽",
        frontier: true,
      },
      {
        id: "deepseek/deepseek-v4-flash",
        contextWindow: 1_048_576,
        name: "DeepSeek V4 Flash",
        pricePerMillionTokens: "0,90 ₽",
      },
    ],
  },
  {
    provider: "google",
    name: "Google",
    icon: IMAGES.AI.GOOGLE,
    modelProviderName: "Gemini",
    modelProviderIcon: IMAGES.AI.GOOGLE,
    models: [
      {
        id: "google/gemini-3.8-flash",
        contextWindow: 1_048_576,
        name: "Gemini 3.8 Flash",
        pricePerMillionTokens: "18 ₽",
        frontier: true,
      },
      {
        id: "google/gemini-3.7-flash",
        contextWindow: 1_048_576,
        name: "Gemini 3.7 Flash",
        pricePerMillionTokens: "18 ₽",
      },
      {
        id: "google/gemini-3.6-flash",
        contextWindow: 1_048_576,
        name: "Gemini 3.6 Flash",
        pricePerMillionTokens: "18 ₽",
      },
      {
        id: "google/gemini-3.1-pro",
        contextWindow: 1_048_576,
        name: "Gemini 3.1 Pro",
        pricePerMillionTokens: "22 ₽",
      },
    ],
  },
  {
    provider: "xai",
    name: "xAI",
    icon: IMAGES.AI.XAI,
    modelProviderName: "Grok",
    modelProviderIcon: IMAGES.AI.XAI,
    models: [
      {
        id: "x-ai/grok-4.7",
        contextWindow: 500_000,
        name: "Grok 4.7",
        pricePerMillionTokens: "4,60 ₽",
        frontier: true,
      },
      {
        id: "x-ai/grok-4.6",
        contextWindow: 500_000,
        name: "Grok 4.6",
        pricePerMillionTokens: "4,60 ₽",
      },
      {
        id: "x-ai/grok-4.5",
        contextWindow: 500_000,
        name: "Grok 4.5",
        pricePerMillionTokens: "4,60 ₽",
      },
    ],
  },
  // GLM and Nemotron context windows and sample prices are based on the 2026-11-20 catalog.
  {
    provider: "z-ai",
    name: "Zhipu AI",
    icon: IMAGES.AI.GLM,
    modelProviderName: "GLM",
    modelProviderIcon: IMAGES.AI.GLM,
    models: [
      {
        id: "z-ai/glm-5.3",
        contextWindow: 1_048_576,
        name: "GLM 5.3",
        pricePerMillionTokens: "10 ₽",
        frontier: true,
      },
      {
        id: "z-ai/glm-5.3-flash",
        contextWindow: 1_048_576,
        name: "GLM 5.3 Flash",
        pricePerMillionTokens: "2 ₽",
      },
      {
        id: "z-ai/glm-5-turbo",
        contextWindow: 202_752,
        name: "GLM 5 Turbo",
        pricePerMillionTokens: "10 ₽",
      },
      {
        id: "z-ai/glm-5.2",
        contextWindow: 1_048_576,
        name: "GLM 5.2",
        pricePerMillionTokens: "15 ₽",
      },
    ],
  },
  {
    provider: "nvidia",
    name: "NVIDIA",
    icon: IMAGES.AI.NVIDIA,
    modelProviderName: "Nemotron",
    modelProviderIcon: IMAGES.AI.NVIDIA,
    models: [
      {
        id: "nvidia/nemotron-3-ultra",
        contextWindow: 1_000_000,
        name: "Nemotron 3 Ultra",
        pricePerMillionTokens: "0,01 ₽",
        frontier: true,
      },
      {
        id: "nvidia/nemotron-3.5-lightning",
        contextWindow: 262_144,
        name: "Nemotron 3.5 Lightning",
        pricePerMillionTokens: "0,01 ₽",
      },
      {
        id: "nvidia/nemotron-3.5-super-vl",
        contextWindow: 1_048_576,
        name: "Nemotron 3.5 Super VL",
        pricePerMillionTokens: "0,01 ₽",
      },
    ],
  },
];
