import type { FundingSource } from "@prisma/client";
import type { DASHBOARD_PERIOD_VALUES } from "@/configs/consts/dashboard.const";

export type DashboardPeriod = (typeof DASHBOARD_PERIOD_VALUES)[number];

export type ApiKeySummary = {
  id: string;
  name: string;
  prefix: string;
  useSubscription: boolean;
  allowBalanceFallback: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  requests: number;
  spent: string;
  subscriptionCreditsUsed: string;
};

export type DashboardSummary = {
  balance: string;
  spent: string;
  subscriptionCreditsUsed: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  requestCount: number;
  unknownUsageCount: number;
  cost: string;
  usage: { time: string; tokens: number }[];
  models: { model: string; requests: number; tokens: number }[];
  credits: { id: string; amount: string; note: string; createdAt: string }[];
  requests: {
    id: string;
    model: string;
    createdAt: string;
    totalTokens: number | null;
    chargedCost: string;
    paymentSource: FundingSource;
    status: string;
    diagnostic: boolean;
  }[];
};

export type ApiErrorEnvelope = { error?: { message?: unknown } };

export type IssuedApiKey = {
  id: string;
  name: string;
  prefix: string;
  useSubscription: boolean;
  allowBalanceFallback: boolean;
  createdAt: string;
  secret: string;
};

export type ApiKeyRouteContext = { params: Promise<{ id: string }> };
