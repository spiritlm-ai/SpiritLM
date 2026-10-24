export const CHEAPVIBE_BASE_URL = "https://ru.cheapvibecode.ru/v1";

export const PROXY_LIMITS = {
  BODY_BYTES: 1_048_576,
  TIMEOUT_MS: 90_000,
  REQUESTS_PER_MINUTE: 20,
  CONCURRENT_REQUESTS: 1,
  ACTIVE_KEYS: 20,
} as const;

export const CHAT_ROLES = [
  "system",
  "developer",
  "user",
  "assistant",
  "tool",
  "function",
] as const;
export const TOKEN_LIMIT_FIELDS = [
  "max_tokens",
  "max_completion_tokens",
] as const;
export const MAX_USAGE_TOKENS = 2_147_483_647;
export const REQUEST_STALE_MS = 120_000;
export const RATE_WINDOW_MS = 60_000;
export const CATALOG_TIMEOUT_MS = 15_000;
export const CATALOG_CACHE_MS = 30_000;

export const FINAL_REQUEST_STATUSES = [
  "SUCCEEDED",
  "FAILED",
  "INTERRUPTED",
] as const;
export const UPSTREAM_CLIENT_ERROR_STATUSES: readonly number[] = [
  400, 404, 413, 422, 429,
];
