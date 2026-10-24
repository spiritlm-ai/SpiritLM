import { API_KEY_CONFIG } from "@/configs/consts/api-keys.const";
import { createApiKey as createKey } from "@/actions/create-api-key";
import { listApiKeys as listKeys } from "@/actions/list-api-keys";
import { unwrapAction } from "@/lib/create-safe-action";
import { dashboardUser } from "@/lib/dashboard-auth";
import { keyName } from "@/lib/api-keys";
import { errorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(
      { keys: unwrapAction(await listKeys({})) },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await dashboardUser(request);
    const body = await readJson(request, API_KEY_CONFIG.BODY_BYTES);
    return Response.json(
      unwrapAction(
        await createKey({
          name: keyName(body.name),
          useSubscription: body.useSubscription as boolean | undefined,
          allowBalanceFallback: body.allowBalanceFallback as
            boolean | undefined,
        }),
      ),
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
