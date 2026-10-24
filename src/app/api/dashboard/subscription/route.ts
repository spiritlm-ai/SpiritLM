import { dashboardUser } from "@/lib/dashboard-auth";
import { errorResponse } from "@/lib/api-error";
import { unwrapAction } from "@/lib/create-safe-action";
import { getSubscription } from "@/actions/get-subscription";
import { subscriptionOrderStatus } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await dashboardUser();
    const initial = unwrapAction(await getSubscription({ userId: user.id }));
    for (const order of initial.orders
      .filter((o) => ["CREATING", "PENDING"].includes(o.status))
      .slice(0, 3)) {
      try {
        await subscriptionOrderStatus(user.id, order.id);
      } catch {
        console.error("Subscription reconciliation pending", order.id);
      }
    }
    return Response.json(
      unwrapAction(await getSubscription({ userId: user.id })),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
