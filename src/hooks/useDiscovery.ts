import { useState, useCallback, useEffect } from "react";

type GameMode =
  | "continents"
  | "countries"
  | "cities"
  | "country-cities"
  | "israel"
  | "planets"
  | "constellations"
  | "ocean"
  | "visited"
  | "landmarks"
  | "treasures";

const STORAGE_KEY_PREFIX = "world-explorers-discoveries";

function storageKey(mode: GameMode) {
  return `${STORAGE_KEY_PREFIX}-${mode}`;
}

function loadFromStorage(mode: GameMode): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(mode));
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function saveToStorage(mode: GameMode, discovered: Set<string>) {
  try {
    localStorage.setItem(storageKey(mode), JSON.stringify([...discovered]));
  } catch { /* ignore */ }
}

export interface DiscoveryState {
  discovered: Set<string>;
  totalDiscovered: number;
  isDiscovered: (id: string) => boolean;
  discover: (id: string) => boolean;  // returns true if newly discovered
  resetProgress: () => void;
}

export function useDiscovery(mode: GameMode): DiscoveryState {
  const [discovered, setDiscovered] = useState<Set<string>>(() => loadFromStorage(mode));

  // Re-load when mode switches (adjust-state-during-render pattern)
  const [prevMode, setPrevMode] = useState(mode);
  if (prevMode !== mode) {
    setPrevMode(mode);
    setDiscovered(loadFromStorage(mode));
  }

  useEffect(() => {
    saveToStorage(mode, discovered);
  }, [mode, discovered]);

  const isDiscovered = useCallback(
    (id: string) => discovered.has(id),
    [discovered]
  );

  const discover = useCallback(
    (id: string): boolean => {
      if (discovered.has(id)) return false;
      setDiscovered((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      return true;
    },
    [discovered]
  );

  const resetProgress = useCallback(() => {
    setDiscovered(new Set());
    localStorage.removeItem(storageKey(mode));
  }, [mode]);

  return {
    discovered,
    totalDiscovered: discovered.size,
    isDiscovered,
    discover,
    resetProgress,
  };
}
