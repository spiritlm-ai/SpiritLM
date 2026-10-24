import { handleCompatibilityRequest } from "@/lib/compatibility-api";

export const runtime = "nodejs";
export const maxDuration = 120;

export function POST(request: Request) {
  return handleCompatibilityRequest(request, "anthropic");
}
