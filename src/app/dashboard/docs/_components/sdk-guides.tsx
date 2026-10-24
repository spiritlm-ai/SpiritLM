import type { DocsCode } from "@/configs/types/docs.types";
import { LINKS } from "@/configs/paths/links.paths";
import { CodeBlock } from "./code-block";
import { GuideSection } from "./guide-section";

export function SdkGuides({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id="sdk"
      title="OpenAI SDK"
      description="Используйте Chat Completions, собственный ключ SpiritLM и Base URL из быстрого старта. Примеры выполняются локально или на сервере."
    >
      <p>
        Сначала задайте SPIRITLM_API_KEY и SPIRITLM_BASE_URL в окружении. Для потокового примера используйте
        тот же client, что и для обычного запроса. Повторы отключены, клиентский таймаут — 100 секунд;
        серверный предел обращения к модели — 90 секунд.
      </p>
      <h3 className="mt-6 font-semibold text-[#f3f2ee]">Python</h3>
      <CodeBlock
        title="Установка SDK"
        value="python -m pip install openai"
      />
      <CodeBlock
        title="example.py"
        value={code.python}
      />
      <CodeBlock
        title="Python"
        value={code.pythonStream}
      />
      <CodeBlock
        title="Запуск"
        value="python example.py"
      />
      <h3 className="mt-6 font-semibold text-[#f3f2ee]">JavaScript / TypeScript · Node.js</h3>
      <CodeBlock
        title="Установка SDK"
        value="npm install openai"
      />
      <CodeBlock
        title="example.mjs"
        value={code.javascript}
      />
      <CodeBlock
        title="JavaScript / TypeScript"
        value={code.javascriptStream}
      />
      <CodeBlock
        title="Запуск JavaScript"
        value="node example.mjs"
      />
      <p className="mt-4">
        Поток может завершиться ошибкой уже после HTTP 200. Обрабатывайте исключения во время чтения и не
        принимайте частичный ответ за полный. Отсутствующий usage оставляйте неизвестным.
      </p>
      <p className="mt-3">Справочник библиотек: <a
        href={LINKS.DOCS.OPENAI_SDK}
        target="_blank"
        rel="noreferrer"
        className="text-[#ffe02e] hover:underline"
      >официальная документация OpenAI SDK</a>
        . SpiritLM поддерживает описанный здесь Chat Completions API; использование SDK не добавляет
        поддержку Responses, embeddings или других API.
      </p>
    </GuideSection>
  );
}
