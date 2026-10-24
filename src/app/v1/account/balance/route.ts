import { getApiAccount } from "@/actions/get-api-account";
import { authenticateApiKey } from "@/lib/api-keys";
import { errorResponse } from "@/lib/api-error";
import { unwrapAction } from "@/lib/create-safe-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const key = await authenticateApiKey(request);
    const account = unwrapAction(await getApiAccount({ userId: key.userId }));
    return Response.json({ balance: account.balance, currency: "RUB" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
