import "./load-env.mjs";
import { BALANCE_LIMITS } from "../src/configs/consts/balance.const";
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { creditBalance } from "../src/lib/balance";

async function main() {
  const [clerkId, amountText, operationId, ...comment] = process.argv.slice(2);
  const note = comment.join(" ").trim();
  if (
    !clerkId?.startsWith("user_") ||
    !/^\d{1,7}(\.\d{1,8})?$/.test(amountText ?? "") ||
    !operationId ||
    operationId.length > BALANCE_LIMITS.OPERATION_ID_LENGTH ||
    !note ||
    note.length > BALANCE_LIMITS.NOTE_LENGTH
  ) {
    throw new Error(
      'Usage: npm run balance:credit -- user_CLERK_ID 1000 unique-operation-id "Payment comment"',
    );
  }
  const amount = new Prisma.Decimal(amountText);
  if (amount.lte(0) || amount.gt(BALANCE_LIMITS.MAX_CREDIT))
    throw new Error("Amount must be between 0 and 1,000,000 RUB");
  const credited = await creditBalance(clerkId, amount, operationId, note);
  console.log(
    credited
      ? `Credited ${amount.toFixed(2)} RUB to ${clerkId}`
      : "Already credited; no changes made",
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Prisma.PrismaClientKnownRequestError ||
        error instanceof Prisma.PrismaClientInitializationError
        ? "Database unavailable or operation conflict; no additional credit was applied"
        : error instanceof Error
          ? error.message
          : "Credit failed",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
