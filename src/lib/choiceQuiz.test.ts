import { describe, it, expect } from "vitest";
import { pickOptions, buildAllOptions } from "./choiceQuiz";

const rng = (seed = 1) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647), (s - 1) / 2147483646);
};

describe("pickOptions", () => {
  const all = Array.from({ length: 20 }, (_, i) => `c${i}`);

  it("always includes the correct answer and the requested count", () => {
    for (let i = 0; i < 20; i++) {
      const opts = pickOptions(all, "c7", 4, rng(i + 1));
      expect(opts).toContain("c7");
      expect(opts.length).toBe(4);
      expect(new Set(opts).size).toBe(4); // no duplicates
      for (const o of opts) expect(all).toContain(o);
    }
  });

  it("degrades gracefully when the catalog is smaller than count", () => {
    const opts = pickOptions(["a", "b"], "a", 4, rng());
    expect(opts).toContain("a");
    expect(opts.length).toBe(2);
  });
});

describe("buildAllOptions", () => {
  it("produces one option set per target, each containing its target", () => {
    const all = Array.from({ length: 12 }, (_, i) => `x${i}`);
    const targets = ["x1", "x4", "x9"];
    const map = buildAllOptions(targets, all, 4, rng(3));
    for (const t of targets) {
      expect(map[t]).toContain(t);
      expect(map[t].length).toBe(4);
    }
  });
});
