import { dashboardUser } from "@/lib/dashboard-auth";
import { errorResponse } from "@/lib/api-error";
import { cancelCryptoPaymentForUser, cryptoPaymentOverview } from "@/lib/crypto-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await dashboardUser(request);
    const { id } = await context.params;
    return Response.json(await cryptoPaymentOverview(user.id, id, true), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await dashboardUser(request);
    const { id } = await context.params;
    const payment = await cancelCryptoPaymentForUser(user.id, id);
    return Response.json({ payment }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
