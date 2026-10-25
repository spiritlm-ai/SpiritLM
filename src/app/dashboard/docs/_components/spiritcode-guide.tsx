import Link from "next/link";
import { IMAGES } from "@/configs/paths/images.paths";
import { PATHS } from "@/configs/paths/pages.paths";
import type { DocsCode } from "@/configs/types/docs.types";
import { CodeBlock } from "./code-block";
import { DocsTable } from "./docs-table";
import { GuideSection } from "./guide-section";

export function SpiritCodeGuide({ code }: { code: DocsCode }) {
  return (
    <GuideSection
      id={PATHS.DOCS.SPIRITCODE.slice(1)}
      title="SpiritCode"
      icon={IMAGES.ICON}
      description="Наш собственный терминальный кодинг-агент для работы с моделями SpiritLM. Linux, macOS и Windows, Python 3.12+."
    >
      <p>
        Опишите задачу обычным текстом: SpiritCode сам найдёт и прочитает нужные
        файлы, внесёт правки и предложит запустить команды. Он учитывает инструкции
        AGENTS.md, показывает diff и сохраняет сессии для продолжения работы.
      </p>
      <CodeBlock title="Установка" value={code.spiritcodeInstall} />
      <ol className="mt-4 list-decimal space-y-2 pl-5 marker:text-[#ffe02e]">
        <li>
          Создайте ключ в разделе{" "}
          <Link
            href={PATHS.DASHBOARD.KEYS}
            className="rounded text-[#ffe02e] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]"
          >
            API-ключи
          </Link>.
        </li>
        <li>
          Откройте терминал в папке проекта и выполните команду ниже. При первом
          запуске введите ключ в скрытом поле ввода.
        </li>
        <li>
          Выберите модель командой /model и опишите задачу. Для агентной работы
          нужна модель с поддержкой инструментов; остальные доступны в режиме чата.
        </li>
      </ol>
      <CodeBlock title="Запуск в папке проекта" value={code.spiritcodeLaunch} />
      <p className="mt-3">
        Ключ сохраняется в системном хранилище ключей. Если оно недоступно,
        ключ действует только в текущем процессе; для следующих запусков можно
        задать SPIRITLM_API_KEY в окружении.
      </p>
      <DocsTable
        caption="Команды SpiritCode в диалоге"
        columns={["Команда", "Действие"]}
        rows={[
          ["/model", "Найти и выбрать модель из каталога SpiritLM"],
          ["/profile, /balance, /subscription, /usage", "Посмотреть профиль, баланс, подписку и статистику"],
          ["/diff, /undo", "Посмотреть правки или отменить последнюю группу изменений"],
          ["/sessions, /resume <id>", "Найти и продолжить сохранённую сессию"],
          ["/context, /compact", "Посмотреть контекст или сжать его отдельным оплачиваемым запросом"],
          ["/help, /permission", "Открыть справку и выбрать режим разрешений"],
        ]}
      />
      <CodeBlock title="Команды вне диалога" value={code.spiritcodeCommands} />
      <p className="mt-4">
        Чтение и точечные правки внутри проекта разрешены автоматически.
        Через /permission (или /permissions) выберите стандартную защиту,
        выполнение без защиты с отдельным чекбоксом подтверждения удаления
        или полную защиту с подтверждением каждой shell-команды.
        В стандартном режиме Git, удаление, опасная перезапись и непрозрачные
        команды требуют разрешения. Настройки сохраняются для всех проектов.
        Доступ файловых инструментов вне проекта и чтение секретов требуют подтверждения.
        Через @путь можно явно прикрепить файл. /undo отменяет правки файлов,
        но не последствия выполненных команд.
      </p>
      <p className="mt-3">
        Оплата запросов и ограничения аккаунта действуют так же, как при работе
        через API. Пополнение, покупка подписки и управление ключами доступны
        в кабинете SpiritLM.
      </p>
    </GuideSection>
  );
}
