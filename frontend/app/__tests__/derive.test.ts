import { describe, expect, it } from "vitest";
import { confidenceLabel, computeStreak, deriveTimestamps } from "../lib/derive";
import { Item, Recording } from "../types";

function recordingOn(daysAgo: number): Recording {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { id: `r${daysAgo}`, status: "ready", duration_s: 60, created_at: d.toISOString() };
}

function item(id: string, span: string): Item {
  return { id, section: "work_log", status: "pending", span_text: span, route_confidence: 0.9, start_s: null, end_s: null, fields: null, followup_question: null };
}

describe("confidenceLabel", () => {
  it("maps scores to labels", () => {
    expect(confidenceLabel(null)).toBeNull();
    expect(confidenceLabel(0.9)).toBe("High confidence");
    expect(confidenceLabel(0.7)).toBe("Medium confidence");
    expect(confidenceLabel(0.4)).toBe("Low confidence");
  });

  it("uses inclusive thresholds", () => {
    expect(confidenceLabel(0.85)).toBe("High confidence");
    expect(confidenceLabel(0.6)).toBe("Medium confidence");
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(computeStreak([recordingOn(0), recordingOn(1), recordingOn(2)])).toBe(3);
  });

  it("allows today to be empty without breaking the streak", () => {
    expect(computeStreak([recordingOn(1), recordingOn(2)])).toBe(2);
  });

  it("stops at the first gap", () => {
    expect(computeStreak([recordingOn(0), recordingOn(1), recordingOn(3)])).toBe(2);
  });

  it("returns 0 when there is no recent activity", () => {
    expect(computeStreak([recordingOn(5)])).toBe(0);
    expect(computeStreak([])).toBe(0);
  });
});

describe("deriveTimestamps", () => {
  it("assigns increasing timestamps starting at zero", () => {
    const items = [item("a", "first span here"), item("b", "second"), item("c", "third one longer")];
    const ts = deriveTimestamps(items, 60);
    expect(ts.a).toBe(0);
    expect(ts.b).toBeGreaterThan(0);
    expect(ts.c).toBeGreaterThan(ts.b);
    expect(ts.c).toBeLessThanOrEqual(60);
  });

  it("falls back to a synthetic duration when none is given", () => {
    const ts = deriveTimestamps([item("a", "x"), item("b", "y")], null);
    expect(ts.a).toBe(0);
    expect(typeof ts.b).toBe("number");
  });

  it("handles an empty list", () => {
    expect(deriveTimestamps([], 30)).toEqual({});
  });
});
