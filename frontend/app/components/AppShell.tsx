"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Item, Recording, STATUS_COLORS, Summary, WorkLogEntry } from "../types";
import { ItemCard } from "./ItemCard";
import { SummaryCard } from "./SummaryCard";

export function AppShell({ token, onLogout }: { token: string; onLogout: () => void }) {
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
  const [activeTab, setActiveTab] = useState<"blurts" | "work-log">("blurts");
  const [workLog, setWorkLog] = useState<WorkLogEntry[]>([]);
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
        .then((items: Item[]) => setItemsMap((prev) => ({ ...prev, [recordingId]: items })))
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

  const fetchWorkLog = useCallback(() => {
    fetch("/api/v1/work-log", { headers: authHeader })
      .then((r) => r.json())
      .then(setWorkLog)
      .catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "work-log") fetchWorkLog();
  }, [activeTab, fetchWorkLog]);

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
        [recordingId]: (prev[recordingId] ?? []).map((i) => (i.id === itemId ? updated : i)),
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
        [recordingId]: (prev[recordingId] ?? []).map((i) => (i.id === itemId ? updated : i)),
      }));
    },
    [token]
  );

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
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

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-8">
        {(["blurts", "work-log"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-sm font-semibold py-1.5 rounded-md transition ${
              activeTab === tab ? "bg-white text-[#15161A] shadow-sm" : "text-[#5C5F6A]"
            }`}
          >
            {tab === "blurts" ? "Blurts" : "Work Log"}
          </button>
        ))}
      </div>

      {activeTab === "work-log" && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#5C5F6A] uppercase tracking-wide">
              Work Log
            </h2>
            <button
              onClick={fetchWorkLog}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Refresh
            </button>
          </div>
          {workLog.length === 0 ? (
            <p className="text-[#5C5F6A] text-sm">
              No entries yet. Approve work log items to populate this view.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {workLog.map((entry) => (
                <li key={entry.id} className="bg-white rounded-2xl p-4 flex flex-col gap-1">
                  {entry.accomplishment && (
                    <p className="text-sm text-gray-800 font-medium">{entry.accomplishment}</p>
                  )}
                  {entry.impact && <p className="text-sm text-gray-500">{entry.impact}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    {entry.project && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                        {entry.project}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 font-mono">
                      {entry.occurred_on
                        ? new Date(entry.occurred_on).toLocaleDateString()
                        : new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === "blurts" && (
        <>
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
                  <button
                    onClick={() => toggleExpand(r)}
                    disabled={r.status !== "ready"}
                    className={`bg-white rounded-2xl p-4 flex items-center justify-between w-full text-left transition ${
                      r.status === "ready" ? "hover:shadow-sm cursor-pointer" : "cursor-default"
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
        </>
      )}
    </main>
  );
}
