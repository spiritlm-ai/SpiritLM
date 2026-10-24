export const PATHS = {
  HOME: "/",
  API: {
    DASHBOARD: {
      SUBSCRIPTION: "/api/dashboard/subscription",
      SUBSCRIPTION_CHECKOUT: "/api/dashboard/subscription/checkout",
      SUBSCRIPTION_ORDER: (id: string) =>
        `/api/dashboard/subscription/orders/${encodeURIComponent(id)}`,
      SUMMARY: "/api/dashboard/summary",
      KEYS: "/api/dashboard/keys",
      YOOKASSA_PAYMENTS: "/api/dashboard/payments/yookassa",
      YOOKASSA_PAYMENT: (id: string) =>
        `/api/dashboard/payments/yookassa/${encodeURIComponent(id)}`,
      PAYMENTS: "/api/dashboard/payments",
      PAYMENT: (id: string) =>
        `/api/dashboard/payments/${encodeURIComponent(id)}`,
      KEY: (id: string) => `/api/dashboard/keys/${encodeURIComponent(id)}`,
    },
  },
  DASHBOARD: {
    ROOT: "/dashboard",
    MODELS: "/dashboard/models",
    SUBSCRIPTION: "/dashboard/subscription",
    DOCS: "/dashboard/docs",
    KEYS: "/dashboard/keys",
  },
  DOCS: {
    SPIRITCODE: "#spiritcode",
    CONNECTION: "#connection",
    MODELS: "#models",
    CHAT: "#chat",
    STREAM: "#stream",
    SDK: "#sdk",
    LIMITS: "#limits",
    ERRORS: "#errors",
    CLAUDE_CODE: "#claude-code",
    CODEX: "#codex",
    CURSOR: "#cursor",
    HERMES: "#hermes",
    KIMI_CODE: "#kimi-code",
    OPENCODE: "#opencode",
    VSCODE: "#vscode",
    TROUBLESHOOTING: "#troubleshooting",
  },
} as const;
