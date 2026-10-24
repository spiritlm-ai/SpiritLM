import { http } from "./http-client";
import { Prisma } from "@prisma/client";
import { beginApiRequest as beginRequest } from "@/actions/begin-api-request";
import { finishApiRequest as finishRequest } from "@/actions/finish-api-request";
import { unwrapAction } from "./create-safe-action";
import { ApiError } from "./api-error";
import { resolveModel, upstreamHeaders } from "./model-catalog";
import {
  CHEAPVIBE_BASE_URL,
  PROXY_LIMITS,
  CHAT_ROLES,
  TOKEN_LIMIT_FIELDS,
  MAX_USAGE_TOKENS,
  UPSTREAM_CLIENT_ERROR_STATUSES,
} from "@/configs/consts/proxy.const";

import type {
  Usage,
  ProxyContext,
  ProxyResult,
  FinalRequestStatus,
} from "@/configs/types/proxy.types";

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function tokenCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_USAGE_TOKENS
  );
}

export function parseUsage(value: unknown): Usage | null {
  const usage = object(value);
  if (
    !usage ||
    !tokenCount(usage.prompt_tokens) ||
    !tokenCount(usage.completion_tokens) ||
    !tokenCount(usage.total_tokens)
  ) {
    return null;
  }
  const inputDetails = object(usage.prompt_tokens_details);
  const outputDetails = object(usage.completion_tokens_details);
  const cached =
    inputDetails?.cached_tokens ??
    usage.cached_tokens ??
    usage.cache_read_input_tokens ??
    0;
  const reasoning =
    outputDetails?.reasoning_tokens ?? usage.completion_thinking_tokens ?? 0;
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    cachedTokens: tokenCount(cached) ? cached : 0,
    reasoningTokens: tokenCount(reasoning) ? reasoning : 0,
  };
}

export function validateChat(body: Record<string, unknown>) {
  if (typeof body.model !== "string" || body.model.length > 191) {
    throw new ApiError(400, "invalid_model", "Укажите модель");
  }
  if (
    !Array.isArray(body.messages) ||
    body.messages.length === 0 ||
    body.messages.length > 256
  ) {
    throw new ApiError(
      400,
      "invalid_messages",
      "Укажите от 1 до 256 сообщений",
    );
  }
  const roles = new Set<string>(CHAT_ROLES);
  if (
    body.messages.some((message) => {
      const item = object(message);
      return !item || typeof item.role !== "string" || !roles.has(item.role);
    })
  )
    throw new ApiError(
      400,
      "invalid_messages",
      "Некорректный формат сообщений",
    );
  if (body.stream !== undefined && typeof body.stream !== "boolean") {
    throw new ApiError(400, "invalid_stream", "stream должен быть boolean");
  }
  if (body.n !== undefined && body.n !== 1)
    throw new ApiError(400, "invalid_n", "Поддерживается только n = 1");
  for (const field of TOKEN_LIMIT_FIELDS) {
    const value = body[field];
    if (
      value !== undefined &&
      (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
    ) {
      throw new ApiError(
        400,
        "invalid_token_limit",
        `${field} должен быть положительным целым числом`,
      );
    }
  }
  if (
    body.max_tokens !== undefined &&
    body.max_completion_tokens !== undefined
  ) {
    throw new ApiError(
      400,
      "invalid_token_limit",
      "Укажите только один лимит выходных токенов",
    );
  }
}

export function validateModelTokenLimit(
  body: Record<string, unknown>,
  maxOutputTokens?: number,
) {
  if (maxOutputTokens === undefined) return;
  for (const field of TOKEN_LIMIT_FIELDS) {
    const value = body[field];
    if (typeof value === "number" && value > maxOutputTokens) {
      throw new ApiError(
        400,
        "invalid_token_limit",
        `Для выбранной модели ${field} не должен превышать ${maxOutputTokens} токенов`,
      );
    }
  }
}

function reservationForRequest(
  body: Record<string, unknown>,
  maxOutputTokens: number | undefined,
  pricePerMillion: string,
): string {
  const requestedOutputTokens = body.max_tokens ?? body.max_completion_tokens;
  const outputTokens =
    typeof requestedOutputTokens === "number"
      ? requestedOutputTokens
      : maxOutputTokens;
  if (outputTokens === undefined) {
    throw new ApiError(
      400,
      "max_tokens_required",
      "Укажите max_tokens: лимит модели неизвестен для расчёта резерва",
    );
  }

  const serializedBytes = Buffer.byteLength(JSON.stringify(body), "utf8");
  const messageCount = Array.isArray(body.messages) ? body.messages.length : 0;
  const inputTokenReserve = serializedBytes + messageCount * 64 + 128;
  return new Prisma.Decimal(pricePerMillion)
    .mul(inputTokenReserve + outputTokens)
    .div(1_000_000)
    .toDecimalPlaces(8, Prisma.Decimal.ROUND_CEIL)
    .toFixed();
}

export async function proxyChat(
  body: Record<string, unknown>,
  context: ProxyContext,
): Promise<ProxyResult> {
  validateChat(body);
  const model = await resolveModel(body.model as string);
  validateModelTokenLimit(body, model.maxOutputTokens);
  const reservation = context.diagnostic
    ? "0"
    : reservationForRequest(body, model.maxOutputTokens, model.price.toFixed());
  const headers = upstreamHeaders();
  const startedAt = Date.now();
  const record = unwrapAction(
    await beginRequest({
      userId: context.userId,
      apiKeyId: context.apiKeyId,
      diagnostic: context.diagnostic,
      model: model.id,
      upstreamModel: model.upstreamId,
      streaming: body.stream === true,
      price: model.price.toFixed(),
      reservation,
    }),
  );

  const controller = new AbortController();
  const abort = () => controller.abort();
  context.signal?.addEventListener("abort", abort, { once: true });
  if (context.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, PROXY_LIMITS.TIMEOUT_MS);
  let usage: Usage | null = null;
  const finish = async (status: FinalRequestStatus, httpStatus?: number) => {
    clearTimeout(timer);
    context.signal?.removeEventListener("abort", abort);
    unwrapAction(
      await finishRequest({
        id: record.id,
        status,
        httpStatus,
        durationMs: Date.now() - startedAt,
        usage,
      }),
    );
  };
  const payload: Record<string, unknown> = { ...body, model: model.upstreamId };
  // Keep attribution and provider routing under server control.
  delete payload.user;
  delete payload.service_tier;
  if (body.stream === true) payload.stream_options = { include_usage: true };

  let upstream: Response;
  try {
    upstream = await http(`${CHEAPVIBE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    await finish(controller.signal.aborted ? "INTERRUPTED" : "FAILED");
    throw new ApiError(
      controller.signal.aborted ? 504 : 502,
      "upstream_unavailable",
      "Не удалось получить ответ модели",
    );
  }
  if (!upstream.ok) {
    await upstream.body?.cancel();
    await finish("FAILED", upstream.status);
    const status = UPSTREAM_CLIENT_ERROR_STATUSES.includes(upstream.status)
      ? upstream.status
      : 502;
    throw new ApiError(
      status,
      "upstream_error",
      "Модель не выполнила запрос. Проверьте параметры или повторите позже",
    );
  }
  if (body.stream !== true) {
    try {
      const result = object(await upstream.json());
      if (!result || !Array.isArray(result.choices) || result.error)
        throw new Error();
      usage = parseUsage(result.usage);
      result.model = body.model;
      await finish("SUCCEEDED", upstream.status);
      return {
        response: Response.json(result, {
          headers: { "Cache-Control": "no-store", "X-Request-Id": record.id },
        }),
        completion: Promise.resolve(),
      };
    } catch {
      await finish(
        controller.signal.aborted ? "INTERRUPTED" : "FAILED",
        upstream.status,
      );
      throw new ApiError(
        502,
        "invalid_upstream_response",
        "Не удалось прочитать ответ модели",
      );
    }
  }

  if (
    !upstream.body ||
    !upstream.headers.get("content-type")?.includes("text/event-stream")
  ) {
    await upstream.body?.cancel();
    await finish("FAILED", upstream.status);
    throw new ApiError(
      502,
      "invalid_upstream_response",
      "Модель не вернула потоковый ответ",
    );
  }
  const reader = upstream.body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let complete!: () => void;
  const completion = new Promise<void>((resolve) => {
    complete = resolve;
  });
  let pending = "";
  let done = false;
  let finalized = false;
  let cancelled = false;
  const settle = async (status: FinalRequestStatus) => {
    if (finalized) return;
    finalized = true;
    controller.signal.removeEventListener("abort", handleStreamAbort);
    try {
      await finish(status, upstream.status);
    } catch {
      console.error("Could not finalize SpiritLM usage", record.id);
    } finally {
      complete();
    }
  };
  const handleStreamAbort = () => {
    void reader
      .cancel()
      .catch(() => {})
      .then(() => settle("INTERRUPTED"));
  };
  controller.signal.addEventListener("abort", handleStreamAbort, {
    once: true,
  });
  if (controller.signal.aborted) handleStreamAbort();
  const stream = new ReadableStream<Uint8Array>({
    async pull(output) {
      try {
        // Pull only as the client reads, retaining backpressure.
        while (true) {
          const boundary = pending.indexOf("\n\n");
          if (boundary >= 0) {
            const frame = pending.slice(0, boundary);
            pending = pending.slice(boundary + 2);
            const data = frame
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trimStart())
              .join("\n");
            if (!data) continue;
            if (data === "[DONE]") {
              done = true;
              await reader.cancel();
              await settle("SUCCEEDED");
              output.enqueue(encoder.encode("data: [DONE]\n\n"));
              output.close();
              return;
            }
            const chunk = object(JSON.parse(data));
            if (!chunk || chunk.error) throw new Error();
            const parsed = parseUsage(chunk.usage);
            if (parsed) usage = parsed;
            if (chunk.model) chunk.model = body.model;
            output.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
            );
            return;
          }
          const part = await reader.read();
          if (part.done) {
            await settle(done ? "SUCCEEDED" : "INTERRUPTED");
            output.error(new Error("Поток модели оборван"));
            return;
          }
          pending = (
            pending + decoder.decode(part.value, { stream: true })
          ).replace(/\r\n/g, "\n");
          if (pending.length > PROXY_LIMITS.BODY_BYTES) throw new Error();
        }
      } catch {
        const aborted = controller.signal.aborted;
        controller.signal.removeEventListener("abort", handleStreamAbort);
        controller.abort();
        await reader.cancel().catch(() => {});
        await settle(aborted ? "INTERRUPTED" : "FAILED");
        if (!cancelled) {
          output.enqueue(
            encoder.encode(
              'data: {"error":{"message":"Поток модели прерван","type":"api_error","code":"stream_interrupted"}}\n\n',
            ),
          );
          output.close();
        }
      }
    },
    async cancel() {
      cancelled = true;
      controller.abort();
      await reader.cancel().catch(() => {});
      await settle("INTERRUPTED");
    },
  });
  return {
    response: new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
        "X-Request-Id": record.id,
      },
    }),
    completion,
  };
}
