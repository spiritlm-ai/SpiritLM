import type { ReactNode } from "react";

export function GuideSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 rounded-[18px] bg-[#1b1b1b] p-5 sm:p-6"
      aria-labelledby={id + "-title"}
    >
      <h2
        id={id + "-title"}
        className="text-lg font-semibold tracking-tight text-[#f3f2ee] sm:text-xl"
      >
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#a5a5a1]">{description}</p>
      <div className="mt-5 text-sm leading-6 text-[#c5c5c0]">{children}</div>
    </section>
  );
}
