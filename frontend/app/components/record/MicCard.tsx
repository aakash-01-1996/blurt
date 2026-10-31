"use client";

interface MicCardProps {
  micActive: boolean;
  uploading: boolean;
  elapsed: number;
  uploadError: string | null;
  onToggle: () => void;
  onPickFile: (file: File) => void;
}

const RED = "#FF3B30";

// The recorder card: a record button that morphs circle → rounded-square.
export function MicCard({ micActive, uploading, elapsed, uploadError, onToggle, onPickFile }: MicCardProps) {
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="bg-surface rounded-3xl p-10 flex flex-col items-center justify-center gap-6 border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <button
        onClick={onToggle}
        disabled={uploading}
        aria-label={micActive ? "Stop recording" : "Start recording"}
        className={`relative w-[104px] h-[104px] rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          uploading ? "cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]"
        }`}
      >
        <span className="absolute inset-0 rounded-full border-2 border-black/10" />
        <span
          className="block transition-all duration-300 ease-out shadow-[0_6px_16px_rgba(255,59,48,0.35)]"
          style={{
            width: micActive ? 34 : 80,
            height: micActive ? 34 : 80,
            borderRadius: micActive ? 10 : 9999,
            background: uploading ? "#C7C7CC" : RED,
            boxShadow: uploading ? "none" : undefined,
          }}
        />
      </button>

      {micActive ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[#1D1D1F] font-mono text-lg tabular-nums">{fmt(elapsed)}</span>
          <span className="text-sm font-semibold" style={{ color: RED }}>Recording</span>
        </div>
      ) : uploading ? (
        <span className="text-base text-[#86868B]">Uploading…</span>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className="text-lg font-semibold text-[#1D1D1F]">Tap to record</span>
          <span className="text-sm text-[#86868B]">Try: what you shipped, what&rsquo;s blocking you</span>
        </div>
      )}

      {uploadError && <p className="text-sm text-red-600 text-center">{uploadError}</p>}

      <label className="text-sm font-medium text-[#0071E3] hover:underline cursor-pointer underline-offset-2">
        or upload an audio file
        <input
          type="file"
          accept="audio/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPickFile(file);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
