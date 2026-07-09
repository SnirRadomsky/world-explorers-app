// Daily challenge: a deterministic set of questions per calendar day (so the
// same day always gives the same challenge, fully offline) + a streak that
// grows on consecutive days. All pure & unit-tested; the app passes today's
// date string in (YYYY-MM-DD) so nothing here reads the clock directly.

/** Days since an epoch, from a YYYY-MM-DD string. Stable & timezone-free. */
export function dayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Days from a fixed civil epoch (Howard Hinnant's algorithm, simplified).
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Deterministic PRNG seeded by an integer (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DailyPick {
  category: string;
  targetIds: string[];
}

/**
 * Pick today's challenge: a category (rotates by day) and N target ids drawn
 * deterministically from that category's catalog.
 */
export function dailyChallenge(
  dateStr: string,
  categories: string[],
  catalogs: Record<string, string[]>,
  questionCount = 5,
): DailyPick {
  const day = dayNumber(dateStr);
  const rng = seededRandom(day + 1);
  const category = categories[day % categories.length];
  const pool = catalogs[category] ?? [];
  const ids: string[] = [];
  const used = new Set<number>();
  let guard = 0;
  while (ids.length < Math.min(questionCount, pool.length) && guard < pool.length * 20) {
    const i = Math.floor(rng() * pool.length);
    if (!used.has(i)) {
      used.add(i);
      ids.push(pool[i]);
    }
    guard++;
  }
  return { category, targetIds: ids };
}

export interface StreakState {
  count: number;
  lastDay: number; // dayNumber of the last completed challenge (-1 = none)
}

/**
 * Advance the streak when the child finishes today's challenge:
 * - same day already counted → unchanged
 * - exactly the next day      → +1
 * - a gap                     → reset to 1
 */
export function advanceStreak(prev: StreakState, dateStr: string): StreakState {
  const today = dayNumber(dateStr);
  if (prev.lastDay === today) return prev;
  if (prev.lastDay === today - 1) return { count: prev.count + 1, lastDay: today };
  return { count: 1, lastDay: today };
}

/** Whether today's challenge was already completed. */
export function isDoneToday(state: StreakState, dateStr: string): boolean {
  return state.lastDay === dayNumber(dateStr);
}
