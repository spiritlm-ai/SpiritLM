import { API_KEY_CONFIG } from "@/configs/consts/api-keys.const";
import { authenticateApiKey as authenticate } from "@/actions/authenticate-api-key";
import { issueApiKey as issue } from "@/actions/issue-api-key";
import { unwrapAction } from "./create-safe-action";
import { ApiError } from "./api-error";

export async function authenticateApiKey(request: Request) {
  const header = request.headers.get("authorization");
  const bearer = header?.match(
    /^Bearer (sk-spiritlm-[A-Za-z0-9_-]{43})$/i,
  )?.[1];
  const apiKey = request.headers
    .get("x-api-key")
    ?.match(/^(sk-spiritlm-[A-Za-z0-9_-]{43})$/)?.[1];
  const secret = bearer ?? apiKey;
  if (!secret)
    throw new ApiError(401, "invalid_api_key", "Неверный API-ключ SpiritLM");

  return unwrapAction(await authenticate({ secret }));
}

export function keyName(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > API_KEY_CONFIG.NAME_LENGTH
  ) {
    throw new ApiError(
      400,
      "invalid_name",
      "Название должно содержать от 1 до 48 символов",
    );
  }
  return value.trim();
}

export async function issueKey(
  userId: string,
  name: string,
  settings: Partial<
    import("@/configs/types/subscriptions.types").ApiKeyFundingSettings
  > = {},
) {
  return unwrapAction(await issue({ userId, name, ...settings }));
}
