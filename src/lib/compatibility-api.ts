import { after } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { errorResponse, ApiError } from "@/lib/api-error";
import { proxyChat, validateChat } from "@/lib/chat-proxy";
import { readJson } from "@/lib/request-body";
import { PROXY_LIMITS } from "@/configs/consts/proxy.const";

type Protocol = "anthropic" | "responses";
type JsonObject = Record<string, unknown>;

function record(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function textContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.flatMap((part) => {
    const item = record(part);
    return item && (item.type === "text" || item.type === "input_text") && typeof item.text === "string"
      ? [item.text]
      : [];
  }).join("");
}

export function chatRequest(body: JsonObject, protocol: Protocol): JsonObject {
  if (typeof body.model !== "string" || !body.model) {
    throw new ApiError(400, "invalid_model", "Укажите модель");
  }
  if (protocol === "anthropic") {
    if (!Array.isArray(body.messages) || !body.messages.length) {
      throw new ApiError(400, "invalid_messages", "Укажите сообщения");
    }
    const messages: JsonObject[] = [];
    if (typeof body.system === "string") messages.push({ role: "system", content: body.system });
    else if (body.system !== undefined) messages.push({ role: "system", content: textContent(body.system) });
    for (const value of body.messages) {
      const item = record(value);
      if (!item || (item.role !== "user" && item.role !== "assistant")) {
        throw new ApiError(400, "invalid_messages", "Некорректный формат сообщений");
      }
      const parts = Array.isArray(item.content) ? item.content : null;
      const toolResults = parts?.flatMap((part) => {
        const block = record(part);
        return block?.type === "tool_result" && typeof block.tool_use_id === "string"
          ? [{ role: "tool", tool_call_id: block.tool_use_id, content: textContent(block.content) }]
          : [];
      }) ?? [];
      const toolUses = parts?.flatMap((part) => {
        const block = record(part);
        return block?.type === "tool_use" && typeof block.id === "string" && typeof block.name === "string"
          ? [{ id: block.id, type: "function", function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) } }]
          : [];
      }) ?? [];
      if (toolResults.length) messages.push(...toolResults);
      else messages.push({
        role: item.role,
        content: textContent(item.content),
        ...(toolUses.length ? { tool_calls: toolUses } : {}),
      });
    }
    const tools = Array.isArray(body.tools) ? body.tools.map((value) => {
      const tool = record(value);
      return tool ? { type: "function", function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema ?? { type: "object", properties: {} },
      } } : value;
    }) : undefined;
    const choice = record(body.tool_choice);
    const toolChoice = choice?.type === "auto"
      ? "auto"
      : choice?.type === "any"
        ? "required"
        : choice?.type === "tool" && typeof choice.name === "string"
          ? { type: "function", function: { name: choice.name } }
          : body.tool_choice;
    return {
      model: body.model,
      messages,
      max_tokens: body.max_tokens,
      stream: body.stream === true,
      ...(tools ? { tools } : {}),
      ...(toolChoice ? { tool_choice: toolChoice } : {}),
      ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
      ...(body.top_p !== undefined ? { top_p: body.top_p } : {}),
    };
  }
  const input = typeof body.input === "string" ? [{ role: "user", content: body.input }] : body.input;
  if (!Array.isArray(input) || !input.length) {
    throw new ApiError(400, "invalid_input", "Укажите input");
  }
  const messages: JsonObject[] = [];
  if (typeof body.instructions === "string") messages.push({ role: "developer", content: body.instructions });
  for (const value of input) {
    const item = record(value);
    if (!item) throw new ApiError(400, "invalid_input", "Некорректный input");
    if (item.type === "function_call_output" && typeof item.call_id === "string") {
      messages.push({ role: "tool", tool_call_id: item.call_id, content: textContent(item.output) });
    } else if (item.type === "function_call" && typeof item.call_id === "string" && typeof item.name === "string") {
      messages.push({ role: "assistant", content: "", tool_calls: [{ id: item.call_id, type: "function", function: { name: item.name, arguments: typeof item.arguments === "string" ? item.arguments : JSON.stringify(item.arguments ?? {}) } }] });
    } else if (item.type === "message") messages.push({ role: item.role, content: textContent(item.content) });
    else if (typeof item.role === "string") messages.push({ role: item.role, content: textContent(item.content) });
    else throw new ApiError(400, "unsupported_input", "Поддерживаются только текстовые сообщения Responses API");
  }
  const tools = Array.isArray(body.tools) ? body.tools.map((value) => {
    const tool = record(value);
    return tool?.type === "function" ? { type: "function", function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters ?? { type: "object", properties: {} },
    } } : value;
  }) : undefined;
  return {
    model: body.model,
    messages,
    max_completion_tokens: body.max_output_tokens,
    stream: body.stream === true,
    ...(tools ? { tools } : {}),
    ...(body.tool_choice ? { tool_choice: body.tool_choice } : {}),
    ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
    ...(body.top_p !== undefined ? { top_p: body.top_p } : {}),
  };
}

function chatMessage(response: JsonObject): JsonObject {
  const choices = response.choices as JsonObject[] | undefined;
  const message = record(choices?.[0]?.message) ?? {};
  return message;
}

export function nativeResponse(response: JsonObject, protocol: Protocol, model: string): JsonObject {
  const message = chatMessage(response);
  const content = typeof message.content === "string" ? message.content : "";
  const usage = record(response.usage) ?? {};
  if (protocol === "anthropic") {
    const blocks: JsonObject[] = content ? [{ type: "text", text: content }] : [];
    const calls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    for (const value of calls) {
      const call = record(value); const fn = record(call?.function);
      if (call && fn) {
        let input: unknown = {};
        try { input = JSON.parse(String(fn.arguments ?? "{}")); } catch { input = {}; }
        blocks.push({ type: "tool_use", id: call.id, name: fn.name, input });
      }
    }
    return {
      id: response.id ?? "msg_spiritlm",
      type: "message", role: "assistant", model,
      content: blocks,
      stop_reason: calls.length ? "tool_use" : "end_turn",
      stop_sequence: null,
      usage: { input_tokens: usage.prompt_tokens ?? 0, output_tokens: usage.completion_tokens ?? 0 },
    };
  }
  const output: JsonObject[] = [];
  if (content) output.push({ type: "message", id: "msg_spiritlm", status: "completed", role: "assistant", content: [{ type: "output_text", text: content, annotations: [] }] });
  for (const value of Array.isArray(message.tool_calls) ? message.tool_calls : []) {
    const call = record(value); const fn = record(call?.function);
    if (call && fn) output.push({ type: "function_call", id: call.id, call_id: call.id, name: fn.name, arguments: fn.arguments ?? "{}", status: "completed" });
  }
  return {
    id: response.id ?? "resp_spiritlm", object: "response", created_at: response.created ?? Math.floor(Date.now() / 1000),
    status: "completed", error: null, incomplete_details: null, model,
    output, output_text: content,
    usage: { input_tokens: usage.prompt_tokens ?? 0, output_tokens: usage.completion_tokens ?? 0, total_tokens: usage.total_tokens ?? 0 },
  };
}

function streamResponse(source: Response, protocol: Protocol, model: string): Response {
  if (!source.body) return source;
  const reader = source.body.getReader();
  const decoder = new TextDecoder(); const encoder = new TextEncoder();
  const id = source.headers.get("X-Request-Id") ?? "req_spiritlm";
  let pending = ""; let started = false; let blockStarted = false;
  let nextBlock = 0;
  let textBlock: number | undefined;
  let textItemStarted = false;
  let responseText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  const toolBlocks = new Map<number, { block: number; id: string; name: string; arguments: string }>();
  const send = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const boundary = pending.indexOf("\n\n");
        if (boundary >= 0) {
          const frame = pending.slice(0, boundary); pending = pending.slice(boundary + 2);
          const data = frame.split("\n").find((line) => line.startsWith("data:"))?.slice(5).trim();
          if (!data) continue;
          if (data === "[DONE]") {
            if (protocol === "anthropic") {
              if (blockStarted) controller.enqueue(encoder.encode(send("content_block_stop", { type: "content_block_stop", index: 0 })));
              for (const tool of toolBlocks.values()) {
                controller.enqueue(encoder.encode(send("content_block_stop", { type: "content_block_stop", index: tool.block })));
              }
              controller.enqueue(encoder.encode(send("message_delta", { type: "message_delta", delta: { stop_reason: toolBlocks.size ? "tool_use" : "end_turn", stop_sequence: null }, usage: { output_tokens: outputTokens } })));
              controller.enqueue(encoder.encode(send("message_stop", { type: "message_stop" })));
            } else {
              if (textItemStarted) {
                controller.enqueue(encoder.encode(send("response.output_text.done", { type: "response.output_text.done", item_id: "msg_spiritlm", output_index: 0, content_index: 0, text: responseText })));
                controller.enqueue(encoder.encode(send("response.content_part.done", { type: "response.content_part.done", item_id: "msg_spiritlm", output_index: 0, content_index: 0, part: { type: "output_text", text: responseText, annotations: [] } })));
                controller.enqueue(encoder.encode(send("response.output_item.done", { type: "response.output_item.done", output_index: 0, item: { id: "msg_spiritlm", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: responseText, annotations: [] }] } })));
              }
              for (const tool of toolBlocks.values()) {
                controller.enqueue(encoder.encode(send("response.function_call_arguments.done", { type: "response.function_call_arguments.done", item_id: tool.id, output_index: tool.block, arguments: tool.arguments })));
                controller.enqueue(encoder.encode(send("response.output_item.done", { type: "response.output_item.done", output_index: tool.block, item: { id: tool.id, type: "function_call", call_id: tool.id, name: tool.name, arguments: tool.arguments, status: "completed" } })));
              }
              const output: JsonObject[] = textItemStarted ? [{ id: "msg_spiritlm", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: responseText, annotations: [] }] }] : [];
              for (const tool of toolBlocks.values()) output.push({ id: tool.id, type: "function_call", call_id: tool.id, name: tool.name, arguments: tool.arguments, status: "completed" });
              controller.enqueue(encoder.encode(send("response.completed", { type: "response.completed", response: { id, object: "response", status: "completed", model, output, usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: inputTokens + outputTokens } } })));
            }
            controller.close(); return;
          }
          let chunk: JsonObject;
          try { chunk = JSON.parse(data) as JsonObject; } catch { continue; }
          if (chunk.error) { controller.enqueue(encoder.encode(send("error", chunk.error))); controller.close(); return; }
          const usage = record(chunk.usage);
          if (typeof usage?.prompt_tokens === "number") inputTokens = usage.prompt_tokens;
          if (typeof usage?.completion_tokens === "number") outputTokens = usage.completion_tokens;
          const choices = chunk.choices as JsonObject[] | undefined;
          const delta = record(choices?.[0]?.delta) ?? {};
          const text = typeof delta.content === "string" ? delta.content : "";
          const toolCalls = Array.isArray(delta.tool_calls) ? delta.tool_calls : [];
          if (protocol === "anthropic") {
            if (!started) {
              controller.enqueue(encoder.encode(send("message_start", { type: "message_start", message: { id, type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } })));
              started = true;
            }
            if (text) {
              if (!blockStarted) { textBlock = nextBlock++; controller.enqueue(encoder.encode(send("content_block_start", { type: "content_block_start", index: textBlock, content_block: { type: "text", text: "" } }))); blockStarted = true; }
              controller.enqueue(encoder.encode(send("content_block_delta", { type: "content_block_delta", index: textBlock, delta: { type: "text_delta", text } })));
            }
            for (const value of toolCalls) {
              const tool = record(value); const index = Number(tool?.index ?? 0);
              let state = toolBlocks.get(index);
              const fn = record(tool?.function) ?? {};
              if (!state) {
                state = { block: nextBlock++, id: String(tool?.id ?? `tool_${index}`), name: String(fn.name ?? ""), arguments: "" };
                toolBlocks.set(index, state);
                controller.enqueue(encoder.encode(send("content_block_start", { type: "content_block_start", index: state.block, content_block: { type: "tool_use", id: state.id, name: state.name, input: {} } })));
              }
              if (!state.name && typeof fn.name === "string") state.name = fn.name;
              if (typeof fn.arguments === "string") {
                state.arguments += fn.arguments;
                controller.enqueue(encoder.encode(send("content_block_delta", { type: "content_block_delta", index: state.block, delta: { type: "input_json_delta", partial_json: fn.arguments } })));
              }
            }
          } else {
            if (!started) { controller.enqueue(encoder.encode(send("response.created", { type: "response.created", response: { id, object: "response", status: "in_progress", model, output: [] } }))); started = true; }
            if (text) {
              if (!textItemStarted) {
                textItemStarted = true;
                controller.enqueue(encoder.encode(send("response.output_item.added", { type: "response.output_item.added", output_index: 0, item: { id: "msg_spiritlm", type: "message", role: "assistant", status: "in_progress", content: [] } })));
                controller.enqueue(encoder.encode(send("response.content_part.added", { type: "response.content_part.added", item_id: "msg_spiritlm", output_index: 0, content_index: 0, part: { type: "output_text", text: "", annotations: [] } })));
              }
              responseText += text;
              controller.enqueue(encoder.encode(send("response.output_text.delta", { type: "response.output_text.delta", item_id: "msg_spiritlm", output_index: 0, content_index: 0, delta: text })));
            }
            for (const value of toolCalls) {
              const tool = record(value); const index = Number(tool?.index ?? 0);
              let state = toolBlocks.get(index);
              const fn = record(tool?.function) ?? {};
              if (!state) {
                const toolId = String(tool?.id ?? `tool_${index}`);
                state = { block: Math.max(1, nextBlock), id: toolId, name: String(fn.name ?? ""), arguments: "" };
                nextBlock = state.block + 1;
                toolBlocks.set(index, state);
                controller.enqueue(encoder.encode(send("response.output_item.added", { type: "response.output_item.added", output_index: state.block, item: { id: toolId, type: "function_call", call_id: toolId, name: state.name, arguments: "", status: "in_progress" } })));
              }
              if (!state.name && typeof fn.name === "string") state.name = fn.name;
              if (typeof fn.arguments === "string") {
                state.arguments += fn.arguments;
                controller.enqueue(encoder.encode(send("response.function_call_arguments.delta", { type: "response.function_call_arguments.delta", item_id: state.id, output_index: state.block, delta: fn.arguments })));
              }
            }
          }
          return;
        }
        const next = await reader.read();
        if (next.done) { controller.close(); return; }
        pending = (pending + decoder.decode(next.value, { stream: true })).replace(/\r\n/g, "\n");
      }
    },
    async cancel() { await reader.cancel(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Request-Id": id } });
}

export async function handleCompatibilityRequest(request: Request, protocol: Protocol) {
  try {
    const key = await authenticateApiKey(request);
    const nativeBody = await readJson(request, PROXY_LIMITS.BODY_BYTES);
    const body = chatRequest(nativeBody, protocol);
    validateChat(body);
    const result = await proxyChat(body, { userId: key.userId, apiKeyId: key.id, diagnostic: false, signal: request.signal });
    after(() => result.completion);
    if (body.stream === true) return streamResponse(result.response, protocol, String(body.model));
    const payload = await result.response.json() as JsonObject;
    return Response.json(nativeResponse(payload, protocol, String(body.model)), { headers: { "Cache-Control": "no-store", "X-Request-Id": result.response.headers.get("X-Request-Id") ?? "" } });
  } catch (error) { return errorResponse(error); }
}
