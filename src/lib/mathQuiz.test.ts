import { describe, it, expect } from "vitest";
import { makeQuestion, makeRound, buildOptions, MATH_ROUND_LENGTH } from "./mathQuiz";
import { mulberry32 } from "../three/proceduralTextures";

describe("mathQuiz", () => {
  it("counting questions stay in 1..10 and options contain the answer", () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 200; i++) {
      const q = makeQuestion("count", rng);
      expect(q.answer).toBeGreaterThanOrEqual(1);
      expect(q.answer).toBeLessThanOrEqual(10);
      expect(q.answer).toBe(q.a);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(4);
      expect(q.promptHebrew).toContain("כמה");
    }
  });

  it("addition never exceeds 10 and computes correctly", () => {
    const rng = mulberry32(2);
    for (let i = 0; i < 200; i++) {
      const q = makeQuestion("add", rng);
      expect(q.a + q.b).toBe(q.answer);
      expect(q.answer).toBeLessThanOrEqual(10);
      expect(q.a).toBeGreaterThanOrEqual(1);
      expect(q.b).toBeGreaterThanOrEqual(1);
      expect(q.options).toContain(q.answer);
    }
  });

  it("subtraction never goes negative", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const q = makeQuestion("sub", rng);
      expect(q.a - q.b).toBe(q.answer);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.b).toBeLessThan(q.a);
    }
  });

  it("options are 4 distinct numbers in range", () => {
    const rng = mulberry32(4);
    for (let ans = 0; ans <= 10; ans++) {
      const opts = buildOptions(ans, rng);
      expect(opts.length).toBe(4);
      expect(new Set(opts).size).toBe(4);
      expect(opts).toContain(ans);
      for (const o of opts) {
        expect(o).toBeGreaterThanOrEqual(0);
        expect(o).toBeLessThanOrEqual(10);
      }
    }
  });

  it("rounds have the requested length and avoid identical neighbors", () => {
    const rng = mulberry32(5);
    const round = makeRound("count", MATH_ROUND_LENGTH, rng);
    expect(round.length).toBe(MATH_ROUND_LENGTH);
    for (let i = 1; i < round.length; i++) {
      const same = round[i].answer === round[i - 1].answer && round[i].emoji === round[i - 1].emoji;
      expect(same).toBe(false);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const r1 = makeRound("add", 8, mulberry32(42));
    const r2 = makeRound("add", 8, mulberry32(42));
    expect(r1).toEqual(r2);
  });
});
