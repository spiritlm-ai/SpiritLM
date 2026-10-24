import type { ReactNode } from "react";

export function DocsTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <div
      className="mt-4 overflow-x-auto rounded-xl bg-[#111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe02e]"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className="w-full min-w-[560px] text-left text-sm leading-6">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-[#f3f2ee]">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-4 py-3 font-medium"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 align-top first:font-mono first:text-xs first:text-[#f3f2ee]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
