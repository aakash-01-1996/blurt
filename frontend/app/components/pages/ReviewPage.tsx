"use client";

import { useEffect, useState } from "react";
import { Item, Recording, SECTION_COLORS, SECTION_LABELS } from "../../types";
import { ShimmerCard } from "../Shimmer";

type FilterSection = "all" | "work_log" | "task" | "note" | "unsorted";

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null;
  const label = confidence >= 0.85 ? "High confidence" : confidence >= 0.6 ? "Medium confidence" : "Low confidence";
  const color = confidence >= 0.85 ? "text-green-600" : confidence >= 0.6 ? "text-amber-600" : "text-red-600";
  return <span className={`text-xs font-medium ${color}`}>{label}</span>;
}

function ReviewItemCard({
  item,
  onReview,
  onPatch,
}: {
  item: Item;
  onReview: (id: string, action: "approve" | "reject") => void;
  onPatch: (id: string, fields: Record<string, string>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const reviewed = item.status !== "pending";

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
    <div className={`bg-white rounded-2xl p-5 flex flex-col gap-4 transition-opacity ${reviewed && item.status !== "approved" ? "opacity-50" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SECTION_COLORS[item.section] ?? "bg-gray-100 text-gray-600"}`}>
          {SECTION_LABELS[item.section] ?? item.section}
        </span>
        <ConfidenceBadge confidence={item.route_confidence} />
        {reviewed && (
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {item.status}
          </span>
        )}
      </div>

      {/* Title — first field or span_text */}
      <h3 className="text-base font-bold text-[#15161A] leading-snug -mt-1">
        {item.fields?.accomplishment ?? item.fields?.title ?? item.span_text}
      </h3>

      {/* Fields */}
      {item.fields && Object.keys(item.fields).length > 0 && !editing && (
        <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1.5 text-sm">
          {Object.entries(item.fields).map(([k, v]) => (
            <>
              <dt key={`k-${k}`} className="text-gray-400 font-medium capitalize">{k.replace(/_/g, " ")}</dt>
              <dd key={`v-${k}`} className="text-gray-700">{v || <span className="text-gray-300 italic">Not mentioned</span>}</dd>
            </>
          ))}
        </dl>
      )}

      {/* Inline edit */}
      {editing && (
        <div className="flex flex-col gap-2">
          {Object.entries(draft).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-400 font-medium capitalize">{k.replace(/_/g, " ")}</label>
              <input
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4B3FE0]/30"
                value={v}
                onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={saveEdit} disabled={saving}
              className="flex-1 text-sm font-semibold py-1.5 rounded-lg bg-[#4B3FE0] text-white hover:brightness-110 transition disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} disabled={saving}
              className="flex-1 text-sm font-semibold py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quote */}
      <p className="text-xs text-gray-400 italic border-l-2 border-gray-200 pl-3 -mt-1">
        &ldquo;{item.span_text}&rdquo;
      </p>

      {/* Actions */}
      {!reviewed && !editing && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onReview(item.id, "approve")}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-[#15161A] text-white hover:bg-[#2d2f36] transition"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3.5 3.5L12 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Approve
          </button>
          <button onClick={startEdit}
            className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-200 text-[#15161A] hover:bg-gray-50 transition">
            Edit
          </button>
          <button
            onClick={() => onReview(item.id, "reject")}
            className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-red-500 transition ml-auto">
            Reject
          </button>
        </div>
      )}
      {reviewed && item.status === "approved" && !editing && (
        <button onClick={startEdit} className="text-xs text-gray-400 hover:text-gray-600 transition self-start">
          Edit
        </button>
      )}
    </div>
  );
}

interface ReviewPageProps {
  token: string;
  onCountChange: (n: number) => void;
}

export function ReviewPage({ token, onCountChange }: ReviewPageProps) {
  const authHeader = { Authorization: `Bearer ${token}` };
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, Item[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterSection>("all");

  useEffect(() => {
    let cancelled = false;
    const auth = { Authorization: `Bearer ${token}` };
    async function fetchAll() {
      const res = await fetch("/api/v1/recordings", { headers: auth }).then((r) => r.json()).catch(() => []);
      if (cancelled) return;
      const ready: Recording[] = (res as Recording[]).filter((r) => r.status === "ready");
      setRecordings(ready);

      const entries = await Promise.all(
        ready.map(async (r) => {
          const items: Item[] = await fetch(`/api/v1/recordings/${r.id}/items`, { headers: auth })
            .then((res) => res.json())
            .catch(() => []);
          return [r.id, items] as [string, Item[]];
        })
      );
      if (cancelled) return;

      const map = Object.fromEntries(entries);
      setItemsMap(map);
      const pending = Object.values(map).flat().filter((i) => i.status === "pending").length;
      onCountChange(pending);
      setLoading(false);
    }
    void fetchAll();
    return () => { cancelled = true; };
  }, [token, onCountChange]);

  const allItems = recordings.flatMap((r) => (itemsMap[r.id] ?? []).map((item) => ({ item, recordingId: r.id })));

  const filtered = filter === "all"
    ? allItems
    : filter === "unsorted"
      ? allItems.filter(({ item }) => !item.section || item.section === "unsorted")
      : allItems.filter(({ item }) => item.section === filter);

  const pendingCount = allItems.filter(({ item }) => item.status === "pending").length;

  const sectionCounts: Record<FilterSection, number> = {
    all: allItems.length,
    work_log: allItems.filter(({ item }) => item.section === "work_log").length,
    task: allItems.filter(({ item }) => item.section === "task").length,
    note: allItems.filter(({ item }) => item.section === "note").length,
    unsorted: allItems.filter(({ item }) => !item.section || item.section === "unsorted").length,
  };

  const FILTERS: { key: FilterSection; label: string }[] = [
    { key: "all", label: "All" },
    { key: "work_log", label: "Work log" },
    { key: "task", label: "Tasks" },
    { key: "note", label: "Notes" },
    { key: "unsorted", label: "Unsorted" },
  ];

  async function handleReview(itemId: string, action: "approve" | "reject", recordingId: string) {
    const res = await fetch(`/api/v1/items/${itemId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return;
    const updated: Item = await res.json();
    setItemsMap((prev) => ({
      ...prev,
      [recordingId]: (prev[recordingId] ?? []).map((i) => (i.id === itemId ? updated : i)),
    }));
    const newPending = Object.values({ ...itemsMap, [recordingId]: (itemsMap[recordingId] ?? []).map((i) => (i.id === itemId ? updated : i)) })
      .flat().filter((i) => i.status === "pending").length;
    onCountChange(newPending);
  }

  async function handlePatch(itemId: string, fields: Record<string, string>, recordingId: string) {
    const res = await fetch(`/api/v1/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) return;
    const updated: Item = await res.json();
    setItemsMap((prev) => ({
      ...prev,
      [recordingId]: (prev[recordingId] ?? []).map((i) => (i.id === itemId ? updated : i)),
    }));
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-black text-[#15161A]" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Review inbox
        </h1>
        <span className="text-xs text-gray-400 flex items-center gap-1 mt-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="#9CA3AF" strokeWidth="1.2" />
            <path d="M6 4v2.5L7.5 8" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Nothing is saved until you approve it.
        </span>
      </div>
      {!loading && pendingCount > 0 && (
        <p className="text-sm text-gray-500 mb-5">{pendingCount} item{pendingCount !== 1 ? "s" : ""} to review</p>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {FILTERS.filter(({ key }) => sectionCounts[key] > 0 || key === "all").map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-sm font-semibold px-3 py-1.5 rounded-full transition ${
              filter === key
                ? "bg-[#15161A] text-white"
                : "bg-white text-[#5C5F6A] hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {label}
            {sectionCounts[key] > 0 && (
              <span className={`ml-1.5 text-xs ${filter === key ? "text-white/70" : "text-gray-400"}`}>
                · {sectionCounts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => <ShimmerCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#E5E7EB" strokeWidth="2" />
            <path d="M10 16l4 4 8-8" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm text-gray-400">All caught up — nothing to review.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(({ item, recordingId }) => (
            <ReviewItemCard
              key={item.id}
              item={item}
              onReview={(id, action) => handleReview(id, action, recordingId)}
              onPatch={(id, fields) => handlePatch(id, fields, recordingId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
