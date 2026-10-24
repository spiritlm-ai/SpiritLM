import { z } from "zod";
import { dashboardUser } from "@/lib/dashboard-auth";
import { ApiError, errorResponse } from "@/lib/api-error";
import { createYooKassaPayment, yooKassaPaymentOverview } from "@/lib/yookassa-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await dashboardUser();
    return Response.json(await yooKassaPaymentOverview(user.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await dashboardUser(request);
    const input = z
      .object({ amount: z.string().max(16), requestId: z.uuid() })
      .safeParse(await request.json().catch(() => null));
    if (!input.success)
      throw new ApiError(400, "invalid_payment", "Укажите корректную сумму пополнения");
    const payment = await createYooKassaPayment(
      user.id,
      input.data.amount,
      input.data.requestId,
      new URL(request.url).origin,
    );
    return Response.json(
      { payment },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
