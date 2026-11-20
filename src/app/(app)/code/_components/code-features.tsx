import { IconFolderCode, IconGitBranch, IconHistory } from "@tabler/icons-react";
import { PATHS } from "@/configs/paths/pages.paths";

export function CodeFeatures() {
  return (
    <section
      id={PATHS.CODE.FEATURES.slice(1)}
      aria-labelledby="code-features-title"
      className="scroll-mt-8 bg-spirit-section"
    >
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-7 sm:py-18 lg:px-10">
        <h2
          id="code-features-title"
          className="font-heading text-3xl leading-tight font-bold tracking-tighter sm:text-4xl"
        >
          Как SpiritCode работает с проектом
        </h2>

        <ul role="list" className="mt-7 grid gap-3 sm:mt-8 md:grid-cols-3">
          <li className="rounded-[15px] bg-spirit-surface p-5">
            <IconFolderCode aria-hidden="true" size={27} stroke={1.5} className="text-spirit-accent" />
            <h3 className="mt-4 text-lg font-bold tracking-tight">Контекст проекта</h3>
            <p className="mt-2 text-pretty text-spirit-muted">
              Агент читает нужные файлы и учитывает правила из <code>AGENTS.md</code>.
              Чтобы явно добавить файл в контекст, укажите <code>@путь</code>.
            </p>
          </li>
          <li className="rounded-[15px] bg-spirit-surface p-5">
            <IconGitBranch aria-hidden="true" size={27} stroke={1.5} className="text-spirit-accent" />
            <h3 className="mt-4 text-lg font-bold tracking-tight">Контроль правок</h3>
            <p className="mt-2 text-pretty text-spirit-muted">
              Посмотрите изменения через <code>/diff</code> и отмените последнюю группу правок файлов
              через <code>/undo</code>. Подтверждения команд настраиваются через <code>/permissions</code>.
            </p>
          </li>
          <li className="rounded-[15px] bg-spirit-surface p-5">
            <IconHistory aria-hidden="true" size={27} stroke={1.5} className="text-spirit-accent" />
            <h3 className="mt-4 text-lg font-bold tracking-tight">История сессий</h3>
            <p className="mt-2 text-pretty text-spirit-muted">
              Найдите прошлый диалог через <code>/sessions</code> и вернитесь к задаче
              через <code>/resume &lt;id&gt;</code>.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}
