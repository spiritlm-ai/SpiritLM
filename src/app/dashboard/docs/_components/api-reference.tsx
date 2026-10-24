import Link from "next/link";
import { ALL_MODEL_IDS } from "@/configs/consts/docs.const";
import { PROXY_LIMITS, CATALOG_TIMEOUT_MS } from "@/configs/consts/proxy.const";
import type { DocsCode } from "@/configs/types/docs.types";
import { PATHS } from "@/configs/paths/pages.paths";
import { CodeBlock } from "./code-block";
import { DocsTable } from "./docs-table";
import { GuideSection } from "./guide-section";
import { SUBSCRIPTION_PLANS } from "@/configs/consts/subscriptions.const";

const parameters = [
  ["model", "string · обязательно", "Полный ID модели SpiritLM, до 191 символа."],
  [
    "messages",
    "array · обязательно",
    "От 1 до 256 сообщений. Роли: system, developer, user, assistant, tool, function. Для текста передайте content; для вызова инструмента — поля Chat Completions выбранной модели.",
  ],
  ["stream", "boolean", "По умолчанию false. При true — поток SSE."],
  [
    "max_tokens / max_completion_tokens",
    "integer > 0",
    "Укажите только один параметр. Не должен превышать max_output_tokens модели, если он объявлен. Если лимит модели неизвестен, параметр обязателен для расчёта резерва.",
  ],
  ["n", "integer", "Поддерживается только 1."],
  ["stream_options", "object", "При streaming SpiritLM задаёт include_usage: true; пользовательский объект заменяется."],
  [
    "temperature, top_p, stop, tools, tool_choice, response_format…",
    "Зависит от модели",
    "Передаются поставщику. Поддержка инструментов, изображений, JSON и reasoning зависит от модели; совместимость со всеми параметрами OpenAI не гарантируется.",
  ],
  ["user, service_tier", "—", "Удаляются SpiritLM перед отправкой поставщику."],
] as const;

const errors = [
  ["400", "invalid_json", "Пустое тело, неверный JSON или JSON не является объектом. Передайте объект application/json."],
  ["400", "invalid_model / model_not_found", "Проверьте формат и точный ID модели в каталоге SpiritLM."],
  ["400", "invalid_messages", "Проверьте количество сообщений и допустимые роли."],
  ["400", "invalid_stream / invalid_n", "Передайте boolean в stream и только n = 1."],
  ["400", "invalid_token_limit", "Передайте один положительный целочисленный лимит вывода в пределах лимита модели."],
  ["400", "max_tokens_required", "Лимит модели неизвестен: укажите max_tokens или max_completion_tokens."],
  [
    "401",
    "invalid_api_key",
    "Ключ отсутствует, неверен или отозван. Проверьте Authorization: Bearer и создайте новый ключ при необходимости.",
  ],
  [
    "402",
    "insufficient_balance",
    "Доступного баланса не хватает для резерва запроса. Пополните баланс или уменьшите запрос и лимит вывода.",
  ],
  ["413", "body_too_large", "Тело превышает 1 МиБ. Уменьшите историю и вложения."],
  ["415", "invalid_content_type", "Укажите Content-Type: application/json."],
  [
    "429",
    "rate_limit_exceeded",
    "Достигнут лимит запросов пользователя. Дождитесь завершения текущих запросов и учитывайте Retry-After: 60.",
  ],
  [
    "400 / 404 / 413 / 422 / 429 / 502",
    "upstream_error",
    "Поставщик отклонил запрос. Перечисленные клиентские статусы сохраняются; остальные преобразуются в 502. Проверьте параметры и поддержку функций моделью.",
  ],
  [
    "502 / 504",
    "upstream_unavailable",
    "Каталог или модель недоступны; 504 означает прерывание обращения к модели, в том числе по таймауту.",
  ],
  ["502", "invalid_upstream_response", "Поставщик вернул некорректный JSON или поток."],
  ["503", "upstream_not_configured", "Сервис не настроен на стороне SpiritLM. Обратитесь в поддержку."],
  ["500", "internal_error", "Внутренняя ошибка сервиса. Сохраните время запроса и доступный Request ID для диагностики."],
] as const;

export function ConnectionGuide({ baseUrl, code }: { baseUrl: string; code: DocsCode }) {
  return (
    <GuideSection
      id="connection"
      title="Быстрый старт"
      description="Для подключения нужны API-ключ SpiritLM, базовый адрес и точный ID модели."
    >
      <ol className="list-decimal space-y-2 pl-5 marker:text-[#ffe02e]">
        <li>Создайте ключ в разделе <Link
          href={PATHS.DASHBOARD.KEYS}
          className="text-[#ffe02e] hover:underline"
        >API-ключи</Link>. Секрет показывается один раз. Сохраните его в переменной окружения; не добавляйте в Git и клиентский код сайта.</li>
        <li>Выберите модель в <Link
          href={PATHS.DASHBOARD.MODELS}
          className="text-[#ffe02e] hover:underline"
        >каталоге</Link> и проверьте её доступность через GET /v1/models.</li>
        <li>Задайте переменные в терминале, из которого будете запускать SDK или агента.</li>
      </ol>
      <CodeBlock
        title="Base URL"
        value={baseUrl}
      />
      <CodeBlock
        title="macOS / Linux"
        value={code.environment}
      />
      <CodeBlock
        title="Windows PowerShell"
        value={code.powershell}
      />
      <p className="mt-4">
        В SDK укажите этот адрес как base_url / baseURL. Не добавляйте к нему /chat/completions и повторный
        /v1. Chat Completions и Responses требуют Authorization: Bearer; Anthropic Messages принимает
        x-api-key. Вход в кабинет через
        Clerk его не заменяет.
      </p>
      <p className="mt-3">
        Для клиентов на других протоколах также доступны <code>POST /v1/messages</code> (Anthropic Messages,
        заголовок <code>x-api-key</code>) и <code>POST /v1/responses</code> (OpenAI Responses, Bearer).
        Оба маршрута используют тот же каталог, баланс и лимиты SpiritLM.
      </p>
      <p className="mt-3 text-[#a5a5a1]">
        curl-примеры ниже рассчитаны на Bash/zsh. В PowerShell используйте curl.exe и замените переменные и
        переносы строк на синтаксис PowerShell. Клиентские библиотеки запускайте на сервере или локально, где
        ключ остаётся приватным.
      </p>
    </GuideSection>
  );
}

export function ModelsGuide({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id="models"
      title="GET /v1/models"
      description="Список моделей из каталога SpiritLM, доступность которых подтверждена поставщиком. Нужен Bearer-ключ; тело запроса отсутствует."
    >
      <CodeBlock
        title="curl"
        value={code.models}
      />
      <CodeBlock
        title="200 OK"
        value={code.modelsResponse}
      />
      <p className="mt-4">
        Ответ — объект с object: list и массивом data. У каждой модели есть id, object: model, created: 0 и
        owned_by: spiritlm. created — служебное значение, а не дата выпуска. Если поставщик объявляет лимит
        вывода, дополнительно возвращается max_output_tokens — положительное целое число.
      </p>
      <p className="mt-3">
        Цены в этот ответ не входят. Утверждённые тарифы в рублях за 1 млн токенов указаны в каталоге.
        Доступность может меняться; полный список ID ниже отражает настройки SpiritLM и может быть шире
        ответа API.
      </p>
      <CodeBlock
        title="Все настроенные ID моделей"
        value={ALL_MODEL_IDS}
      />
    </GuideSection>
  );
}

export function ChatGuide({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id="chat"
      title="POST /v1/chat/completions"
      description="Генерация в формате OpenAI Chat Completions. Заголовки: Authorization: Bearer <ключ> и Content-Type: application/json."
    >
      <DocsTable
        caption="Параметры Chat Completions"
        columns={["Поле", "Тип", "Поведение"]}
        rows={parameters}
      />
      <CodeBlock
        title="curl"
        value={code.chat}
      />
      <CodeBlock
        title="200 OK"
        value={code.chatResponse}
      />
      <p className="mt-4">
        Текст ответа находится в choices[0].message.content, причина остановки — в finish_reason. При вызове
        инструментов сообщение может содержать tool_calls вместо текста. model в ответе сохраняет публичный
        ID из запроса. ID ответа поставщика и заголовок X-Request-Id SpiritLM — разные идентификаторы.
      </p>
      <p className="mt-3">
        usage содержит prompt_tokens, completion_tokens и total_tokens, когда поставщик возвращает корректный
        расход. Отсутствующий usage означает неизвестный расход. Остальные поля ответа и поддержка конкретных
        ролей и параметров зависят от модели.
      </p>
    </GuideSection>
  );
}

export function StreamGuide({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id="stream"
      title="Потоковый ответ"
      description="Отправьте stream: true. При успехе Content-Type ответа — text/event-stream; каждый блок data отделён пустой строкой."
    >
      <CodeBlock
        title="curl -N"
        value={code.stream}
      />
      <CodeBlock
        title="Сокращённый пример потока"
        value={code.streamResponse}
      />
      <p className="mt-4">
        Читайте текст из choices[].delta.content и учитывайте, что chunk с usage может иметь пустой choices.
        Для инструментов обрабатывайте delta.tool_calls. SpiritLM запрашивает итоговый usage у поставщика
        автоматически; его наличие всё равно зависит от ответа модели.
      </p>
      <p className="mt-3">
        Успешное завершение обозначается data: [DONE]. После отправки HTTP-заголовков ошибка уже не может
        изменить статус 200: поток может вернуть событие error или оборваться без [DONE]. Оба случая требуют
        обработки как незавершённого ответа.
      </p>
      <CodeBlock
        title="Ошибка после открытия потока"
        value={code.streamError}
      />
      <p className="mt-3">
        При отмене запроса или обрыве соединения полный ответ и итоговый usage могут отсутствовать. Не
        считайте частичный текст полным ответом и не повторяйте генерацию автоматически.
      </p>
    </GuideSection>
  );
}

export function LimitsGuide() {
  return (
    <GuideSection
      id="limits"
      title="Лимиты, баланс и usage"
      description="Лимиты генераций действуют на пользователя суммарно по его API-ключам. Запросы GET /v1/models не расходуют этот лимит."
    >
      <DocsTable
        caption="Ограничения API"
        columns={["Ограничение", "Значение"]}
        rows={[
          ["Тело запроса", "1 МиБ (1 048 576 байт UTF-8)"],
          ["Количество сообщений", "1–256"],
          ["Частота генераций", `${PROXY_LIMITS.REQUESTS_PER_MINUTE} запросов за 60 секунд`],
          ["Одновременные генерации", String(PROXY_LIMITS.CONCURRENT_REQUESTS)],
          ["Обращение к модели", `${PROXY_LIMITS.TIMEOUT_MS / 1000} секунд, включая чтение ответа и SSE`],
          ["Загрузка каталога", `${CATALOG_TIMEOUT_MS / 1000} секунд`],
        ]}
      />
      <DocsTable
        caption="Лимиты генераций по тарифам"
        columns={["Доступ", "Запросов в минуту", "Одновременно"]}
        rows={[
          ["Бесплатно / баланс", String(PROXY_LIMITS.REQUESTS_PER_MINUTE), String(PROXY_LIMITS.CONCURRENT_REQUESTS)],
          ...Object.values(SUBSCRIPTION_PLANS).map((plan) => [
            plan.name,
            String(plan.requestsPerMinute),
            String(plan.concurrentRequests),
          ]),
        ]}
      />
      <h3 className="mt-6 text-base font-semibold">Как расходуется пакет</h3>
      <p className="mt-3">
        1 кредит равен 1 ₽ по тарифу модели. Перед генерацией резервируется
        оценка стоимости входа и максимального вывода; после ответа списывается
        стоимость по фактическому usage, а остаток резерва возвращается.
        Неизвестный расход не считается нулём — в таком случае резерв удерживается.
        Пакет действует 30 дней, остаток не переносится и автопродления нет.
        Следующая покупка добавляется после уже оплаченных периодов.
      </p>
      <p className="mt-4">
        До генерации резервируется верхняя оценка стоимости входа и вывода. Поэтому доступного баланса должно
        хватать на резерв, даже если ожидаемый ответ короткий. Укажите разумный max_tokens: когда лимит
        модели неизвестен, без него резерв рассчитать нельзя.
      </p>
      <p className="mt-3">
        При известном usage стоимость рассчитывается по утверждённому тарифу модели за 1 MTok и общему числу
        токенов; неиспользованный резерв возвращается. Кэшированные и reasoning токены учитываются отдельно,
        когда поставщик их возвращает, и повторно к total_tokens не прибавляются.
      </p>
      <p className="mt-3">
        При подтверждённой ошибке поставщика резерв возвращается. Если расход неизвестен, резерв
        удерживается; неизвестный расход не считается нулём. Баланс и история запросов доступны в{" "}
      <Link
        href={PATHS.DASHBOARD.ROOT}
        className="text-[#ffe02e] hover:underline"
      >обзоре кабинета</Link>.</p>
    </GuideSection>
  );
}

export function ErrorsGuide({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id="errors"
      title="Ошибки и диагностика"
      description="До открытия потока ошибки API возвращаются как JSON с error.message, error.type и error.code. Для ошибок SpiritLM type равен api_error."
    >
      <CodeBlock
        title="401 Unauthorized"
        value={code.error}
      />
      <DocsTable
        caption="HTTP-статусы и коды ошибок API"
        columns={["HTTP", "error.code", "Что делать"]}
        rows={errors}
      />
      <p className="mt-4">
        У ответов 429 есть Retry-After: 60 (секунды), включая 429 от поставщика. У успешных ответов Chat
        Completions и при открытии SSE есть X-Request-Id. Ошибки до открытия ответа могут не содержать этот
        заголовок; сохраняйте его, когда он доступен.
      </p>
      <p className="mt-3">
        После таймаута или обрыва поставщик мог уже выполнить генерацию. Автоматического повтора и гарантии
        идемпотентности генерации нет. Перед ручным повтором проверьте историю в кабинете; для диагностики
        сохраните время, модель, HTTP-статус, error.code и X-Request-Id без API-ключа.
      </p>
    </GuideSection>
  );
}
