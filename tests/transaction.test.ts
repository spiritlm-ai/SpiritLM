import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { serializableTransaction } from "../src/lib/transaction";

const originalTransaction = db.$transaction;
afterEach(() => {
  db.$transaction = originalTransaction;
});

const conflict = () =>
  new Prisma.PrismaClientKnownRequestError("Conflict", {
    code: "P2034",
    clientVersion: "7.8.0",
  });

test("serializable transactions retry conflicts with a three-attempt limit", async () => {
  let attempts = 0;
  db.$transaction = (async (
    _handler: unknown,
    options: { isolationLevel: string },
  ) => {
    assert.equal(options.isolationLevel, "Serializable");
    attempts += 1;
    if (attempts < 3) throw conflict();
    return "committed";
  }) as typeof db.$transaction;
  assert.equal(
    await serializableTransaction(async () => "committed"),
    "committed",
  );
  assert.equal(attempts, 3);
});

test("transaction conflicts stop after three attempts", async () => {
  let attempts = 0;
  db.$transaction = (async () => {
    attempts += 1;
    throw conflict();
  }) as typeof db.$transaction;
  await assert.rejects(
    serializableTransaction(async () => undefined),
    (error: unknown) =>
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034",
  );
  assert.equal(attempts, 3);
});

test("ordinary transaction failures are not retried", async () => {
  let attempts = 0;
  db.$transaction = (async () => {
    attempts += 1;
    throw new Error("failure");
  }) as typeof db.$transaction;
  await assert.rejects(
    serializableTransaction(async () => undefined),
    /failure/,
  );
  assert.equal(attempts, 1);
});
