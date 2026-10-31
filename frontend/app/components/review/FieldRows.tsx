"use client";

import { Item } from "../../types";

/** Section-aware key/value rows (Impact/Project, When/Goes to, …) for a review card. */
export function FieldRows({ item }: { item: Item }) {
  const f = item.fields ?? {};
  let rows: [string, string | null][] = [];

  if (item.section === "work_log") {
    rows = [
      ["Impact", f.impact ?? null],
      ["Project", f.project ?? null],
    ];
  } else if (item.section === "task") {
    rows = [
      ["When", f.when ?? f.due ?? f.due_date ?? null],
      ["Goes to", f.destination ?? "Google Calendar"],
    ];
  } else {
    rows = Object.entries(f).map(([k, v]) => [k.replace(/_/g, " "), v || null]);
  }

  if (rows.length === 0) return null;

  return (
    <dl className="grid grid-cols-[88px_1fr] gap-x-4 gap-y-2 text-[15px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-gray-400 font-medium capitalize">{k}</dt>
          <dd className="text-[#1D1D1F] font-medium">
            {v ?? <span className="text-gray-400 font-normal">Not mentioned</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
