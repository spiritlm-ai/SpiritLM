import { z } from "zod";
import { dashboardUser } from "@/lib/dashboard-auth";
import { errorResponse, ApiError } from "@/lib/api-error";
import { createCryptoPayment, cryptoPaymentOverview } from "@/lib/crypto-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await dashboardUser();
    return Response.json(await cryptoPaymentOverview(user.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await dashboardUser(request);
    const parsed = z.object({
      amount: z.string().max(16),
      requestId: z.uuid(),
    }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(400, "invalid_payment", "Укажите корректную сумму пополнения");
    }
    const payment = await createCryptoPayment(user.id, parsed.data.amount, parsed.data.requestId);
    return Response.json({ payment }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
