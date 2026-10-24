import { createHash } from "node:crypto";

export function hashKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}
