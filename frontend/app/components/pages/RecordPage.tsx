"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Recording, STATUS_COLORS, Summary } from "../../types";
import { ShimmerBox, ShimmerRow } from "../Shimmer";

function ThisWeekPanel({
  summaries,
  loading,
  onGenerate,
  generating,
  onOpenWorkLog,
}: {
  summaries: Summary[];
  loading: boolean;
  onGenerate: () => void;
  generating: boolean;
  onOpenWorkLog: () => void;
}) {
  const latest = summaries[0] ?? null;

  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#15161A]">This week</h2>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#4B3FE0] text-white hover:brightness-110 transition disabled:opacity-50"
        >
          {generating ? "…" : "Generate"}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          <ShimmerBox className="h-3 w-28" />
          <ShimmerBox className="h-10 w-full rounded-xl" />
          <ShimmerBox className="h-10 w-full rounded-xl" />
        </div>
      ) : latest ? (
        <>
          <p className="text-[11px] text-gray-400 font-mono -mt-2">
            {new Date(latest.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" – "}
            {new Date(
              new Date(latest.week_start).getTime() + 6 * 24 * 60 * 60 * 1000
            ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          <div className="flex flex-col gap-1.5">
            {(
              [
                { label: "Work log", count: latest.lines.length, color: "bg-violet-100 text-violet-700" },
              ] as const
            ).map(({ label, count, color }) => (
              <div
                key={label}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${color}`}
              >
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-xs font-bold">{count}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onOpenWorkLog}
            className="text-xs font-semibold text-[#4B3FE0] hover:underline text-left mt-auto"
          >
            Open this week&apos;s work log →
          </button>
        </>
      ) : (
        <p className="text-xs text-gray-400">No summary yet for this week.</p>
      )}
    </div>
  );
}

function RecordingRow({
  recording,
  onReview,
}: {
  recording: Recording;
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

  return (
    <div className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-[#15161A]">{dateLabel}</span>
        <span className="text-xs text-gray-400 font-mono">
          {dur ? `${dur} · ` : ""}
          {recording.status === "failed"
            ? "Failed"
            : processing
              ? statusLabel(recording.status)
              : "Ready"}
        </span>
      </div>

      {recording.status === "ready" && (
        <button
          onClick={() => onReview(recording.id)}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#15161A] text-white hover:bg-[#2d2f36] transition"
        >
          Review
        </button>
      )}
      {processing && (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[recording.status]}`}>
          {statusLabel(recording.status)}
        </span>
      )}
      {recording.status === "failed" && (
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
          Failed
        </span>
      )}
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
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRecordings = useCallback(() => {
    fetch("/api/v1/recordings", { headers: authHeader })
      .then((r) => r.json())
      .then((data) => {
        setRecordings(data);
        setRecordingsLoading(false);
      })
      .catch(() => setRecordingsLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchRecordings();
    const id = setInterval(fetchRecordings, 3000);
    return () => clearInterval(id);
  }, [fetchRecordings]);

  const fetchSummaries = useCallback(() => {
    fetch("/api/v1/summaries", { headers: authHeader })
      .then((r) => r.json())
      .then((data) => {
        setSummaries(data);
        setSummariesLoading(false);
      })
      .catch(() => setSummariesLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/v1/summaries/generate", { method: "POST", headers: authHeader });
      if (res.status === 409) {
        await fetch("/api/v1/summaries/regenerate", { method: "POST", headers: authHeader });
      }
      setTimeout(fetchSummaries, 3000);
    } finally {
      setGenerating(false);
    }
  }

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
        fetchRecordings();
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
      <p className="text-xs text-gray-400 font-medium mb-1">{today}</p>
      <h1 className="text-2xl font-black text-[#15161A] mb-1" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
        What&rsquo;s on your mind? Just blurt it.
      </h1>
      <p className="text-sm text-gray-500 mb-8">
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
                    fetchRecordings();
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
          onGenerate={handleGenerate}
          generating={generating}
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
            <RecordingRow key={r.id} recording={r} onReview={onNavigateReview} />
          ))}
        </div>
      )}
    </div>
  );
}
