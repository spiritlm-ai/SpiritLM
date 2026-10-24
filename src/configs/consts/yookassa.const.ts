export const YOOKASSA = {
  BASE_URL: "https://api.yookassa.ru/v3/",
  // Stay below the provider's 24-hour idempotency retention window.
  CREATE_RECOVERY_MS: 23 * 60 * 60 * 1000,
  INVOICE_LIFETIME_MS: 10 * 60 * 1000,
  DESCRIPTION: "Тестовое пополнение SpiritLM банковской картой",
  LEGACY_SBP_DESCRIPTION: "Тестовое пополнение SpiritLM через СБП",
  TRANSPORT_ERROR_CODES: [
    "ENOTFOUND",
    "EAI_AGAIN",
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_SOCKET",
    "CERT_HAS_EXPIRED",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  ],
} as const;
