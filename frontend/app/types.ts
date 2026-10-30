export interface Summary {
  id: string;
  week_start: string;
  lines: string[];
  created_at: string;
}

export interface WorkLogEntry {
  id: string;
  item_id: string;
  accomplishment: string | null;
  impact: string | null;
  project: string | null;
  occurred_on: string | null;
  created_at: string;
}

export type RecordingStatus =
  | "uploaded"
  | "normalizing"
  | "transcribing"
  | "splitting"
  | "routing"
  | "extracting"
  | "ready"
  | "failed";

export type ItemStatus = "pending" | "approved" | "rejected";

export interface Recording {
  id: string;
  status: RecordingStatus;
  duration_s: number | null;
  created_at: string;
}

export interface Item {
  id: string;
  section: string;
  status: ItemStatus;
  span_text: string;
  route_confidence: number | null;
  fields: Record<string, string> | null;
  followup_question: string | null;
}

export const STATUS_COLORS: Record<RecordingStatus, string> = {
  uploaded: "bg-gray-100 text-gray-600",
  normalizing: "bg-blue-100 text-blue-700",
  transcribing: "bg-blue-100 text-blue-700",
  splitting: "bg-blue-100 text-blue-700",
  routing: "bg-blue-100 text-blue-700",
  extracting: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export const SECTION_LABELS: Record<string, string> = {
  work_log: "Work Log",
  task: "Task",
  note: "Note",
};

export const SECTION_COLORS: Record<string, string> = {
  work_log: "bg-violet-100 text-violet-700",
  task: "bg-amber-100 text-amber-700",
  note: "bg-sky-100 text-sky-700",
};
