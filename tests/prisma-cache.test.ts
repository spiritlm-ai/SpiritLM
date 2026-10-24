import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

test("development reload replaces a client cached before the YooKassa schema existed", async () => {
  const previousClient = new PrismaClient({
    adapter: new PrismaMariaDb({
      host: "localhost",
      user: "unused",
      password: "unused",
      database: "unused",
    }),
  });
  // Reproduce the shape of the client retained by Next.js before generation.
  const staleClient = new Proxy(previousClient, {
    get(target, key, receiver) {
      if (key === "yooKassaPayment") return undefined;
      return Reflect.get(target, key, receiver);
    },
  });
  const cache = globalThis as typeof globalThis & {
    prisma?: PrismaClient;
    prismaSchemaVersion?: string;
  };
  cache.prisma = staleClient;
  delete cache.prismaSchemaVersion;
  try {
    const { db } = await import("../src/lib/db");
    assert.notEqual(db, staleClient);
    assert.equal(typeof db.yooKassaPayment.findFirst, "function");
    assert.equal(cache.prisma, db);
    assert.equal(typeof cache.prismaSchemaVersion, "string");
    await db.$disconnect();
  } finally {
    await previousClient.$disconnect();
    delete cache.prisma;
    delete cache.prismaSchemaVersion;
  }
});
