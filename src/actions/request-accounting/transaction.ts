import { REQUEST_STALE_MS } from "@/configs/consts/proxy.const";
import { Prisma, type ApiRequest } from "@prisma/client";

export async function requestReserve(
  tx: Prisma.TransactionClient,
  request: ApiRequest,
) {
  if (request.diagnostic) return new Prisma.Decimal(0);
  if (request.paymentSource === "SUBSCRIPTION") return request.reservedCost;
  const entry = await tx.balanceEntry.findUnique({
    where: { operationId: `api-request:${request.id}:reserve` },
    select: { amount: true },
  });
  return entry?.amount.negated() ?? new Prisma.Decimal(0);
}

export async function refundRequestReserve(
  tx: Prisma.TransactionClient,
  request: ApiRequest,
  refund: Prisma.Decimal,
) {
  const operationId = `api-request:${request.id}:settlement`;
  if (
    request.paymentSource === "SUBSCRIPTION" &&
    request.subscriptionPeriodId
  ) {
    await tx.subscriptionPeriod.update({
      where: { id: request.subscriptionPeriodId },
      data: { remainingCredits: { increment: refund } },
    });
    await tx.subscriptionEntry.create({
      data: {
        periodId: request.subscriptionPeriodId,
        operationId,
        amount: refund,
      },
    });
  } else {
    await tx.user.update({
      where: { id: request.userId },
      data: { balance: { increment: refund } },
    });
    await tx.balanceEntry.create({
      data: {
        userId: request.userId,
        operationId,
        amount: refund,
        note: `Возврат остатка резерва ${request.id}`,
      },
    });
  }
}

export async function finalizeStaleRequests(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const requests = await tx.apiRequest.findMany({
    where: {
      userId,
      status: "RUNNING",
      createdAt: { lt: new Date(Date.now() - REQUEST_STALE_MS) },
    },
  });
  for (const request of requests) {
    const reservedCost = await requestReserve(tx, request);
    await tx.apiRequest.updateMany({
      where: { id: request.id, status: "RUNNING" },
      data: {
        status: "INTERRUPTED",
        finishedAt: new Date(),
        chargedCost: reservedCost,
      },
    });
    if (request.paymentSource === "BALANCE" && reservedCost.gt(0)) {
      await tx.balanceEntry.updateMany({
        where: { operationId: `api-request:${request.id}:reserve` },
        data: { note: `Списание резерва запроса ${request.id}` },
      });
    }
  }
}
