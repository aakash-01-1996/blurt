import { describe, expect, it } from "vitest";
import {
  fmtTime,
  formatDuration,
  truncate,
  isToday,
  isYesterday,
  formatDayLabel,
  formatDateTimeLabel,
} from "../lib/format";

describe("fmtTime", () => {
  it("formats seconds as m:ss with zero-padded seconds", () => {
    expect(fmtTime(0)).toBe("0:00");
    expect(fmtTime(9)).toBe("0:09");
    expect(fmtTime(41)).toBe("0:41");
    expect(fmtTime(125)).toBe("2:05");
  });

  it("floors fractional seconds", () => {
    expect(fmtTime(41.9)).toBe("0:41");
  });
});

describe("formatDuration", () => {
  it("renders an em dash for null or zero", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(0)).toBe("—");
  });

  it("rounds and formats a duration", () => {
    expect(formatDuration(41)).toBe("0:41");
    expect(formatDuration(90.6)).toBe("1:31");
  });
});

describe("truncate", () => {
  it("leaves short strings untouched", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates and appends an ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hello…");
  });
});

describe("date helpers", () => {
  it("detects today and yesterday", () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    expect(isToday(today)).toBe(true);
    expect(isToday(yesterday)).toBe(false);
    expect(isYesterday(yesterday)).toBe(true);
    expect(isYesterday(today)).toBe(false);
    expect(isToday(lastWeek)).toBe(false);
  });

  it("labels days relative to now", () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    expect(formatDayLabel(today)).toBe("Today");
    expect(formatDayLabel(yesterday)).toBe("Yesterday");
    expect(formatDayLabel(new Date("2020-03-05T12:00:00"))).toMatch(/Mar 5/);
  });

  it("prefixes a time onto the day label", () => {
    const today = new Date();
    expect(formatDateTimeLabel(today)).toMatch(/^Today, /);
    expect(formatDateTimeLabel(new Date("2020-03-05T15:30:00"))).toMatch(/Mar 5, /);
  });
});
