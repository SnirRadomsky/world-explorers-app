// Quiz engine — pure logic, unit-tested. UI lives in components/Quiz.

export type QuizCategory = "continents" | "countries" | "israel" | "planets" | "flags" | "marine";

export interface QuizItem {
  id: string;
  nameHebrew: string;
}

export interface QuizQuestion {
  target: QuizItem;
  attempts: number;      // wrong taps so far
  hinted: boolean;       // pulse-hint shown (after 2 misses)
  revealed: boolean;     // auto-revealed (after 3 misses)
}

export interface QuizRound {
  category: QuizCategory;
  questions: QuizItem[]; // targets, in order
  index: number;         // current question
  correctFirstTry: number;
  correctTotal: number;
  finished: boolean;
}

export const ROUND_LENGTH = 8;

// "Famous & easy" starter items per category, used when the child has
// discovered only a few things (ids must exist in the data files).
export const STARTER_POOLS: Record<QuizCategory, string[]> = {
  continents: ["africa", "asia", "europe", "north-america", "south-america", "australia", "antarctica"],
  countries: ["376", "840", "250", "076", "818", "156", "392", "826", "380", "724", "036", "643"],
  israel: ["il-jerusalem", "il-tel-aviv", "il-haifa", "il-beersheba", "il-eilat", "il-netanya", "il-tiberias", "il-ashdod"],
  planets: ["sun", "earth", "moon", "mars", "jupiter", "saturn"],
  // flags reuse the "famous countries" set; marine leans on iconic sea animals
  flags: ["840", "250", "076", "826", "380", "724", "392", "156", "036", "643"],
  marine: ["clownfish", "dolphin", "sea-turtle", "reef-shark", "blue-whale", "octopus", "penguin", "seahorse"],
};

/** Deterministic-friendly shuffle (Fisher–Yates) with injectable rng for tests. */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build the question pool: prefer discovered items (reinforcement learning!),
 * topped up from the starter pool, then from the full catalog.
 */
export function buildQuestionPool(
  allItems: QuizItem[],
  discoveredIds: Set<string>,
  starterIds: string[],
  rng: () => number = Math.random,
): QuizItem[] {
  const byId = new Map(allItems.map((i) => [i.id, i]));
  const picked = new Map<string, QuizItem>();

  const discovered = allItems.filter((i) => discoveredIds.has(i.id));
  for (const item of shuffle(discovered, rng)) {
    if (picked.size >= ROUND_LENGTH) break;
    picked.set(item.id, item);
  }

  if (picked.size < ROUND_LENGTH) {
    for (const id of shuffle(starterIds, rng)) {
      if (picked.size >= ROUND_LENGTH) break;
      const item = byId.get(id);
      if (item && !picked.has(id)) picked.set(id, item);
    }
  }

  if (picked.size < ROUND_LENGTH) {
    for (const item of shuffle(allItems, rng)) {
      if (picked.size >= ROUND_LENGTH) break;
      if (!picked.has(item.id)) picked.set(item.id, item);
    }
  }

  return [...picked.values()].slice(0, ROUND_LENGTH);
}

export function newRound(
  category: QuizCategory,
  allItems: QuizItem[],
  discoveredIds: Set<string>,
  rng: () => number = Math.random,
): QuizRound {
  return {
    category,
    questions: buildQuestionPool(allItems, discoveredIds, STARTER_POOLS[category], rng),
    index: 0,
    correctFirstTry: 0,
    correctTotal: 0,
    finished: false,
  };
}

/** Build a round from an explicit, pre-chosen list of targets (daily challenge). */
export function roundFromItems(category: QuizCategory, questions: QuizItem[]): QuizRound {
  return {
    category,
    questions,
    index: 0,
    correctFirstTry: 0,
    correctTotal: 0,
    finished: false,
  };
}

export type AnswerResult =
  | { kind: "correct"; firstTry: boolean }
  | { kind: "wrong"; showHint: boolean; reveal: boolean }
  | { kind: "done" };

/**
 * Process a tap on `tappedId` for the current question.
 * Mutation-free: returns the next round state + what happened.
 */
export function answer(
  round: QuizRound,
  question: QuizQuestion,
  tappedId: string,
): { round: QuizRound; question: QuizQuestion; result: AnswerResult } {
  if (round.finished) return { round, question, result: { kind: "done" } };

  const target = round.questions[round.index];
  if (tappedId === target.id) {
    const firstTry = question.attempts === 0 && !question.revealed;
    const nextIndex = round.index + 1;
    const finished = nextIndex >= round.questions.length;
    return {
      round: {
        ...round,
        index: nextIndex,
        correctFirstTry: round.correctFirstTry + (firstTry ? 1 : 0),
        correctTotal: round.correctTotal + (question.revealed ? 0 : 1),
        finished,
      },
      question: freshQuestion(round, nextIndex),
      result: { kind: "correct", firstTry },
    };
  }

  const attempts = question.attempts + 1;
  return {
    round,
    question: {
      ...question,
      attempts,
      hinted: attempts >= 2,
      revealed: attempts >= 3,
    },
    result: { kind: "wrong", showHint: attempts >= 2, reveal: attempts >= 3 },
  };
}

/** After a reveal, the child taps the shown target to move on (no score). */
export function freshQuestion(round: QuizRound, index: number): QuizQuestion {
  const target = round.questions[Math.min(index, round.questions.length - 1)];
  return { target, attempts: 0, hinted: false, revealed: false };
}

export type Medal = "gold" | "silver" | "bronze" | "none";

/** Medal from first-try correct count (out of ROUND_LENGTH). */
export function medalFor(correctFirstTry: number, roundLength: number = ROUND_LENGTH): Medal {
  const ratio = roundLength === 0 ? 0 : correctFirstTry / roundLength;
  if (ratio >= 0.9) return "gold";
  if (ratio >= 0.65) return "silver";
  if (ratio >= 0.4) return "bronze";
  return "none";
}

export function starsFor(correctFirstTry: number, roundLength: number = ROUND_LENGTH): 0 | 1 | 2 | 3 {
  const m = medalFor(correctFirstTry, roundLength);
  return m === "gold" ? 3 : m === "silver" ? 2 : m === "bronze" ? 1 : 0;
}

export const MEDAL_HEBREW: Record<Medal, string> = {
  gold: "מדליית זהב",
  silver: "מדליית כסף",
  bronze: "מדליית ארד",
  none: "בלי מדליה הפעם",
};

export const MEDAL_EMOJI: Record<Medal, string> = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
  none: "💪",
};
