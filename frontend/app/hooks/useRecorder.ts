"use client";

import { useRef, useState } from "react";

interface UseRecorderOptions {
  token: string;
  onUploaded: () => void;
}

interface UseRecorder {
  micActive: boolean;
  uploading: boolean;
  uploadError: string | null;
  elapsed: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
}

// Mic capture, the elapsed timer, and uploads to POST /api/v1/recordings.
export function useRecorder({ token, onUploaded }: UseRecorderOptions): UseRecorder {
  const [micActive, setMicActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function postForm(form: FormData) {
    setUploading(true);
    setUploadError(null);
    try {
      const res = await fetch("/api/v1/recordings", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setUploadError(body?.detail ?? `Upload failed (${res.status})`);
      } else {
        onUploaded();
      }
    } catch {
      setUploadError("Upload failed — check your connection");
    } finally {
      setUploading(false);
    }
  }

  async function start() {
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

  async function stop() {
    if (!mediaRef.current) return;
    mediaRef.current.stop();
    mediaRef.current.stream.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    await new Promise<void>((res) => { mediaRef.current!.onstop = () => res(); });
    setMicActive(false);

    const mimeType = chunksRef.current[0]?.type ?? "audio/webm";
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const form = new FormData();
    form.append("file", blob, `recording.${ext}`);
    await postForm(form);
  }

  async function uploadFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    await postForm(form);
  }

  return { micActive, uploading, uploadError, elapsed, start, stop, uploadFile };
}
