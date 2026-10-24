import { dashboardUser } from "@/lib/dashboard-auth";
import { errorResponse } from "@/lib/api-error";
import {
  subscriptionOrderStatus,
  cancelSubscriptionOrder,
} from "@/lib/subscriptions";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: Context) {
  try {
    const user = await dashboardUser();
    const { id } = await context.params;
    return Response.json(
      { order: await subscriptionOrderStatus(user.id, id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await dashboardUser(request);
    const { id } = await context.params;
    return Response.json(
      { order: await cancelSubscriptionOrder(user.id, id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
