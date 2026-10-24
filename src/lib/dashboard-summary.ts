import type { User } from "@prisma/client";
import type { DashboardPeriod } from "@/configs/types/api.types";
import { dashboardSummary as execute } from "@/actions/dashboard-summary";
import { unwrapAction } from "./create-safe-action";

export async function dashboardSummary(
  user: Pick<User, "id" | "balance">,
  period: DashboardPeriod = "2d",
) {
  return unwrapAction(await execute({ userId: user.id, period }));
}
