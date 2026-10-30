"use client";

import { useState } from "react";
import { Item, SECTION_COLORS, SECTION_LABELS } from "../types";

export function ItemCard({
  item,
  onReview,
  onPatch,
}: {
  item: Item;
  onReview: (id: string, action: "approve" | "reject") => void;
  onPatch: (id: string, fields: Record<string, string>) => Promise<void>;
}) {
  const reviewed = item.status !== "pending";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(Object.fromEntries(Object.entries(item.fields ?? {}).map(([k, v]) => [k, v])));
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await onPatch(item.id, draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 transition-opacity ${
        reviewed && item.status !== "approved" ? "opacity-60" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            SECTION_COLORS[item.section] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {SECTION_LABELS[item.section] ?? item.section}
        </span>
        {reviewed && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              item.status === "approved"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {item.status}
          </span>
        )}
        {item.status === "approved" && !editing && (
          <button
            onClick={startEdit}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Edit
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 italic">&ldquo;{item.span_text}&rdquo;</p>

      {item.fields && Object.keys(item.fields).length > 0 && !editing && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {Object.entries(item.fields).map(([k, v]) => (
            <>
              <dt key={`k-${k}`} className="text-gray-400 font-medium capitalize">
                {k.replace(/_/g, " ")}
              </dt>
              <dd key={`v-${k}`} className="text-gray-700">
                {v}
              </dd>
            </>
          ))}
        </dl>
      )}

      {editing && (
        <div className="flex flex-col gap-2">
          {Object.entries(draft).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-400 font-medium capitalize">
                {k.replace(/_/g, " ")}
              </label>
              <input
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4B3FE0]/30"
                value={v}
                onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex-1 text-sm font-semibold py-1.5 rounded-lg bg-[#4B3FE0] text-white hover:brightness-110 transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="flex-1 text-sm font-semibold py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!reviewed && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onReview(item.id, "approve")}
            className="flex-1 text-sm font-semibold py-1.5 rounded-lg bg-[#4B3FE0] text-white hover:brightness-110 transition"
          >
            Approve
          </button>
          <button
            onClick={() => onReview(item.id, "reject")}
            className="flex-1 text-sm font-semibold py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
