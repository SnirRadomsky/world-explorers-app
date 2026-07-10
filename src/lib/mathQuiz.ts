// חשבון בכיף — pure question engine for the math mini-game. Three levels:
// counting objects, addition up to 10, subtraction (never negative). Pure &
// deterministic with an injectable rng, unit-tested.

export type MathLevel = "count" | "add" | "sub";

export interface MathQuestion {
  level: MathLevel;
  a: number;
  b: number;            // 0 for counting
  answer: number;
  emoji: string;
  promptHebrew: string; // spoken + shown
  options: number[];    // 4 choices, shuffled, contains answer
}

export const MATH_ROUND_LENGTH = 8;

const COUNT_THINGS: { emoji: string; pluralHebrew: string }[] = [
  { emoji: "🎈", pluralHebrew: "בלונים" },
  { emoji: "🐟", pluralHebrew: "דגים" },
  { emoji: "⭐", pluralHebrew: "כוכבים" },
  { emoji: "🍎", pluralHebrew: "תפוחים" },
  { emoji: "🌸", pluralHebrew: "פרחים" },
  { emoji: "🐞", pluralHebrew: "חיפושיות" },
  { emoji: "🧁", pluralHebrew: "עוגיות" },
  { emoji: "🐢", pluralHebrew: "צבים" },
];

function int(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** 4 distinct options including the answer, within a friendly range. */
export function buildOptions(answer: number, rng: () => number, max = 10): number[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < 4 && guard++ < 100) {
    // near-miss distractors feel fair (±1..3), clamped to [0, max]
    const delta = (rng() > 0.5 ? 1 : -1) * int(rng, 1, 3);
    const cand = Math.min(max, Math.max(0, answer + delta));
    set.add(cand);
  }
  // top up in the rare clamp-collision case
  for (let v = 0; set.size < 4 && v <= max; v++) set.add(v);
  const arr = [...set].slice(0, 4);
  // shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function makeQuestion(level: MathLevel, rng: () => number = Math.random): MathQuestion {
  const thing = COUNT_THINGS[int(rng, 0, COUNT_THINGS.length - 1)];
  if (level === "count") {
    const a = int(rng, 1, 10);
    return {
      level, a, b: 0, answer: a, emoji: thing.emoji,
      promptHebrew: `כמה ${thing.pluralHebrew} יש?`,
      options: buildOptions(a, rng),
    };
  }
  if (level === "add") {
    const a = int(rng, 1, 8);
    const b = int(rng, 1, Math.min(9, 10 - a));
    return {
      level, a, b, answer: a + b, emoji: thing.emoji,
      promptHebrew: `כמה זה ${a} ועוד ${b}?`,
      options: buildOptions(a + b, rng),
    };
  }
  const a = int(rng, 2, 10);
  const b = int(rng, 1, a - 1);
  return {
    level, a, b, answer: a - b, emoji: thing.emoji,
    promptHebrew: `כמה זה ${a} פחות ${b}?`,
    options: buildOptions(a - b, rng),
  };
}

/** A full round; consecutive questions never repeat the same answer+emoji. */
export function makeRound(level: MathLevel, count = MATH_ROUND_LENGTH, rng: () => number = Math.random): MathQuestion[] {
  const out: MathQuestion[] = [];
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const q = makeQuestion(level, rng);
    const prev = out[out.length - 1];
    if (prev && prev.answer === q.answer && prev.emoji === q.emoji) continue;
    out.push(q);
  }
  return out;
}

export const MATH_LEVELS: { id: MathLevel; nameHebrew: string; emoji: string; descHebrew: string }[] = [
  { id: "count", nameHebrew: "סוֹפְרִים",  emoji: "🐣", descHebrew: "כמה יש בתמונה?" },
  { id: "add",   nameHebrew: "חִיבּוּר",   emoji: "🚀", descHebrew: "ועוד — עד 10" },
  { id: "sub",   nameHebrew: "חִיסּוּר",   emoji: "👑", descHebrew: "פחות — עד 10" },
];
