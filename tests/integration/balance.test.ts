import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../../src/lib/db";
import { creditBalance } from "../../src/lib/balance";

import { withBackendFixture } from "../helpers/backend-fixture";

after(() => db.$disconnect());

test("credits are atomic, exact and idempotent under concurrency", async () =>
  withBackendFixture(async ({ prefix, user }) => {
    const operation = `test-${randomUUID()}`;
    const results = await Promise.all([
      creditBalance(
        prefix,
        new Prisma.Decimal("10.00000001"),
        operation,
        "Integration credit",
      ),
      creditBalance(
        prefix,
        new Prisma.Decimal("10.00000001"),
        operation,
        "Integration credit",
      ),
    ]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(
      (
        await db.user.findUniqueOrThrow({ where: { id: user.id } })
      ).balance.toFixed(8),
      "10.00000001",
    );
    await assert.rejects(
      creditBalance(
        prefix,
        new Prisma.Decimal("20"),
        operation,
        "Integration credit",
      ),
    );
    assert.equal(
      await db.balanceEntry.count({ where: { userId: user.id } }),
      1,
    );
  }));
