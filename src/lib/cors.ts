import { ALLOWED_API_ORIGINS } from "@/configs/consts/site.const";

const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = [
  "authorization",
  "content-type",
  "x-api-key",
  "anthropic-version",
].join(", ");
const EXPOSED_HEADERS = "X-Request-Id";

export function corsOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  return origin && ALLOWED_API_ORIGINS.includes(origin) ? origin : null;
}

export function withCors(response: Response, origin: string | null): Response {
  if (!origin) return response;

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.append("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  response.headers.set("Access-Control-Expose-Headers", EXPOSED_HEADERS);
  response.headers.set("Access-Control-Max-Age", "600");
  return response;
}

export function corsPreflight(origin: string | null): Response {
  return withCors(new Response(null, { status: 204 }), origin);
}
