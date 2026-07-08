// Sticker album + language-learning + quiz-medal persistence.

import { useCallback, useEffect, useMemo, useState } from "react";
import { computeUnlockedStickers, STICKER_BY_ID, type ProgressSnapshot } from "../lib/stickers";

const SEEN_KEY = "world-explorers-stickers-seen";      // stickers whose unlock celebration was shown
const LANGS_KEY = "world-explorers-languages";          // per-language set of heard word indexes
const QUIZ_KEY = "world-explorers-quiz";                // { goldMedals, bestByCategory }

function loadJSON<T>(key: string, def: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return def;
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

export interface QuizStats {
  goldMedals: number;
  bestStars: Record<string, number>; // per category
}

export interface StickerState {
  /** All currently-unlocked sticker ids (recomputed from progress). */
  unlocked: Set<string>;
  /** Stickers unlocked but not yet celebrated — pop these one at a time. */
  pendingCelebration: string | null;
  markCelebrated: (id: string) => void;
  /** Language learning */
  languagesLearnedCount: number;
  markWordHeard: (languageId: string, wordIndex: number, wordsInPack: number) => void;
  wordsHeard: (languageId: string) => Set<number>;
  /** Quiz stats */
  quizStats: QuizStats;
  recordQuizResult: (category: string, stars: number, isGold: boolean) => void;
}

export function useStickers(progress: Omit<ProgressSnapshot, "languagesLearned" | "goldMedals">): StickerState {
  const [langMap, setLangMap] = useState<Record<string, number[]>>(() => loadJSON(LANGS_KEY, {}));
  const [quizStats, setQuizStats] = useState<QuizStats>(() =>
    loadJSON(QUIZ_KEY, { goldMedals: 0, bestStars: {} })
  );
  const [seen, setSeen] = useState<string[]>(() => loadJSON(SEEN_KEY, []));

  useEffect(() => saveJSON(LANGS_KEY, langMap), [langMap]);
  useEffect(() => saveJSON(QUIZ_KEY, quizStats), [quizStats]);
  useEffect(() => saveJSON(SEEN_KEY, seen), [seen]);

  const languagesLearnedCount = useMemo(
    () => Object.entries(langMap).filter(([, arr]) => arr.length >= 4).length,
    [langMap]
  );

  const unlocked = useMemo(
    () =>
      computeUnlockedStickers({
        ...progress,
        languagesLearned: languagesLearnedCount,
        goldMedals: quizStats.goldMedals,
      }),
    [progress, languagesLearnedCount, quizStats.goldMedals]
  );

  const pendingCelebration = useMemo(() => {
    for (const id of unlocked) {
      if (!seen.includes(id) && STICKER_BY_ID.has(id)) return id;
    }
    return null;
  }, [unlocked, seen]);

  const markCelebrated = useCallback((id: string) => {
    setSeen((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const markWordHeard = useCallback((languageId: string, wordIndex: number, wordsInPack: number) => {
    setLangMap((prev) => {
      const cur = new Set(prev[languageId] ?? []);
      if (cur.has(wordIndex)) return prev;
      cur.add(wordIndex);
      return { ...prev, [languageId]: [...cur].slice(0, wordsInPack) };
    });
  }, []);

  const wordsHeard = useCallback(
    (languageId: string) => new Set(langMap[languageId] ?? []),
    [langMap]
  );

  const recordQuizResult = useCallback((category: string, stars: number, isGold: boolean) => {
    setQuizStats((prev) => ({
      goldMedals: prev.goldMedals + (isGold ? 1 : 0),
      bestStars: {
        ...prev.bestStars,
        [category]: Math.max(prev.bestStars[category] ?? 0, stars),
      },
    }));
  }, []);

  return {
    unlocked,
    pendingCelebration,
    markCelebrated,
    languagesLearnedCount,
    markWordHeard,
    wordsHeard,
    quizStats,
    recordQuizResult,
  };
}
