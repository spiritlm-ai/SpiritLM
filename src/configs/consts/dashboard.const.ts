export const DASHBOARD_WINDOW_HOURS = 48;
export const HOUR_MS = 3_600_000;
export const DASHBOARD_PERIOD_VALUES = ["2d", "7d", "30d", "all"] as const;
export const DASHBOARD_PERIOD_OPTIONS = [
  { value: "2d", label: "48 часов" },
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
  { value: "all", label: "Всё время" },
] as const;
export const DASHBOARD_HISTORY_LIMIT = 20;
export const DASHBOARD_POLL_MS = 60_000;
export const SUGGESTED_TOP_UP_AMOUNTS = [500, 1_000, 2_500, 5_000] as const;
