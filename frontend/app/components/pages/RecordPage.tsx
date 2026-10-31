"use client";

import { useEffect, useRef, useState } from "react";
import { Item, Recording, Summary } from "../../types";
import { ShimmerBox, ShimmerRow } from "../Shimmer";

const WEEK_ROWS = [
  { label: "Work log", color: "bg-violet-50 text-violet-700" },
  { label: "Tasks",    color: "bg-amber-50 text-amber-700" },
  { label: "Lists",    color: "bg-emerald-50 text-emerald-700" },
] as const;

function ThisWeekPanel({
  summaries,
  loading,
  onOpenWorkLog,
}: {
  summaries: Summary[];
  loading: boolean;
  onOpenWorkLog: () => void;
}) {
  const latest = summaries[0] ?? null;
  const workLogCount = latest?.lines.length ?? 0;

  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col gap-3 h-full">
      <div>
        <h2 className="text-sm font-bold text-[#15161A]">This week</h2>
        {!loading && (
          <p className="text-xs text-gray-400 mt-0.5">
            {workLogCount} items kept
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 mt-1">
          <ShimmerBox className="h-9 w-full rounded-lg" />
          <ShimmerBox className="h-9 w-full rounded-lg" />
          <ShimmerBox className="h-9 w-full rounded-lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mt-1">
          {WEEK_ROWS.map(({ label, color }, i) => (
            <div
              key={label}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${color}`}
            >
              <span className="text-xs font-semibold">{label}</span>
              <span className="text-xs font-bold">{i === 0 ? workLogCount : 0}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onOpenWorkLog}
        className="text-xs font-semibold text-[#4B3FE0] hover:underline text-left mt-auto pt-1"
      >
        Open this week&apos;s work log →
      </button>
    </div>
  );
}

function RecordingRow({
  recording,
  itemCounts,
  onReview,
}: {
  recording: Recording;
  itemCounts: { pending: number; kept: number } | null;
  onReview: (id: string) => void;
}) {
  const date = new Date(recording.created_at);
  const timeLabel = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dateLabel = isToday(date)
    ? `Today, ${timeLabel}`
    : isYesterday(date)
      ? `Yesterday, ${timeLabel}`
      : `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, ${timeLabel}`;

  const dur = recording.duration_s
    ? recording.duration_s < 60
      ? `0:${String(Math.round(recording.duration_s)).padStart(2, "0")}`
      : `${Math.floor(recording.duration_s / 60)}:${String(Math.round(recording.duration_s % 60)).padStart(2, "0")}`
    : null;

  const processing = recording.status !== "ready" && recording.status !== "failed";
  const allReviewed = recording.status === "ready" && itemCounts !== null && itemCounts.pending === 0;

  return (
    <div className="bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between border border-gray-100">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-[#15161A]">{dateLabel}</span>
        <span className="text-xs text-gray-400">
          {dur ? `${dur}` : "—"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {recording.status === "ready" && !allReviewed && itemCounts !== null && itemCounts.pending > 0 && (
          <>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {itemCounts.pending} item{itemCounts.pending !== 1 ? "s" : ""} to review
            </span>
            <button
              onClick={() => onReview(recording.id)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#15161A] text-white hover:bg-[#2d2f36] transition"
            >
              Review
            </button>
          </>
        )}
        {recording.status === "ready" && allReviewed && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
            {itemCounts!.kept} item{itemCounts!.kept !== 1 ? "s" : ""} kept
          </span>
        )}
        {recording.status === "ready" && itemCounts === null && (
          <button
            onClick={() => onReview(recording.id)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#15161A] text-white hover:bg-[#2d2f36] transition"
          >
            Review
          </button>
        )}
        {processing && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
            {statusLabel(recording.status)}
          </span>
        )}
        {recording.status === "failed" && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
            Failed
          </span>
        )}
      </div>
    </div>
  );
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    uploaded: "Uploaded",
    normalizing: "Normalizing…",
    transcribing: "Transcribing…",
    splitting: "Splitting into items…",
    routing: "Routing…",
    extracting: "Extracting…",
  };
  return map[s] ?? s;
}

function isToday(d: Date) {
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isYesterday(d: Date) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
}

interface RecordPageProps {
  token: string;
  onNavigateReview: () => void;
}

export function RecordPage({ token, onNavigateReview }: RecordPageProps) {
  const authHeader = { Authorization: `Bearer ${token}` };

  const [micActive, setMicActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(true);
  const [itemCountsMap, setItemCountsMap] = useState<Record<string, { pending: number; kept: number }>>({});
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [refreshTick, setRefreshTick] = useState(0);
  function triggerRefresh() { setRefreshTick((n) => n + 1); }

  useEffect(() => {
    const auth = { Authorization: `Bearer ${token}` };
    async function loadRecordings() {
      try {
        const data: Recording[] = await fetch("/api/v1/recordings", { headers: auth }).then((r) => r.json());
        setRecordings(data);
        setRecordingsLoading(false);
        const ready = data.filter((r) => r.status === "ready");
        const counts = await Promise.all(
          ready.map(async (r) => {
            const items: Item[] = await fetch(`/api/v1/recordings/${r.id}/items`, { headers: auth })
              .then((res) => res.json()).catch(() => []);
            return [r.id, {
              pending: items.filter((i) => i.status === "pending").length,
              kept: items.filter((i) => i.status === "approved").length,
            }] as [string, { pending: number; kept: number }];
          })
        );
        setItemCountsMap(Object.fromEntries(counts));
      } catch {
        setRecordingsLoading(false);
      }
    }
    void loadRecordings();
    const id = setInterval(() => void loadRecordings(), 3000);
    return () => clearInterval(id);
  }, [token, refreshTick]);

  useEffect(() => {
    const auth = { Authorization: `Bearer ${token}` };
    fetch("/api/v1/summaries", { headers: auth })
      .then((r) => r.json())
      .then((data) => { setSummaries(data); setSummariesLoading(false); })
      .catch(() => setSummariesLoading(false));
  }, [token]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const mr = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.start(100);
    mediaRef.current = mr;
    setMicActive(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  async function stopRecording() {
    if (!mediaRef.current) return;
    mediaRef.current.stop();
    mediaRef.current.stream.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    await new Promise<void>((res) => { mediaRef.current!.onstop = () => res(); });

    setMicActive(false);
    setUploading(true);

    const mimeType = chunksRef.current[0]?.type ?? "audio/webm";
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const form = new FormData();
    form.append("file", blob, `recording.${ext}`);

    try {
      setUploadError(null);
      const res = await fetch("/api/v1/recordings", { method: "POST", headers: authHeader, body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setUploadError(body?.detail ?? `Upload failed (${res.status})`);
      } else {
        triggerRefresh();
      }
    } catch {
      setUploadError("Upload failed — check your connection");
    } finally {
      setUploading(false);
    }
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <p className="text-xs text-gray-400 font-medium mb-2">{today}</p>
      <h1 className="text-[2.5rem] leading-tight font-black text-[#15161A] mb-2" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
        What&rsquo;s on your mind?<br />Just blurt it.
      </h1>
      <p className="text-sm text-gray-500 mb-8 max-w-lg">
        Talk for a minute. Blurt splits it into items and files each one. Nothing is saved until you approve it.
      </p>

      {/* Main two-column */}
      <div className="grid grid-cols-[1fr_260px] gap-5 mb-10">
        {/* Mic card */}
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
          <button
            onClick={micActive ? stopRecording : startRecording}
            disabled={uploading}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg ${
              micActive
                ? "bg-red-500 scale-110 shadow-red-200"
                : uploading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-[#4B3FE0] hover:brightness-110 shadow-indigo-200"
            }`}
          >
            {micActive ? (
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="7" y="7" width="14" height="14" rx="2" fill="white" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="9" y="3" width="10" height="16" rx="5" fill="white" />
                <path d="M4 14a10 10 0 0 0 20 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="14" y1="24" x2="14" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>

          {micActive ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[#5C5F6A] font-mono text-sm">{fmt(elapsed)}</span>
              <span className="text-xs text-red-500 font-medium animate-pulse">Recording…</span>
            </div>
          ) : uploading ? (
            <span className="text-sm text-gray-400">Uploading…</span>
          ) : (
            <span className="text-sm font-semibold text-[#15161A]">Tap to start</span>
          )}

          <p className="text-xs text-gray-400 text-center max-w-xs">
            Try: what you shipped today, what&rsquo;s blocking you, errands for tomorrow.
          </p>

          {uploadError && <p className="text-xs text-red-600 text-center">{uploadError}</p>}

          <label className="text-xs font-semibold text-[#4B3FE0] hover:underline cursor-pointer mt-1">
            or upload an audio file
            <input
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                setUploadError(null);
                const form = new FormData();
                form.append("file", file);
                try {
                  const res = await fetch("/api/v1/recordings", { method: "POST", headers: authHeader, body: form });
                  if (!res.ok) {
                    const body = await res.json().catch(() => null);
                    setUploadError(body?.detail ?? `Upload failed (${res.status})`);
                  } else {
                    triggerRefresh();
                  }
                } catch {
                  setUploadError("Upload failed — check your connection");
                } finally {
                  setUploading(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>

        {/* This week panel */}
        <ThisWeekPanel
          summaries={summaries}
          loading={summariesLoading}
          onOpenWorkLog={onNavigateReview}
        />
      </div>

      {/* Recent blurts */}
      <h2 className="text-xs font-semibold text-[#5C5F6A] uppercase tracking-widest mb-3">
        Recent blurts
      </h2>

      {recordingsLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => <ShimmerRow key={i} />)}
        </div>
      ) : recordings.length === 0 ? (
        <p className="text-sm text-gray-400">No recordings yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {recordings.map((r) => (
            <RecordingRow
              key={r.id}
              recording={r}
              itemCounts={itemCountsMap[r.id] ?? null}
              onReview={onNavigateReview}
            />
          ))}
        </div>
      )}
    </div>
  );
}
