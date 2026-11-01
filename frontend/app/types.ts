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
  start_s: number | null;
  end_s: number | null;
  fields: Record<string, string> | null;
  followup_question: string | null;
}

export type TaskStatus = "open" | "done";

export interface Task {
  id: string;
  item_id: string;
  title: string;
  due_date: string | null;
  project: string | null;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  item_id: string;
  title: string;
  content: string | null;
  created_at: string;
}

export type Page = "record" | "review" | "work-log" | "tasks" | "notes" | "lists" | "settings";

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
  work_log: "Work log",
  task: "Tasks",
  list: "New list",
  note: "Note",
  unsorted: "Unsorted",
};

export const SECTION_COLORS: Record<string, string> = {
  work_log: "bg-[#E8F1FD] text-[#0071E3]",
  task: "bg-[#FDF0E4] text-[#C2772B]",
  list: "bg-[#E7F5EC] text-[#2E8B57]",
  note: "bg-sky-50 text-sky-700",
  unsorted: "bg-gray-100 text-gray-500",
};

/** Lighter solid tints for highlighting transcript spans by section. */
export const SECTION_TINTS: Record<string, string> = {
  work_log: "bg-[#D4E7FB]",
  task: "bg-[#FBE4CC]",
  list: "bg-[#D6EEDE]",
  note: "bg-sky-100",
  unsorted: "bg-gray-100",
};

export function sectionTint(section: string): string {
  return SECTION_TINTS[section] ?? "bg-gray-100";
}
