"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
}: {
  item: Item;
  onReview: (id: string, action: "approve" | "reject") => void;
}) {
  const reviewed = item.status !== "pending";

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 transition-opacity ${
        reviewed ? "opacity-60" : "bg-white border-gray-200"
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
      </div>

      <p className="text-sm text-gray-500 italic">&ldquo;{item.span_text}&rdquo;</p>

      {item.fields && Object.keys(item.fields).length > 0 && (
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

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<string, Item[]>>({});
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRecordings = useCallback(() => {
    fetch("/api/v1/recordings")
      .then((r) => r.json())
      .then(setRecordings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRecordings();
    const id = setInterval(fetchRecordings, 2000);
    return () => clearInterval(id);
  }, [fetchRecordings]);

  const fetchItems = useCallback((recordingId: string) => {
    fetch(`/api/v1/recordings/${recordingId}/items`)
      .then((r) => r.json())
      .then((items: Item[]) =>
        setItemsMap((prev) => ({ ...prev, [recordingId]: items }))
      )
      .catch(() => {});
  }, []);

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
        headers: { "Content-Type": "application/json" },
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
    []
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
      const res = await fetch("/api/v1/recordings", { method: "POST", body: form });
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
      <h1
        className="text-3xl font-black text-[#15161A] mb-8"
        style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
      >
        Blurt
      </h1>

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
                      />
                    ))
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
