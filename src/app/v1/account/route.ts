import { clerkClient } from "@clerk/nextjs/server";
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
    const user = await (await clerkClient()).users.getUser(account.clerkId);
    return Response.json({
      id: account.id,
      name: user.fullName ?? user.username ?? null,
      username: user.username ?? null,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      created_at: account.createdAt,
      key: {
        name: key.name,
        masked: `${key.prefix}…`,
        use_subscription: key.useSubscription,
        allow_balance_fallback: key.allowBalanceFallback,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
