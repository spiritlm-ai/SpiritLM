export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({
      error: { message: error.message, type: "api_error", code: error.code },
    }, {
      status: error.status,
      headers: {
        "Cache-Control": "no-store",
        ...(error.status === 429 ? { "Retry-After": "60" } : {}),
      },
    });
  }

  // Never log raw database/fetch errors: they can contain connection secrets.
  console.error("SpiritLM request failed", error instanceof Error ? error.name : "UnknownError");
  return Response.json({
    error: { message: "Сервис временно недоступен", type: "api_error", code: "internal_error" },
  }, { status: 500, headers: { "Cache-Control": "no-store" } });
}
