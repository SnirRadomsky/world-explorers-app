import { describe, it, expect } from "vitest";
import { dayNumber, dailyChallenge, advanceStreak, isDoneToday } from "./dailyChallenge";

describe("dayNumber", () => {
  it("is monotonic and counts consecutive days as +1", () => {
    expect(dayNumber("2026-01-02") - dayNumber("2026-01-01")).toBe(1);
    expect(dayNumber("2026-03-01") - dayNumber("2026-02-28")).toBe(1); // 2026 not a leap year
    expect(dayNumber("2024-03-01") - dayNumber("2024-02-28")).toBe(2); // 2024 leap year (Feb 29)
    expect(dayNumber("2027-01-01") - dayNumber("2026-01-01")).toBe(365);
  });
});

describe("dailyChallenge", () => {
  const cats = ["a", "b", "c"];
  const catalogs = {
    a: Array.from({ length: 30 }, (_, i) => `a${i}`),
    b: Array.from({ length: 30 }, (_, i) => `b${i}`),
    c: Array.from({ length: 30 }, (_, i) => `c${i}`),
  };

  it("is deterministic per date and picks the right count", () => {
    const one = dailyChallenge("2026-07-09", cats, catalogs, 5);
    const two = dailyChallenge("2026-07-09", cats, catalogs, 5);
    expect(one).toEqual(two);
    expect(one.targetIds.length).toBe(5);
    expect(new Set(one.targetIds).size).toBe(5); // unique
    expect(one.targetIds.every((id) => id.startsWith(one.category))).toBe(true);
  });

  it("rotates category by day and usually differs across days", () => {
    const days = ["2026-07-09", "2026-07-10", "2026-07-11", "2026-07-12"];
    const cattoday = days.map((d) => dailyChallenge(d, cats, catalogs, 5).category);
    expect(new Set(cattoday).size).toBeGreaterThan(1);
  });
});

describe("streak", () => {
  it("increments on consecutive days, resets on a gap, no double-count", () => {
    let s = { count: 0, lastDay: -1 };
    s = advanceStreak(s, "2026-07-09");
    expect(s.count).toBe(1);
    expect(isDoneToday(s, "2026-07-09")).toBe(true);
    s = advanceStreak(s, "2026-07-09"); // same day again
    expect(s.count).toBe(1);
    s = advanceStreak(s, "2026-07-10"); // next day
    expect(s.count).toBe(2);
    s = advanceStreak(s, "2026-07-13"); // gap
    expect(s.count).toBe(1);
  });
});
