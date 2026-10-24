import type {
  SubscriptionPlan,
  SubscriptionPlanId,
} from "../types/subscriptions.types";

export const SUBSCRIPTION_PLAN_IDS = ["nova", "vega", "sirius"] as const;
export const SUBSCRIPTION_METHODS = ["balance", "card", "cryptobot"] as const;

export const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
export const SUBSCRIPTION_POLL_MS = 15_000;
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> =
  {
    nova: {
      id: "nova",
      name: "Nova",
      amount: 390,
      credits: 645,
      requestsPerMinute: 10,
      concurrentRequests: 2,
    },
    vega: {
      id: "vega",
      name: "Vega",
      amount: 990,
      credits: 1800,
      requestsPerMinute: 30,
      concurrentRequests: 5,
    },
    sirius: {
      id: "sirius",
      name: "Sirius",
      amount: 1990,
      credits: 3750,
      requestsPerMinute: 60,
      concurrentRequests: 8,
    },
  };
export const NOVA_EXCLUDED_MODELS: readonly string[] = [
  "openai/gpt-6-astra",
  "anthropic/claude-fable-5",
  "anthropic/claude-fable-5.1",
];
export function subscriptionAllowsModel(
  planId: string,
  model: string,
): boolean {
  return planId !== "nova" || !NOVA_EXCLUDED_MODELS.includes(model);
}
