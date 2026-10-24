import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { createSafeAction, unwrapAction } from "../src/lib/create-safe-action";
import { ApiError } from "../src/lib/api-error";

test("invalid action input never reaches its handler", async () => {
  let called = false;
  const action = createSafeAction(
    z.object({ name: z.string().min(1) }),
    async () => {
      called = true;
      return { data: true };
    },
  );
  const result = await action({ name: "" });
  assert.equal(called, false);
  assert.ok(result.fieldErrors?.name?.length);
  assert.throws(
    () => unwrapAction(result),
    (error: unknown) => error instanceof ApiError && error.status === 400,
  );
});

test("action preserves API errors and hides unexpected database details", async () => {
  const schema = z.object({});
  const denied = createSafeAction(schema, async () => {
    throw new ApiError(401, "unauthorized", "Войдите в аккаунт");
  });
  assert.deepEqual(await denied({}), {
    error: "Войдите в аккаунт",
    status: 401,
    code: "unauthorized",
  });
  const failed = createSafeAction(schema, async () => {
    throw new Error("mysql://private-credentials");
  });
  const result = await failed({});
  assert.equal(result.status, 500);
  assert.ok(!JSON.stringify(result).includes("private-credentials"));
});

test("action unwrapping preserves falsy successful results", async () => {
  const action = createSafeAction(z.object({}), async () => ({ data: false }));
  assert.equal(unwrapAction(await action({})), false);
});
