"use client";

import { Item } from "../../types";

/** Section-aware key/value rows (Impact/Project, When/Goes to, …) for a review card. */
/** Coerce a possibly-array field value to a single display string, or null if empty. */
function asText(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v.length ? v.join(", ") : null;
  return v ? v : null;
}

export function FieldRows({ item }: { item: Item }) {
  const f = item.fields ?? {};

  // Lists render their items as a bulleted list rather than key/value rows.
  if (item.section === "list") {
    const items = Array.isArray(f.items) ? f.items : [];
    if (items.length === 0) return null;
    return (
      <ul className="flex flex-col gap-1.5 text-[15px]">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-[#1D1D1F]">
            <span className="text-[#2E8B57] mt-0.5">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    );
  }

  let rows: [string, string | null][] = [];

  if (item.section === "work_log") {
    rows = [
      ["Impact", asText(f.impact)],
      ["Project", asText(f.project)],
    ];
  } else if (item.section === "task") {
    rows = [
      ["When", asText(f.when ?? f.due ?? f.due_date)],
      ["Goes to", asText(f.destination) ?? "Google Calendar"],
    ];
  } else {
    rows = Object.entries(f).map(([k, v]) => [k.replace(/_/g, " "), asText(v)]);
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
