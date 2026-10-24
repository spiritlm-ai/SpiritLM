import { ApiError } from "./api-error";

export async function readJson(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError(415, "invalid_content_type", "Используйте application/json");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "invalid_json", "Пустое тело запроса");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, "body_too_large", "Слишком большой запрос");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "invalid_json", "Некорректный JSON");
  }
}
