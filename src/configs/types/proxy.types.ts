import type { FINAL_REQUEST_STATUSES } from "@/configs/consts/proxy.const";

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
};

export type ProxyContext = {
  userId: string;
  apiKeyId?: string;
  diagnostic: boolean;
  signal?: AbortSignal;
};

export type ProxyResult = { response: Response; completion: Promise<void> };
export type FinalRequestStatus = (typeof FINAL_REQUEST_STATUSES)[number];
