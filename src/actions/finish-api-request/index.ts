// Internal server operation; do not expose as a client-callable Server Action.
import { createSafeAction } from "@/lib/create-safe-action";
import { InputSchema } from "./schema";
import type { InputType, ReturnType } from "./types";
import { Prisma } from "@prisma/client";
import {
  requestReserve,
  refundRequestReserve,
} from "@/actions/request-accounting/transaction";
import { serializableTransaction } from "@/lib/transaction";

const handler = async (data: InputType): Promise<ReturnType> => {
  const finalized = await serializableTransaction(async (tx) => {
    const request = await tx.apiRequest.findFirst({
      where: { id: data.id, status: "RUNNING" },
    });
    if (!request) return false;

    const reservedCost = await requestReserve(tx, request);

    const estimatedCost = data.usage
      ? request.pricePerMillion
          .mul(data.usage.totalTokens)
          .div(1_000_000)
          .toDecimalPlaces(8, Prisma.Decimal.ROUND_HALF_UP)
      : null;
    const failedBeforeSuccessfulResponse =
      data.status === "FAILED" &&
      (data.httpStatus === undefined ||
        data.httpStatus < 200 ||
        data.httpStatus >= 300);
    const chargedCost = request.diagnostic
      ? new Prisma.Decimal(0)
      : (estimatedCost ??
        (failedBeforeSuccessfulResponse
          ? new Prisma.Decimal(0)
          : reservedCost));
    const boundedCharge = Prisma.Decimal.min(chargedCost, reservedCost);
    const refund = reservedCost.sub(boundedCharge);

    const result = await tx.apiRequest.updateMany({
      where: { id: request.id, status: "RUNNING" },
      data: {
        status: data.status,
        httpStatus: data.httpStatus,
        durationMs: data.durationMs,
        estimatedCost,
        chargedCost: boundedCharge,
        finishedAt: new Date(),
        usageKnown: data.usage !== null,
        ...(data.usage ?? {}),
      },
    });
    if (!result.count) return false;

    if (refund.gt(0)) {
      await refundRequestReserve(tx, request, refund);
    } else if (
      request.paymentSource === "BALANCE" &&
      !request.diagnostic &&
      reservedCost.gt(0)
    ) {
      await tx.balanceEntry.updateMany({
        where: {
          operationId: `api-request:${request.id}:reserve`,
        },
        data: { note: `Списание за запрос ${request.id}` },
      });
    }
    return true;
  });
  return { data: finalized };
};

export const finishApiRequest = createSafeAction(InputSchema, handler);
