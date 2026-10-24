import type {
  SUBSCRIPTION_PLAN_IDS,
  SUBSCRIPTION_METHODS,
} from "../consts/subscriptions.const";

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLAN_IDS)[number];
export type SubscriptionMethod = (typeof SUBSCRIPTION_METHODS)[number];
export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  amount: number;
  credits: number;
  requestsPerMinute: number;
  concurrentRequests: number;
};
export type SubscriptionPeriodSummary = {
  id: string;
  planId: string;
  planName: string;
  mode: string;
  credits: string;
  remainingCredits: string;
  reservedCredits: string;
  startsAt: string;
  endsAt: string;
  requestsPerMinute: number;
  concurrentRequests: number;
};
export type SubscriptionOrderSummary = {
  id: string;
  planId: string;
  planName: string;
  amount: string;
  method: string;
  mode: string;
  status: string;
  createdAt: string;
  invoiceUrl: string | null;
};
export type SubscriptionOverview = {
  paymentModes: Record<SubscriptionMethod, "test" | "live" | null>;
  balance: string;
  current: SubscriptionPeriodSummary | null;
  upcoming: SubscriptionPeriodSummary[];
  testPeriods: SubscriptionPeriodSummary[];
  orders: SubscriptionOrderSummary[];
  plans: SubscriptionPlan[];
  running: number;
  recent: number;
};
export type ApiKeyFundingSettings = {
  useSubscription: boolean;
  allowBalanceFallback: boolean;
};
