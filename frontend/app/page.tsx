"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AuthGate from "./auth";

const TOKEN_KEY = "blurt_token";

function useAuth() {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null
  );

  function login(t: string) {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  return { token, login, logout };
}

interface Summary {
  id: string;
  week_start: string;
  lines: string[];
  created_at: string;
}

type RecordingStatus =
  | "uploaded"
  | "normalizing"
  | "transcribing"
  | "splitting"
  | "routing"
  | "extracting"
  | "ready"
  | "failed";

type ItemStatus = "pending" | "approved" | "rejected";

interface Recording {
  id: string;
  status: RecordingStatus;
  duration_s: number | null;
  created_at: string;
}

interface Item {
  id: string;
  section: string;
  status: ItemStatus;
  span_text: string;
  route_confidence: number | null;
  fields: Record<string, string> | null;
  followup_question: string | null;
}

const STATUS_COLORS: Record<RecordingStatus, string> = {
  uploaded: "bg-gray-100 text-gray-600",
  normalizing: "bg-blue-100 text-blue-700",
  transcribing: "bg-blue-100 text-blue-700",
  splitting: "bg-blue-100 text-blue-700",
  routing: "bg-blue-100 text-blue-700",
  extracting: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const SECTION_LABELS: Record<string, string> = {
  work_log: "Work Log",
  task: "Task",
  note: "Note",
};

const SECTION_COLORS: Record<string, string> = {
  work_log: "bg-violet-100 text-violet-700",
  task: "bg-amber-100 text-amber-700",
  note: "bg-sky-100 text-sky-700",
};

function ItemCard({
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

function SummaryCard({ summary }: { summary: Summary }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const res = await fetch(`/api/v1/summaries/${summary.id}/export?format=txt`);
    if (!res.ok) return;
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const url = `/api/v1/summaries/${summary.id}/export?format=md`;
    const a = document.createElement("a");
    a.href = url;
    a.click();
  }

  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#5C5F6A] font-mono">
          Week of {new Date(summary.week_start).toLocaleDateString()}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            .md
          </button>
        </div>
      </div>
      <ul className="flex flex-col gap-1">
        {summary.lines.map((line, i) => (
          <li key={i} className="text-sm text-gray-700 flex gap-2">
            <span className="text-[#4B3FE0] mt-0.5">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AppShell({ token, onLogout }: { token: string; onLogout: () => void }) {
  const authHeader = { Authorization: `Bearer ${token}` };

  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<string, Item[]>>({});
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRecordings = useCallback(() => {
    fetch("/api/v1/recordings", { headers: authHeader })
      .then((r) => r.json())
      .then(setRecordings)
      .catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchRecordings();
    const id = setInterval(fetchRecordings, 2000);
    return () => clearInterval(id);
  }, [fetchRecordings]);

  const fetchItems = useCallback(
    (recordingId: string) => {
      fetch(`/api/v1/recordings/${recordingId}/items`, { headers: authHeader })
        .then((r) => r.json())
        .then((items: Item[]) =>
          setItemsMap((prev) => ({ ...prev, [recordingId]: items }))
        )
        .catch(() => {});
    },
    [token] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const fetchSummaries = useCallback(() => {
    fetch("/api/v1/summaries", { headers: authHeader })
      .then((r) => r.json())
      .then(setSummaries)
      .catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const handleGenerateSummary = useCallback(async () => {
    setGeneratingSummary(true);
    try {
      const res = await fetch("/api/v1/summaries/generate", {
        method: "POST",
        headers: authHeader,
      });
      if (res.status === 409) {
        await fetch("/api/v1/summaries/regenerate", { method: "POST", headers: authHeader });
      }
      setTimeout(fetchSummaries, 3000);
    } finally {
      setGeneratingSummary(false);
    }
  }, [fetchSummaries, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpand = useCallback(
    (r: Recording) => {
      if (r.status !== "ready") return;
      const next = expandedId === r.id ? null : r.id;
      setExpandedId(next);
      if (next) fetchItems(next);
    },
    [expandedId, fetchItems]
  );

  const handleReview = useCallback(
    async (itemId: string, action: "approve" | "reject", recordingId: string) => {
      const res = await fetch(`/api/v1/items/${itemId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) return;
      const updated: Item = await res.json();
      setItemsMap((prev) => ({
        ...prev,
        [recordingId]: (prev[recordingId] ?? []).map((i) =>
          i.id === itemId ? updated : i
        ),
      }));
    },
    [token]
  );

  const handlePatch = useCallback(
    async (itemId: string, fields: Record<string, string>, recordingId: string) => {
      const res = await fetch(`/api/v1/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) return;
      const updated: Item = await res.json();
      setItemsMap((prev) => ({
        ...prev,
        [recordingId]: (prev[recordingId] ?? []).map((i) =>
          i.id === itemId ? updated : i
        ),
      }));
    },
    [token]
  );

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";
    const mr = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.start(100);
    mediaRef.current = mr;
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  async function stopRecording() {
    if (!mediaRef.current) return;
    mediaRef.current.stop();
    mediaRef.current.stream.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);

    await new Promise<void>((resolve) => {
      mediaRef.current!.onstop = () => resolve();
    });

    setRecording(false);
    setUploading(true);

    const mimeType = chunksRef.current[0]?.type ?? "audio/webm";
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const form = new FormData();
    form.append("file", blob, `recording.${ext}`);

    try {
      setUploadError(null);
      const res = await fetch("/api/v1/recordings", {
        method: "POST",
        headers: authHeader,
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setUploadError(body?.detail ?? `Upload failed (${res.status})`);
      }
    } catch {
      setUploadError("Upload failed — check your connection");
    } finally {
      setUploading(false);
    }
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <main className="min-h-screen bg-[#F4F5F7] p-8 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1
          className="text-3xl font-black text-[#15161A]"
          style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
        >
          Blurt
        </h1>
        <button
          onClick={onLogout}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          Log out
        </button>
      </div>

      {/* Record button */}
      <div className="flex flex-col items-center gap-4 mb-10">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={uploading}
          className={`w-24 h-24 rounded-full text-white text-sm font-semibold transition-all ${
            recording
              ? "bg-red-500 scale-110"
              : uploading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#4B3FE0] hover:brightness-110"
          }`}
        >
          {uploading ? "Uploading\u2026" : recording ? "Stop" : "Record"}
        </button>
        {recording && (
          <span className="text-[#5C5F6A] font-mono text-sm">{fmt(elapsed)}</span>
        )}
        {uploadError && (
          <p className="text-sm text-red-600 text-center">{uploadError}</p>
        )}
      </div>

      {/* Recent blurts */}
      <h2 className="text-sm font-semibold text-[#5C5F6A] uppercase tracking-wide mb-3">
        Recent blurts
      </h2>
      {recordings.length === 0 ? (
        <p className="text-[#5C5F6A] text-sm">No recordings yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {recordings.map((r) => (
            <li key={r.id} className="flex flex-col gap-2">
              {/* Recording row */}
              <button
                onClick={() => toggleExpand(r)}
                disabled={r.status !== "ready"}
                className={`bg-white rounded-2xl p-4 flex items-center justify-between w-full text-left transition ${
                  r.status === "ready"
                    ? "hover:shadow-sm cursor-pointer"
                    : "cursor-default"
                }`}
              >
                <span className="text-xs text-[#5C5F6A] font-mono">
                  {r.duration_s ? `${r.duration_s.toFixed(1)}s` : "\u2014"}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[r.status]}`}
                  >
                    {r.status}
                  </span>
                  {r.status === "ready" && (
                    <span className="text-xs text-gray-400">
                      {expandedId === r.id ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              </button>

              {/* Items panel */}
              {expandedId === r.id && (
                <div className="flex flex-col gap-2 pl-2">
                  {(itemsMap[r.id] ?? []).length === 0 ? (
                    <p className="text-sm text-gray-400 px-2">No items extracted.</p>
                  ) : (
                    (itemsMap[r.id] ?? []).map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onReview={(id, action) => handleReview(id, action, r.id)}
                        onPatch={(id, fields) => handlePatch(id, fields, r.id)}
                      />
                    ))
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Weekly summary */}
      <div className="flex items-center justify-between mt-10 mb-3">
        <h2 className="text-sm font-semibold text-[#5C5F6A] uppercase tracking-wide">
          This week
        </h2>
        <button
          onClick={handleGenerateSummary}
          disabled={generatingSummary}
          className="text-xs font-semibold px-3 py-1 rounded-full bg-[#4B3FE0] text-white hover:brightness-110 transition disabled:opacity-50"
        >
          {generatingSummary ? "Generating…" : "Generate"}
        </button>
      </div>
      {summaries.length === 0 ? (
        <p className="text-[#5C5F6A] text-sm">No summary yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {summaries.map((s) => (
            <SummaryCard key={s.id} summary={s} />
          ))}
        </div>
      )}
    </main>
  );
}

export default function Home() {
  const { token, login, logout } = useAuth();
  if (!token) return <AuthGate onAuth={login} />;
  return <AppShell token={token} onLogout={logout} />;
}
