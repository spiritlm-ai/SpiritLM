import "../../scripts/load-env.mjs";
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { db } from "../../src/lib/db";
import { authenticateApiKey } from "../../src/lib/api-keys";
import { ApiError } from "../../src/lib/api-error";

import { withBackendFixture } from "../helpers/backend-fixture";

after(() => db.$disconnect());

test("keys authenticate, stay hashed, and isolate users", async () =>
  withBackendFixture(async ({ other, key, authorized }) => {
    assert.equal((await authenticateApiKey(authorized())).id, key.id);
    const stored = await db.apiKey.findUniqueOrThrow({ where: { id: key.id } });
    assert.equal(stored.hash.length, 64);
    assert.ok(!JSON.stringify(stored).includes(key.secret));
    const changed = await db.apiKey.updateMany({
      where: { id: key.id, userId: other.id },
      data: { name: "Wrong owner" },
    });
    assert.equal(changed.count, 0);
    await assert.rejects(
      authenticateApiKey(new Request("https://spiritlm.example/v1/models")),
      (error: unknown) => error instanceof ApiError && error.status === 401,
    );
  }));

test("revoked key immediately loses access", async () =>
  withBackendFixture(async ({ key, authorized }) => {
    await db.apiKey.update({
      where: { id: key.id },
      data: { revokedAt: new Date() },
    });
    await assert.rejects(
      authenticateApiKey(authorized()),
      (error: unknown) => error instanceof ApiError && error.status === 401,
    );
  }));

test("concurrent key creation preserves the active-key limit", async () =>
  withBackendFixture(async ({ user }) => {
    const { issueKey } = await import("../../src/lib/api-keys");
    for (let index = 1; index < 19; index += 1)
      await issueKey(user.id, `Existing ${index}`);
    const results = await Promise.allSettled([
      issueKey(user.id, "Concurrent A"),
      issueKey(user.id, "Concurrent B"),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const rejected = results.find((result) => result.status === "rejected");
    assert.ok(
      rejected?.status === "rejected" &&
        rejected.reason instanceof ApiError &&
        rejected.reason.code === "key_limit",
    );
    assert.equal(
      await db.apiKey.count({ where: { userId: user.id, revokedAt: null } }),
      20,
    );
  }));
