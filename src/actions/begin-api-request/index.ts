// Internal server operation; do not expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { subscriptionAllowsModel } from "@/configs/consts/subscriptions.const";
import { finalizeStaleRequests } from "@/actions/request-accounting/transaction";
import { Prisma, type FundingSource } from "@prisma/client";
import { serializableTransaction } from "@/lib/transaction";
import { ApiError } from "@/lib/api-error";
import { PROXY_LIMITS, RATE_WINDOW_MS } from "@/configs/consts/proxy.const";
const handler = async (data: InputType): Promise<ReturnType> => {
  const context = data;
  const reservation = new Prisma.Decimal(data.reservation);
  if (reservation.isNegative() || (!context.diagnostic && reservation.isZero()))
    throw new ApiError(400, "invalid_reservation", "Некорректный резерв");

  const record = await serializableTransaction(async (tx) => {
    // A terminated function cannot report final usage. Retain its original reserve.
    await finalizeStaleRequests(tx, context.userId);
    const now = new Date();
    const key = context.apiKeyId
      ? await tx.apiKey.findFirst({
          where: {
            id: context.apiKeyId,
            userId: context.userId,
            revokedAt: null,
          },
        })
      : null;
    if (context.apiKeyId && !key)
      throw new ApiError(401, "invalid_api_key", "Ключ отозван");
    const period =
      !context.diagnostic && key?.useSubscription
        ? await tx.subscriptionPeriod.findFirst({
            where: {
              userId: context.userId,
              mode: "live",
              startsAt: { lte: now },
              endsAt: { gt: now },
            },
            orderBy: { startsAt: "desc" },
          })
        : null;
    let paymentSource: FundingSource = context.diagnostic
      ? "DIAGNOSTIC"
      : "BALANCE";
    if (!context.diagnostic && key?.useSubscription) {
      const error = !period
        ? new ApiError(402, "subscription_inactive", "Нет действующей подписки")
        : !subscriptionAllowsModel(period.planId, data.model)
          ? new ApiError(
              403,
              "subscription_model_unavailable",
              "Модель недоступна на вашем тарифе",
            )
          : period.remainingCredits.lt(reservation)
            ? new ApiError(
                402,
                "insufficient_subscription_credits",
                "Недостаточно кредитов для резерва запроса. Уменьшите max_tokens или используйте API-баланс",
              )
            : null;
      if (!error) paymentSource = "SUBSCRIPTION";
      else if (!key.allowBalanceFallback) throw error;
    }
    const sourceWhere =
      paymentSource === "SUBSCRIPTION"
        ? { paymentSource: "SUBSCRIPTION" as const }
        : { paymentSource: { not: "SUBSCRIPTION" as const } };
    const recent = await tx.apiRequest.count({
      where: {
        userId: context.userId,
        ...sourceWhere,
        createdAt: { gte: new Date(now.getTime() - RATE_WINDOW_MS) },
      },
    });
    const running = await tx.apiRequest.count({
      where: { userId: context.userId, ...sourceWhere, status: "RUNNING" },
    });
    const rpm =
      paymentSource === "SUBSCRIPTION"
        ? period!.requestsPerMinute
        : PROXY_LIMITS.REQUESTS_PER_MINUTE;
    const concurrent =
      paymentSource === "SUBSCRIPTION"
        ? period!.concurrentRequests
        : PROXY_LIMITS.CONCURRENT_REQUESTS;
    if (recent >= rpm || running >= concurrent) {
      throw new ApiError(
        429,
        "rate_limit_exceeded",
        "Слишком много запросов. Повторите позже",
      );
    }
    if (key)
      await tx.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: now },
      });
    const request = await tx.apiRequest.create({
      data: {
        userId: context.userId,
        apiKeyId: context.apiKeyId,
        model: data.model,
        upstreamModel: data.upstreamModel,
        status: "RUNNING",
        streaming: data.streaming,
        diagnostic: context.diagnostic,
        paymentSource,
        subscriptionPeriodId:
          paymentSource === "SUBSCRIPTION" ? period!.id : null,
        reservedCost: reservation,
        pricePerMillion: new Prisma.Decimal(data.price),
      },
    });
    if (paymentSource === "SUBSCRIPTION") {
      await tx.subscriptionPeriod.update({
        where: { id: period!.id },
        data: { remainingCredits: { decrement: reservation } },
      });
      await tx.subscriptionEntry.create({
        data: {
          periodId: period!.id,
          operationId: `api-request:${request.id}:reserve`,
          amount: reservation.negated(),
        },
      });
    } else if (!context.diagnostic) {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: context.userId },
        select: { balance: true },
      });
      if (user.balance.lt(reservation)) {
        throw new ApiError(
          402,
          "insufficient_balance",
          "Недостаточно средств для резерва запроса",
        );
      }
      await tx.user.update({
        where: { id: context.userId },
        data: { balance: { decrement: reservation } },
      });
      await tx.balanceEntry.create({
        data: {
          userId: context.userId,
          operationId: `api-request:${request.id}:reserve`,
          amount: reservation.negated(),
          note: `Резерв запроса ${request.id}`,
        },
      });
    }
    return request;
  });
  return { data: record };
};

export const beginApiRequest = createSafeAction(InputSchema, handler);
