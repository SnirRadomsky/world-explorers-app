// Choice-question helpers for the flags & marine quiz categories. The round
// mechanics (attempts → hint → reveal → scoring) reuse the existing quiz.ts
// engine; this module only builds the multiple-choice option sets. Pure &
// unit-tested — no UI, no randomness beyond the injected rng.

import { shuffle } from "./quiz";

/**
 * Build the option set for one choice question: the correct id plus
 * `count - 1` distractors drawn from the catalog, all shuffled.
 * Falls back gracefully when the catalog is smaller than `count`.
 */
export function pickOptions(
  allIds: string[],
  correctId: string,
  count: number,
  rng: () => number = Math.random,
): string[] {
  const distractors = shuffle(
    allIds.filter((id) => id !== correctId),
    rng,
  ).slice(0, Math.max(0, count - 1));
  return shuffle([correctId, ...distractors], rng);
}

/**
 * Pre-compute an options set for every target in a round, keyed by target id.
 * Deterministic given the rng, so a question's options never reshuffle when
 * the child taps a wrong answer or the component re-renders.
 */
export function buildAllOptions(
  targetIds: string[],
  allIds: string[],
  count: number,
  rng: () => number = Math.random,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of targetIds) {
    out[id] = pickOptions(allIds, id, count, rng);
  }
  return out;
}
