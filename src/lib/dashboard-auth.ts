import "server-only";
import { auth } from "@clerk/nextjs/server";
import { ensureUser as execute } from "@/actions/ensure-user";
import { unwrapAction } from "./create-safe-action";
import { ApiError } from "./api-error";

export async function dashboardUser(request?: Request) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) {
    throw new ApiError(401, "unauthorized", "Войдите в аккаунт");
  }

  if (request && !["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
      throw new ApiError(
        403,
        "invalid_origin",
        "Недопустимый источник запроса",
      );
    }
  }

  return unwrapAction(await execute({ clerkId: session.userId }));
}
