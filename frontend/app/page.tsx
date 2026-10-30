"use client";

import { useEffect, useRef, useState } from "react";

type RecordingStatus =
  | "uploaded"
  | "normalizing"
  | "transcribing"
  | "splitting"
  | "routing"
  | "extracting"
  | "ready"
  | "failed";

interface Recording {
  id: string;
  status: RecordingStatus;
  duration_s: number | null;
  created_at: string;
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

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll recordings every 2s
  useEffect(() => {
    const fetchRecordings = () => {
      fetch("/api/v1/recordings")
        .then((r) => r.json())
        .then(setRecordings)
        .catch(() => {});
    };
    fetchRecordings();
    const id = setInterval(fetchRecordings, 2000);
    return () => clearInterval(id);
  }, []);

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
    timerRef.current && clearInterval(timerRef.current);

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
      await fetch("/api/v1/recordings", { method: "POST", body: form });
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
      </div>

      {/* Recent blurts */}
      <h2 className="text-sm font-semibold text-[#5C5F6A] uppercase tracking-wide mb-3">
        Recent blurts
      </h2>
      {recordings.length === 0 ? (
        <p className="text-[#5C5F6A] text-sm">No recordings yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recordings.map((r) => (
            <li
              key={r.id}
              className="bg-white rounded-2xl p-4 flex items-center justify-between"
            >
              <span className="text-xs text-[#5C5F6A] font-mono">
                {r.duration_s ? `${r.duration_s.toFixed(1)}s` : "\u2014"}
              </span>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[r.status]}`}
              >
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
