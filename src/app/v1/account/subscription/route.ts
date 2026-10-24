import { getSubscription } from "@/actions/get-subscription";
import { authenticateApiKey } from "@/lib/api-keys";
import { errorResponse } from "@/lib/api-error";
import { unwrapAction } from "@/lib/create-safe-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const key = await authenticateApiKey(request);
    const subscription = unwrapAction(await getSubscription({ userId: key.userId }));
    return Response.json({
      current: subscription.current,
      upcoming: subscription.upcoming,
      running: subscription.running,
      recent: subscription.recent,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
