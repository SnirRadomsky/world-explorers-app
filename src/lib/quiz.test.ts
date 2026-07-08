import { describe, it, expect } from "vitest";
import {
  buildQuestionPool,
  newRound,
  answer,
  freshQuestion,
  medalFor,
  starsFor,
  shuffle,
  ROUND_LENGTH,
  STARTER_POOLS,
  type QuizItem,
} from "./quiz";
import { CONTINENTS } from "../data/continents";
import { COUNTRY_BY_ID } from "../data/countries";
import { ISRAEL_CITIES_BY_ID } from "../data/israelCities";
import { PLANET_BY_ID } from "../data/planets";

const items: QuizItem[] = Array.from({ length: 30 }, (_, i) => ({
  id: `item-${i}`,
  nameHebrew: `פריט ${i}`,
}));

const seededRng = (seed = 1) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

describe("starter pools reference real items", () => {
  it("continents", () => {
    for (const id of STARTER_POOLS.continents) {
      expect(CONTINENTS.some((c) => c.id === id), id).toBe(true);
    }
  });
  it("countries", () => {
    for (const id of STARTER_POOLS.countries) expect(COUNTRY_BY_ID.has(id), id).toBe(true);
  });
  it("israel", () => {
    for (const id of STARTER_POOLS.israel) expect(ISRAEL_CITIES_BY_ID.has(id), id).toBe(true);
  });
  it("planets", () => {
    for (const id of STARTER_POOLS.planets) expect(PLANET_BY_ID.has(id), id).toBe(true);
  });
});

describe("buildQuestionPool", () => {
  it("returns ROUND_LENGTH unique questions", () => {
    const pool = buildQuestionPool(items, new Set(), ["item-0"], seededRng());
    expect(pool.length).toBe(ROUND_LENGTH);
    expect(new Set(pool.map((p) => p.id)).size).toBe(ROUND_LENGTH);
  });

  it("prefers discovered items", () => {
    const discovered = new Set(items.slice(0, ROUND_LENGTH).map((i) => i.id));
    const pool = buildQuestionPool(items, discovered, [], seededRng());
    for (const q of pool) expect(discovered.has(q.id)).toBe(true);
  });

  it("tops up from starter pool when few discoveries", () => {
    const discovered = new Set(["item-0"]);
    const starters = items.slice(10, 20).map((i) => i.id);
    const pool = buildQuestionPool(items, discovered, starters, seededRng());
    expect(pool.length).toBe(ROUND_LENGTH);
    expect(pool.some((q) => q.id === "item-0")).toBe(true);
    const fromStarters = pool.filter((q) => starters.includes(q.id)).length;
    expect(fromStarters).toBeGreaterThanOrEqual(ROUND_LENGTH - 1 - 1); // rest from starters (allow rng slack)
  });

  it("handles a catalog smaller than the round", () => {
    const tiny = items.slice(0, 3);
    const pool = buildQuestionPool(tiny, new Set(), [], seededRng());
    expect(pool.length).toBe(3);
  });
});

describe("answer flow", () => {
  it("correct on first try scores", () => {
    const round = newRound("continents", items, new Set(), seededRng());
    const q = freshQuestion(round, 0);
    const target = round.questions[0].id;
    const res = answer(round, q, target);
    expect(res.result.kind).toBe("correct");
    expect(res.round.correctFirstTry).toBe(1);
    expect(res.round.correctTotal).toBe(1);
    expect(res.round.index).toBe(1);
  });

  it("2 misses → hint, 3 misses → reveal; revealed answers don't score", () => {
    const round = newRound("continents", items, new Set(), seededRng());
    let q = freshQuestion(round, 0);
    const wrongId = "definitely-wrong";

    let r = answer(round, q, wrongId);
    expect(r.result).toMatchObject({ kind: "wrong", showHint: false, reveal: false });
    q = r.question;

    r = answer(round, q, wrongId);
    expect(r.result).toMatchObject({ kind: "wrong", showHint: true, reveal: false });
    expect(r.question.hinted).toBe(true);
    q = r.question;

    r = answer(round, q, wrongId);
    expect(r.result).toMatchObject({ kind: "wrong", reveal: true });
    expect(r.question.revealed).toBe(true);
    q = r.question;

    // tapping the revealed target advances but scores nothing
    const res = answer(round, q, round.questions[0].id);
    expect(res.result.kind).toBe("correct");
    expect(res.round.correctFirstTry).toBe(0);
    expect(res.round.correctTotal).toBe(0);
    expect(res.round.index).toBe(1);
  });

  it("finishing all questions marks the round finished", () => {
    let round = newRound("planets", items.slice(0, 4), new Set(), seededRng());
    let q = freshQuestion(round, 0);
    while (!round.finished) {
      const res = answer(round, q, round.questions[round.index].id);
      round = res.round;
      q = res.question;
    }
    expect(round.finished).toBe(true);
    expect(round.correctFirstTry).toBe(round.questions.length);
  });
});

describe("medals", () => {
  it("thresholds", () => {
    expect(medalFor(8, 8)).toBe("gold");
    expect(medalFor(7, 8)).toBe("silver");
    expect(medalFor(6, 8)).toBe("silver");
    expect(medalFor(4, 8)).toBe("bronze");
    expect(medalFor(2, 8)).toBe("none");
    expect(starsFor(8, 8)).toBe(3);
    expect(starsFor(6, 8)).toBe(2);
    expect(starsFor(4, 8)).toBe(1);
    expect(starsFor(0, 8)).toBe(0);
  });
});

describe("shuffle", () => {
  it("keeps all elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const out = shuffle(arr, seededRng());
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(arr).toEqual([1, 2, 3, 4, 5]); // input untouched
  });
});
