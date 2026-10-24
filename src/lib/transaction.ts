import { Prisma } from "@prisma/client";
import { db } from "./db";
import { TRANSACTION_ATTEMPTS } from "@/configs/consts/database.const";

export async function serializableTransaction<T>(
  handler: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await db.$transaction(handler, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2034" ||
        attempt >= TRANSACTION_ATTEMPTS
      )
        throw error;
    }
  }
}
