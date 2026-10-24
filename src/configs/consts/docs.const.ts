import { MODEL_GROUPS } from "./models.const";
import { SPIRITCODE_INSTALL_COMMAND } from "./spiritcode.const";

export const DOCS_MODEL_ID = "deepseek/deepseek-v4-flash";
export const ALL_MODEL_IDS = MODEL_GROUPS.map((group) =>
  [group.name, ...group.models.map((model) => `  ${model.id}`)].join("\n"),
).join("\n\n");

export function docsCode(baseUrl: string) {
  const url = baseUrl.replace(/\/+$/, "");
  const request = {
    model: DOCS_MODEL_ID,
    messages: [{ role: "user", content: "Привет!" }],
    max_tokens: 128,
  };
  const curl = (stream: boolean) => [
    `curl${stream ? " -N" : ""} -i "$SPIRITLM_BASE_URL/chat/completions" \\`,
    '  -H "Authorization: Bearer $SPIRITLM_API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    `  -d '${JSON.stringify({ ...request, stream }, null, 2)}'`,
  ].join("\n");

  return {
    spiritcodeInstall: SPIRITCODE_INSTALL_COMMAND,
    spiritcodeLaunch: "sprt",
    spiritcodeCommands: [
      "sprt models",
      "sprt account",
      "sprt sessions",
      "sprt resume <id>",
    ].join("\n"),
    environment: [
      'export SPIRITLM_API_KEY="<ВАШ_КЛЮЧ_SPIRITLM>"',
      `export SPIRITLM_BASE_URL=${JSON.stringify(url)}`,
    ].join("\n"),
    powershell: [
      '$env:SPIRITLM_API_KEY = "<ВАШ_КЛЮЧ_SPIRITLM>"',
      `$env:SPIRITLM_BASE_URL = ${JSON.stringify(url)}`,
    ].join("\n"),
    models: [
      'curl -i "$SPIRITLM_BASE_URL/models" \\',
      '  -H "Authorization: Bearer $SPIRITLM_API_KEY"',
    ].join("\n"),
    modelsResponse: JSON.stringify({
      object: "list",
      data: [{ id: DOCS_MODEL_ID, object: "model", created: 0, owned_by: "spiritlm" }],
    }, null, 2),
    chat: curl(false),
    anthropic: [
      `curl -i ${JSON.stringify(`${url}/messages`)} \\`,
      '  -H "x-api-key: $SPIRITLM_API_KEY" \\',
      '  -H "anthropic-version: 2023-06-01" \\',
      '  -H "content-type: application/json" \\',
      `  -d '${JSON.stringify({ model: "anthropic/claude-sonnet-4.6", max_tokens: 128, messages: [{ role: "user", content: "Привет!" }] }, null, 2)}'`,
    ].join("\n"),
    responses: [
      `curl -i ${JSON.stringify(`${url}/responses`)} \\`,
      '  -H "Authorization: Bearer $SPIRITLM_API_KEY" \\',
      '  -H "Content-Type: application/json" \\',
      `  -d '${JSON.stringify({ model: DOCS_MODEL_ID, input: "Привет!", max_output_tokens: 128 }, null, 2)}'`,
    ].join("\n"),
    chatResponse: JSON.stringify({
      id: "chatcmpl-example",
      object: "chat.completion",
      created: 1_792_540_800,
      model: DOCS_MODEL_ID,
      choices: [{
        index: 0,
        message: { role: "assistant", content: "Привет! Чем помочь?" },
        finish_reason: "stop",
      }],
      usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
    }, null, 2),
    stream: curl(true),
    streamResponse: [
      `data: ${JSON.stringify({
        id: "chatcmpl-example",
        object: "chat.completion.chunk",
        model: DOCS_MODEL_ID,
        choices: [{ index: 0, delta: { content: "Привет!" }, finish_reason: null }],
      })}`,
      "",
      `data: ${JSON.stringify({
        id: "chatcmpl-example",
        object: "chat.completion.chunk",
        model: DOCS_MODEL_ID,
        choices: [],
        usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
      })}`,
      "",
      "data: [DONE]",
      "",
    ].join("\n"),
    error: JSON.stringify({
      error: {
        message: "Неверный API-ключ SpiritLM",
        type: "api_error",
        code: "invalid_api_key",
      },
    }, null, 2),
    streamError: 'data: {"error":{"message":"Поток модели прерван","type":"api_error","code":"stream_interrupted"}}\n\n',
    python: `import os
from openai import OpenAI, APIError

client = OpenAI(
    api_key=os.environ["SPIRITLM_API_KEY"],
    base_url=os.environ["SPIRITLM_BASE_URL"],
    max_retries=0,
    timeout=100.0,
)

try:
    response = client.chat.completions.create(
        model="${DOCS_MODEL_ID}",
        messages=[{"role": "user", "content": "Привет!"}],
        max_tokens=128,
    )
    print(response.choices[0].message.content)
    print(response.usage)
    print("Request ID:", response._request_id)
except APIError as error:
    print("HTTP:", getattr(error, "status_code", None))
    print("Code:", error.code)
    print("Request ID:", getattr(error, "request_id", None))`,
    pythonStream: `# Используйте client из примера выше.
try:
    with client.chat.completions.create(
        model="${DOCS_MODEL_ID}",
        messages=[{"role": "user", "content": "Привет!"}],
        max_tokens=128,
        stream=True,
        stream_options={"include_usage": True},
    ) as stream:
        for chunk in stream:
            if chunk.choices:
                print(chunk.choices[0].delta.content or "", end="", flush=True)
            if chunk.usage is not None:
                print("\\nUsage:", chunk.usage)
except APIError as error:
    print("\\nПоток прерван:", error.code)
    # Не повторяйте генерацию автоматически.`,
    javascript: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.SPIRITLM_API_KEY,
  baseURL: process.env.SPIRITLM_BASE_URL,
  maxRetries: 0,
  timeout: 100_000,
});

try {
  const { data, request_id } = await client.chat.completions.create({
    model: "${DOCS_MODEL_ID}",
    messages: [{ role: "user", content: "Привет!" }],
    max_tokens: 128,
  }).withResponse();
  console.log(data.choices[0].message.content);
  console.log(data.usage);
  console.log("Request ID:", request_id);
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    console.error(error.status, error.code, error.request_id);
  } else {
    throw error;
  }
}`,
    javascriptStream: `// Используйте client из примера выше.
try {
  const { data: stream, request_id } = await client.chat.completions.create({
    model: "${DOCS_MODEL_ID}",
    messages: [{ role: "user", content: "Привет!" }],
    max_tokens: 128,
    stream: true,
    stream_options: { include_usage: true },
  }).withResponse();
  console.log("Request ID:", request_id);
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta.content ?? "");
    if (chunk.usage) console.log("\\nUsage:", chunk.usage);
  }
} catch (error) {
  console.error("Поток прерван:", error);
  // Не повторяйте генерацию автоматически.
}`,
    cursor: [
      "API Provider: OpenAI / OpenAI Compatible",
      `Base URL: ${url}`,
      "API Key: <ВАШ_КЛЮЧ_SPIRITLM>",
      `Model ID: ${DOCS_MODEL_ID}`,
    ].join("\n"),
    hermes: [
      "model:",
      "  provider: custom",
      `  base_url: ${JSON.stringify(url)}`,
      `  default: ${JSON.stringify(DOCS_MODEL_ID)}`,
      "  api_mode: chat_completions",
    ].join("\n"),
    hermesLaunch: [
      'export OPENAI_API_KEY="$SPIRITLM_API_KEY"',
      "hermes model",
      "hermes",
    ].join("\n"),
    kimi: [
      'default_model = "spiritlm"',
      "",
      "[providers.spiritlm]",
      'type = "openai"',
      `base_url = ${JSON.stringify(url)}`,
      'api_key_env = "SPIRITLM_API_KEY"',
      "",
      "[models.spiritlm]",
      'provider = "spiritlm"',
      `model = ${JSON.stringify(DOCS_MODEL_ID)}`,
      "max_context_size = <КОНТЕКСТ_МОДЕЛИ_В_ТОКЕНАХ>",
    ].join("\n"),
    opencode: JSON.stringify({
      $schema: "https://opencode.ai/config.json",
      provider: {
        spiritlm: {
          npm: "@ai-sdk/openai-compatible",
          name: "SpiritLM",
          options: { baseURL: url, apiKey: "{env:SPIRITLM_API_KEY}" },
          models: Object.fromEntries(MODEL_GROUPS.flatMap((group) =>
            group.models.map((model) => [model.id, { name: model.name }]),
          )),
        },
      },
      model: `spiritlm/${DOCS_MODEL_ID}`,
    }, null, 2),
    codex: [
      `model = ${JSON.stringify(DOCS_MODEL_ID)}`,
      'model_provider = "spiritlm"',
      "",
      "[model_providers.spiritlm]",
      'name = "SpiritLM"',
      `base_url = ${JSON.stringify(url)}`,
      'env_key = "SPIRITLM_API_KEY"',
      'wire_api = "responses"',
      "request_max_retries = 0",
      "stream_max_retries = 0",
    ].join("\n"),
    claude: JSON.stringify({
      env: {
        ANTHROPIC_BASE_URL: url,
        ANTHROPIC_AUTH_TOKEN: "<ВАШ_КЛЮЧ_SPIRITLM>",
      },
      model: "anthropic/claude-sonnet-4.6",
    }, null, 2),
  };
}
