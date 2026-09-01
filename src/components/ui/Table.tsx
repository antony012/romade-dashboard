import type { ReactNode } from "react";

export function Table({
  headers,
  children,
}: {
  headers: ReactNode[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/80 shadow-sm shadow-zinc-950/5 backdrop-blur">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-100 text-left text-sm">
          <thead className="bg-zinc-50/80">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">{children}</tbody>
        </table>
      </div>
    </div>
  );
}
