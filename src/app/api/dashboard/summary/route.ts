import { dashboardUser } from "@/lib/dashboard-auth";
import { dashboardSummary } from "@/lib/dashboard-summary";
import { errorResponse } from "@/lib/api-error";
import { DASHBOARD_PERIOD_VALUES } from "@/configs/consts/dashboard.const";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await dashboardUser();
    const requestedPeriod = new URL(request.url).searchParams.get("period") ?? "2d";
    const period = DASHBOARD_PERIOD_VALUES.find(
      (value) => value === requestedPeriod,
    );
    if (!period) {
      return Response.json(
        { error: { message: "Недопустимый период статистики" } },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(await dashboardSummary(user, period), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
