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
        Claude Code можно подключить через /v1/messages. Конфиг добавляет в меню /model все модели Anthropic
        из каталога SpiritLM. Запросы поддерживают текст и встроенные инструменты Claude; изображения и другие
        мультимодальные блоки пока не поддерживаются.
      </p>
      <details className="mt-4 rounded-xl bg-[#111] p-4">
        <summary className="cursor-pointer rounded text-[#f3f2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]">Настройка Claude Code</summary>
        <p className="mt-3">
          Добавьте поля в пользовательский ~/.claude/settings.json (Windows: %USERPROFILE%\.claude\settings.json).
          Claude Code сам добавляет /v1/messages к ANTHROPIC_BASE_URL.
        </p>
        <CodeBlock
          title="~/.claude/settings.json"
          value={code.claude}
        />
        <p className="mt-3">
          Подставьте свой ключ, перезапустите Claude Code и выберите модель через /model.
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
        Выберите модель из каталога. Изображения и другие мультимодальные элементы не поддерживаются,
        а вызов инструментов зависит от модели.
      </p>
      <details className="mt-4 rounded-xl bg-[#111] p-4">
        <summary className="cursor-pointer rounded text-[#f3f2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]">Настройка Codex</summary>
        <p className="mt-3">
          Сохраните оба файла в ~/.codex (Windows: %USERPROFILE%\.codex). Профиль подключает провайдера
          SpiritLM и загружает список моделей из JSON. Ключ читается из SPIRITLM_API_KEY.
        </p>
        <CodeBlock
          title="~/.codex/spiritlm.config.toml"
          value={code.codex}
        />
        <CodeBlock title="~/.codex/spiritlm-models.json" value={code.codexModels} />
        <p className="mt-3">
          Запустите codex --profile spiritlm и выберите модель через /model. Можно также передать полный ID
          при запуске через --model.
        </p>
        <CodeBlock title="Проверка Responses API" value={code.responses} />
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
        <li>Добавьте нужные модели через Custom Model, по одному ID из списка. Выберите модель в чате.</li>
        <li>Отправьте короткое сообщение и проверьте запрос в истории кабинета SpiritLM.</li>
      </ol>
      <CodeBlock
        title="Поля подключения Cursor"
        value={code.editorConnection}
      />
      <CodeBlock title="ID для Custom Model" value={code.modelIds} />
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
      description="Конфиг провайдера SpiritLM со всеми моделями для Chat Completions."
    >
      <ol className="list-decimal space-y-2 pl-5 marker:text-[#ffe02e]">
        <li>Экспортируйте SPIRITLM_API_KEY из быстрого старта.</li>
        <li>Добавьте providers.spiritlm в ~/.hermes/config.yaml.</li>
        <li>Запустите hermes model и выберите SpiritLM и нужную модель.</li>
      </ol>
      <CodeBlock
        title="~/.hermes/config.yaml"
        value={code.hermes}
      />
      <p className="mt-4">
        В запущенной сессии смените модель командой <code>/model custom:spiritlm:&lt;ID&gt;</code>.
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
      description="Конфиг Kimi Code CLI с моделями SpiritLM и их окнами контекста."
    >
      <p>
        Экспортируйте SPIRITLM_API_KEY и добавьте настройки в ~/.kimi-code/config.toml. Если файл уже
        существует, поместите default_model перед первой секцией в квадратных скобках.
      </p>
      <CodeBlock
        title="~/.kimi-code/config.toml"
        value={code.kimi}
      />
      {code.kimiModelId && (
        <p className="mt-4">
          Запустите kimi, чтобы использовать модель по умолчанию, или укажите полный ID,
          например <code>kimi -m {code.kimiModelId}</code>.
        </p>
      )}
      {code.kimiModelsWithoutContext && (
        <>
          <p className="mt-4">
            Для моделей ниже добавьте отдельные блоки [models.&quot;ID&quot;], когда будет известен обязательный
            max_context_size из спецификации модели.
          </p>
          <CodeBlock title="Модели без данных об окне контекста" value={code.kimiModelsWithoutContext} />
        </>
      )}
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
      description="Готовые конфиги для OpenCode V2 и V1 со всеми моделями SpiritLM."
    >
      <ol className="list-decimal space-y-2 pl-5 marker:text-[#ffe02e]">
        <li>Экспортируйте SPIRITLM_API_KEY из быстрого старта в том же терминале.</li>
        <li>Проверьте версию командой opencode --version и выберите соответствующий конфиг.</li>
        <li>Сохраните opencode.json в корне проекта. В существующий конфиг добавьте providers.spiritlm для V2 или provider.spiritlm для V1.</li>
        <li>Запустите opencode и выберите модель SpiritLM через /models.</li>
      </ol>
      <CodeBlock
        title="opencode.json · V2"
        value={code.opencode}
      />
      <CodeBlock title="opencode.json · V1" value={code.opencodeV1} />
      <p className="mt-4">
        Оба конфига читают ключ из SPIRITLM_API_KEY и используют Chat Completions. Поле model задаёт
        модель по умолчанию. Например, <code>spiritlm/{code.exampleModelId}</code> отправляется в API
        как <code>{code.exampleModelId}</code>.
      </p>
      <p className="mt-3">Текущую доступность моделей проверьте через <a
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
        <li>Выберите API Provider → OpenAI Compatible. Введите Base URL и API Key, затем выберите или введите ID модели из списка.</li>
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
        value={code.editorConnection}
      />
      <CodeBlock title="ID для Model ID" value={code.modelIds} />
      <p className="mt-3"><a
        href={LINKS.DOCS.CLINE}
        target="_blank"
        rel="noreferrer"
        className="text-[#ffe02e] hover:underline"
      >Официальная инструкция Cline</a>.</p>
      <h3 className="mt-6 font-semibold text-[#f3f2ee]">Расширения Codex и Claude Code</h3>
      <p className="mt-3">
        Настройки провайдеров для расширений приведены в разделах{" "}
      <a
        href={PATHS.DOCS.CODEX}
        className="text-[#ffe02e] hover:underline"
      >Codex</a> и <a
        href={PATHS.DOCS.CLAUDE_CODE}
        className="text-[#ffe02e] hover:underline"
      >Claude Code</a>.</p>
      <p className="mt-3">
        Для расширения Claude Code также задайте ANTHROPIC_BASE_URL и ANTHROPIC_AUTH_TOKEN в пользовательской
        настройке VS Code <code>claudeCode.environmentVariables</code>.
      </p>
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
