import {
  SUBSCRIPTION_PLAN_IDS,
  SUBSCRIPTION_METHODS,
} from "@/configs/consts/subscriptions.const";
import { z } from "zod";
import { dashboardUser } from "@/lib/dashboard-auth";
import { ApiError, errorResponse } from "@/lib/api-error";
import { checkoutSubscription } from "@/lib/subscriptions";
import { readJson } from "@/lib/request-body";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await dashboardUser(request);
    const parsed = z
      .object({
        planId: z.enum(SUBSCRIPTION_PLAN_IDS),
        method: z.enum(SUBSCRIPTION_METHODS),
        requestId: z.uuid(),
      })
      .safeParse(await readJson(request, 2048));
    if (!parsed.success)
      throw new ApiError(
        400,
        "invalid_subscription",
        "Выберите тариф и способ оплаты",
      );
    const order = await checkoutSubscription(
      user.id,
      parsed.data.planId,
      parsed.data.method,
      parsed.data.requestId,
      new URL(request.url).origin,
    );
    return Response.json(
      { order },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
