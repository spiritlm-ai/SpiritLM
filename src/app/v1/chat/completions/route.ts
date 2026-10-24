import { after } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { errorResponse } from "@/lib/api-error";
import { proxyChat, validateChat } from "@/lib/chat-proxy";
import { readJson } from "@/lib/request-body";
import { PROXY_LIMITS } from "@/configs/consts/proxy.const";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const key = await authenticateApiKey(request);
    const body = await readJson(request, PROXY_LIMITS.BODY_BYTES);
    validateChat(body);
    const result = await proxyChat(body, {
      userId: key.userId,
      apiKeyId: key.id,
      diagnostic: false,
      signal: request.signal,
    });
    after(() => result.completion);
    return result.response;
  } catch (error) {
    return errorResponse(error);
  }
}
