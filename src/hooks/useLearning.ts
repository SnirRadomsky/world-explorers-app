// Persistent learning progress for בית הספר הקטן — letters heard, words read,
// math/clock stars, memory wins and completed songs. One localStorage key.

import { useCallback, useEffect, useState } from "react";
import type { MathLevel } from "../lib/mathQuiz";

const KEY = "world-explorers-learn";

export interface LearnData {
  lettersHeard: string[];
  wordsRead: string[];
  mathStars: Partial<Record<MathLevel, number>>;
  clockStars: number;
  memoryWins: number;
  songsDone: string[];
}

const EMPTY: LearnData = {
  lettersHeard: [],
  wordsRead: [],
  mathStars: {},
  clockStars: 0,
  memoryWins: 0,
  songsDone: [],
};

function load(): LearnData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as LearnData) };
  } catch { /* ignore */ }
  return EMPTY;
}

export interface LearningState {
  data: LearnData;
  lettersHeard: Set<string>;
  wordsRead: Set<string>;
  markLetterHeard: (id: string) => void;
  markWordRead: (id: string) => void;
  recordMathStars: (level: MathLevel, stars: number) => void;
  recordClockStars: (stars: number) => void;
  recordMemoryWin: () => void;
  markSongDone: (id: string) => void;
}

export function useLearning(): LearningState {
  const [data, setData] = useState<LearnData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }, [data]);

  const markLetterHeard = useCallback((id: string) => {
    setData((d) => (d.lettersHeard.includes(id) ? d : { ...d, lettersHeard: [...d.lettersHeard, id] }));
  }, []);

  const markWordRead = useCallback((id: string) => {
    setData((d) => (d.wordsRead.includes(id) ? d : { ...d, wordsRead: [...d.wordsRead, id] }));
  }, []);

  const recordMathStars = useCallback((level: MathLevel, stars: number) => {
    setData((d) => ({
      ...d,
      mathStars: { ...d.mathStars, [level]: Math.max(d.mathStars[level] ?? 0, stars) },
    }));
  }, []);

  const recordClockStars = useCallback((stars: number) => {
    setData((d) => ({ ...d, clockStars: Math.max(d.clockStars, stars) }));
  }, []);

  const recordMemoryWin = useCallback(() => {
    setData((d) => ({ ...d, memoryWins: d.memoryWins + 1 }));
  }, []);

  const markSongDone = useCallback((id: string) => {
    setData((d) => (d.songsDone.includes(id) ? d : { ...d, songsDone: [...d.songsDone, id] }));
  }, []);

  return {
    data,
    lettersHeard: new Set(data.lettersHeard),
    wordsRead: new Set(data.wordsRead),
    markLetterHeard,
    markWordRead,
    recordMathStars,
    recordClockStars,
    recordMemoryWin,
    markSongDone,
  };
}
