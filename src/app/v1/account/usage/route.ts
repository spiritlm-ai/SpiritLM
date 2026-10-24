import { dashboardSummary } from "@/actions/dashboard-summary";
import { DASHBOARD_PERIOD_VALUES } from "@/configs/consts/dashboard.const";
import { authenticateApiKey } from "@/lib/api-keys";
import { ApiError, errorResponse } from "@/lib/api-error";
import { unwrapAction } from "@/lib/create-safe-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const key = await authenticateApiKey(request);
    const value = new URL(request.url).searchParams.get("period") ?? "2d";
    const period = DASHBOARD_PERIOD_VALUES.find((item) => item === value);
    if (!period) {
      throw new ApiError(400, "invalid_period", "Период: 2d, 7d, 30d или all");
    }
    const summary = unwrapAction(await dashboardSummary({ userId: key.userId, period }));
    return Response.json({
      period,
      currency: "RUB",
      cost: summary.cost,
      subscription_credits_used: summary.subscriptionCreditsUsed,
      requests: summary.requestCount,
      unknown_usage_count: summary.unknownUsageCount,
      // A partial known-token sum is explicit, never presented as complete usage.
      known_tokens: summary.tokens,
      total_tokens: summary.unknownUsageCount ? null : summary.tokens,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
