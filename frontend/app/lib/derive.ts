// Values derived from backend data that the API does not store directly.

import { Item, Recording } from "../types";

export function confidenceLabel(c: number | null): string | null {
  if (c === null) return null;
  return c >= 0.85 ? "High confidence" : c >= 0.6 ? "Medium confidence" : "Low confidence";
}

export function computeStreak(recordings: Recording[]): number {
  const days = new Set(recordings.map((r) => new Date(r.created_at).toDateString()));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function deriveTimestamps(items: Item[], duration: number | null): Record<string, number> {
  const dur = duration ?? items.length * 6;
  const lengths = items.map((i) => Math.max(i.span_text.length, 8));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  let acc = 0;
  items.forEach((it, idx) => {
    out[it.id] = Math.round((acc / total) * dur);
    acc += lengths[idx];
  });
  return out;
}
