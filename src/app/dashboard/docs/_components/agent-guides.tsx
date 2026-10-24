import type { DocsCode } from "@/configs/types/docs.types";
import { IMAGES } from "@/configs/paths/images.paths";
import { LINKS } from "@/configs/paths/links.paths";
import { PATHS } from "@/configs/paths/pages.paths";
import { CodeBlock } from "./code-block";
import { GuideSection } from "./guide-section";

export function ClaudeCodeGuide({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id="claude-code"
      title="Claude Code"
      icon={IMAGES.AGENTS.CLAUDE_CODE}
      description="Claude Code подключается через совместимый Anthropic Messages endpoint SpiritLM."
    >
      <p>
        Claude Code можно подключить через /v1/messages. Используйте модель Anthropic из каталога и ключ
        SpiritLM. Запросы поддерживают текст и встроенные инструменты Claude; изображения и другие
        мультимодальные блоки пока не поддерживаются.
      </p>
      <details className="mt-4 rounded-xl bg-[#111] p-4">
        <summary className="cursor-pointer rounded text-[#f3f2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]">Настройка Claude Code</summary>
        <p className="mt-3">
          Задайте URL и ключ в пользовательском
          ~/.claude/settings.json (Windows: %USERPROFILE%\.claude\settings.json), сохранив остальные настройки.
        </p>
        <CodeBlock
          title="~/.claude/settings.json"
          value={code.claude}
        />
        <p className="mt-3">
          Подставьте ключ вместо placeholder и выберите модель командой /model. Ключ в settings.json
          хранится открытым текстом; ограничьте доступ к файлу.
        </p>
      </details>
      <p className="mt-4"><a
        href={LINKS.DOCS.CLAUDE_CODE}
        target="_blank"
        rel="noreferrer"
        className="text-[#ffe02e] hover:underline"
      >Официальная настройка Claude Code через gateway</a>.</p>
    </GuideSection>
  );
}

export function CodexGuide({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id="codex"
      title="Codex"
      icon={IMAGES.AGENTS.CODEX}
      description="Codex использует OpenAI Responses API через /v1/responses."
    >
      <p>
        SpiritLM предоставляет /v1/responses с текстовым вводом, функциями и потоковыми событиями.
        Выберите модель из каталога; изображения и другие мультимодальные элементы не поддерживаются,
        а вызов инструментов зависит от модели.
      </p>
      <details className="mt-4 rounded-xl bg-[#111] p-4">
        <summary className="cursor-pointer rounded text-[#f3f2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]">Настройка Codex</summary>
        <p className="mt-3">
          Базовый URL заканчивается на /v1: Codex сам добавляет /responses. Конфигурация
          провайдера находится в пользовательском ~/.codex/config.toml (Windows:
          %USERPROFILE%\.codex\config.toml).
        </p>
        <CodeBlock
          title="~/.codex/config.toml"
          value={code.codex}
        />
        <CodeBlock title="Проверка Responses API" value={code.responses} />
        <p className="mt-3">
          Для профиля создайте ~/.codex/spiritlm.config.toml с верхнеуровневыми model и model_provider, затем
          запускайте codex --profile spiritlm. В актуальном CLI профили хранятся в отдельных файлах: таблицы
          [profiles.name] и верхнеуровневый profile больше не используются. Ключ передаётся через
          SPIRITLM_API_KEY.
        </p>
      </details>
      <p className="mt-4"><a
        href={LINKS.DOCS.CODEX}
        target="_blank"
        rel="noreferrer"
        className="text-[#ffe02e] hover:underline"
      >Официальная документация Codex: провайдеры и профили</a>.</p>
    </GuideSection>
  );
}

export function CursorGuide({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id="cursor"
      title="Cursor"
      icon={IMAGES.AGENTS.CURSOR}
      iconClassName="invert"
      description="Подключение через пользовательский OpenAI Base URL, если эта настройка доступна в вашей версии Cursor."
    >
      <ol className="list-decimal space-y-2 pl-5 marker:text-[#ffe02e]">
        <li>Откройте Cursor Settings → Models и найдите настройки OpenAI API.</li>
        <li>Введите ключ SpiritLM. Включите Override OpenAI Base URL и задайте адрес ниже.</li>
        <li>Добавьте Custom Model с точным ID из каталога. Сохраните настройки и выберите модель в чате.</li>
        <li>Отправьте короткое сообщение и проверьте запрос в истории кабинета SpiritLM.</li>
      </ol>
      <CodeBlock
        title="Поля подключения Cursor"
        value={code.cursor}
      />
      <p className="mt-4">
        Поддержка пользовательских моделей и Agent зависит от версии Cursor и протокола запросов. BYOK не
        распространяется на все функции редактора: например, Tab использует собственные модели Cursor. Если
        настройки произвольного URL нет или Cursor отправляет Responses-запросы, используйте Cline /
        OpenCode; SpiritLM не преобразует протокол автоматически.
      </p>
      <p className="mt-3"><a
        href={LINKS.DOCS.CURSOR}
        target="_blank"
        rel="noreferrer"
        className="text-[#ffe02e] hover:underline"
      >Официальная справка Cursor по API-ключам и ограничениям</a>.</p>
    </GuideSection>
  );
}

export function HermesGuide({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id="hermes"
      title="Hermes"
      icon={IMAGES.AGENTS.HERMES}
      iconClassName="invert"
      description="Выберите Custom endpoint и протокол Chat Completions через hermes model."
    >
      <ol className="list-decimal space-y-2 pl-5 marker:text-[#ffe02e]">
        <li>Задайте переменные из быстрого старта. Для custom endpoint передайте ключ также через OPENAI_API_KEY.</li>
        <li>Запустите hermes model, выберите Custom endpoint, укажите Base URL SpiritLM, ключ и полный ID модели.</li>
        <li>Выберите chat_completions, если мастер предлагает выбор протокола. Запустите hermes и отправьте короткое сообщение.</li>
      </ol>
      <CodeBlock
        title="Терминал"
        value={code.hermesLaunch}
      />
      <p className="mt-4">Проверьте блок model в ~/.hermes/config.yaml; заменяйте только соответствующие поля существующего конфига:</p>
      <CodeBlock
        title="~/.hermes/config.yaml"
        value={code.hermes}
      />
      <p className="mt-4">
        Для смены модели повторите hermes model или измените model.default. Если сохраняете ключ через
        мастер, держите файлы ~/.hermes приватными. Фоновые задачи и инструменты могут создавать
        дополнительные запросы — учитывайте общий лимит аккаунта.
      </p>
      <p className="mt-3"><a
        href={LINKS.DOCS.HERMES}
        target="_blank"
        rel="noreferrer"
        className="text-[#ffe02e] hover:underline"
      >Официальная настройка моделей Hermes</a>.</p>
    </GuideSection>
  );
}

export function KimiGuide({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id="kimi-code"
      title="Kimi Code"
      icon={IMAGES.AGENTS.KIMI_CODE}
      description="В актуальном Kimi Code CLI пользовательский Chat Completions provider имеет type = openai."
    >
      <p>
        Добавьте provider и модель в ~/.kimi-code/config.toml. Для старого kimi-cli путь и тип провайдера
        могут отличаться; пример ниже относится к текущему Kimi Code CLI. Сначала экспортируйте
        SPIRITLM_API_KEY.
      </p>
      <p className="mt-3">
        Перед сохранением замените placeholder max_context_size положительным целым числом из спецификации
        выбранной модели. Это длина контекста, а не max_output_tokens из /v1/models. Без замены шаблон не
        является валидным TOML.
      </p>
      <CodeBlock
        title="~/.kimi-code/config.toml"
        value={code.kimi}
      />
      <p className="mt-4">
        api_key_env читает ключ из окружения без сохранения секрета в конфиге. Запустите kimi -m spiritlm,
        отправьте короткое сообщение и проверьте историю SpiritLM. Для дополнительной модели создайте другую
        запись [models.&lt;alias&gt;] и выбирайте её через kimi -m &lt;alias&gt;. Не используйте
        openai_responses: этот протокол SpiritLM пока не предоставляет.
      </p>
      <p className="mt-3"><a
        href={LINKS.DOCS.KIMI_CODE}
        target="_blank"
        rel="noreferrer"
        className="text-[#ffe02e] hover:underline"
      >Официальный справочник конфигурации Kimi Code</a>.</p>
    </GuideSection>
  );
}

export function OpenCodeGuide({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id="opencode"
      title="OpenCode"
      icon={IMAGES.AGENTS.OPEN_CODE}
      iconClassName="invert"
      description="Custom provider через @ai-sdk/openai-compatible: этот адаптер использует Chat Completions."
    >
      <ol className="list-decimal space-y-2 pl-5 marker:text-[#ffe02e]">
        <li>Экспортируйте SPIRITLM_API_KEY из быстрого старта в том же терминале.</li>
        <li>Создайте opencode.json в корне проекта или объедините provider.spiritlm с существующим конфигом.</li>
        <li>Запустите opencode и выберите SpiritLM через /models. Отправьте сообщение и проверьте историю запросов.</li>
      </ol>
      <CodeBlock
        title="opencode.json"
        value={code.opencode}
      />
      <p className="mt-4">Ключ берётся из окружения через {"{env:SPIRITLM_API_KEY}"}
        . В поле model сначала идёт имя провайдера OpenCode, затем полный ID SpiritLM:
        spiritlm/deepseek/deepseek-v4-flash. В API отправляется только deepseek/deepseek-v4-flash.
      </p>
      <p className="mt-3">Список в конфиге содержит все настроенные модели; фактическую доступность проверьте через <a
        href={PATHS.DOCS.MODELS}
        className="text-[#ffe02e] hover:underline"
      >GET /v1/models</a>. Для работы агента выбранная модель должна поддерживать tools.</p>
      <p className="mt-3"><a
        href={LINKS.DOCS.OPENCODE}
        target="_blank"
        rel="noreferrer"
        className="text-[#ffe02e] hover:underline"
      >Официальная настройка провайдеров OpenCode</a>.</p>
    </GuideSection>
  );
}

export function VsCodeGuide({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id="vscode"
      title="VS Code"
      icon={IMAGES.AGENTS.VS_CODE}
      description="Для текущего API SpiritLM используйте Cline с провайдером OpenAI Compatible."
    >
      <h3 className="font-semibold text-[#f3f2ee]">Cline</h3>
      <ol className="mt-3 list-decimal space-y-2 pl-5 marker:text-[#ffe02e]">
        <li>Установите Cline из Marketplace VS Code и откройте настройки расширения.</li>
        <li>Выберите API Provider → OpenAI Compatible. Введите Base URL, API Key и Model ID по примеру ниже.</li>
        <li>
          В Model Configuration задайте контекст, лимит вывода и возможности по спецификации модели. Не
          включайте изображения или другие функции, которых модель не поддерживает.
        </li>
        <li>
          Сохраните настройки, выберите модель с поддержкой tools и отправьте короткий запрос. Для смены модели
          измените Model ID и её параметры.
        </li>
      </ol>
      <CodeBlock
        title="Значения для Cline"
        value={code.cursor.replace("OpenAI / OpenAI Compatible", "OpenAI Compatible")}
      />
      <p className="mt-3">Если список моделей не загрузился, скопируйте ID из <a
        href={PATHS.DOCS.MODELS}
        className="text-[#ffe02e] hover:underline"
      >раздела моделей</a>. <a
        href={LINKS.DOCS.CLINE}
        target="_blank"
        rel="noreferrer"
        className="text-[#ffe02e] hover:underline"
      >Официальная инструкция Cline</a>.</p>
      <h3 className="mt-6 font-semibold text-[#f3f2ee]">Расширения Codex и Claude Code</h3>
      <p className="mt-3">
        Установка расширения не меняет требуемый API. Подключение Codex и Claude Code к SpiritLM пока
        недоступно по тем же причинам, что и в CLI. Требования и условные настройки приведены в разделах{" "}
      <a
        href={PATHS.DOCS.CODEX}
        className="text-[#ffe02e] hover:underline"
      >Codex</a> и <a
        href={PATHS.DOCS.CLAUDE_CODE}
        className="text-[#ffe02e] hover:underline"
      >Claude Code</a>.</p>
    </GuideSection>
  );
}

export function TroubleshootingGuide() {
  return (
    <GuideSection
      id="troubleshooting"
      title="Если не подключается"
      description="Проверяйте подключение по шагам: так проще отличить ошибку настроек агента от ошибки API."
    >
      <ol className="list-decimal space-y-3 pl-5 marker:text-[#ffe02e]">
        <li>
          Выполните curl для /models из быстрого старта. При 401 проверьте ключ SpiritLM и Bearer-заголовок;
          ключ OpenAI или сессия кабинета не подойдут.
        </li>
        <li>
          Проверьте Base URL: один /v1, без /chat/completions в конце. Адрес должен быть доступен с машины, где
          агент выполняет запросы; некоторые редакторы отправляют их со своих серверов.
        </li>
        <li>Используйте точный ID модели из ответа API. Модель в конфиге агента не гарантирует её текущую доступность.</li>
        <li>
          Выполните обычный curl Chat Completions. Если он работает, проверьте, что агент использует тот же
          URL, ключ и протокол. Responses и Anthropic Messages пока не поддерживаются.
        </li>
        <li>
          При 402 проверьте баланс и резерв; при 429 уменьшите параллельность и дождитесь освобождения лимита.
          Инструменты и фоновые задачи агента тоже создают запросы.
        </li>
        <li>
          Если текстовый запрос работает, а агент отклоняет tools или изображения, проверьте возможности модели
          и настройки контекста. После обрыва сверьтесь с историей перед ручным повтором.
        </li>
      </ol>
      <p className="mt-4">
        Для обращения в поддержку подготовьте модель, время, HTTP-статус, error.code и доступный
        X-Request-Id. Не отправляйте секретный API-ключ.
      </p>
    </GuideSection>
  );
}
