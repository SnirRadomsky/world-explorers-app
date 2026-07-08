// Sticker album: definitions + pure unlock logic (unit-tested).

import { CONTINENTS } from "../data/continents";
import { COUNTRIES } from "../data/countries";
import { TOTAL_ISRAEL_CITIES } from "../data/israelCities";
import { TOTAL_SPACE_OBJECTS } from "../data/planets";

export interface StickerDef {
  id: string;
  emoji: string;
  nameHebrew: string;
  howHebrew: string; // how to earn it, shown when locked
}

export interface ProgressSnapshot {
  continentsDiscovered: Set<string>;
  countriesDiscovered: Set<string>;
  israelDiscovered: number;
  planetsDiscovered: number;
  languagesLearned: number;
  goldMedals: number;
}

const CONTINENT_STICKERS: StickerDef[] = [
  { id: "st-africa",        emoji: "🦁", nameHebrew: "אריה אפריקה",        howHebrew: "גלו את כל המדינות באפריקה" },
  { id: "st-asia",          emoji: "🐼", nameHebrew: "פנדת אסיה",          howHebrew: "גלו את כל המדינות באסיה" },
  { id: "st-europe",        emoji: "🦊", nameHebrew: "שועל אירופה",        howHebrew: "גלו את כל המדינות באירופה" },
  { id: "st-north-america", emoji: "🦅", nameHebrew: "נשר אמריקה הצפונית", howHebrew: "גלו את כל המדינות באמריקה הצפונית" },
  { id: "st-south-america", emoji: "🦜", nameHebrew: "תוכי אמריקה הדרומית", howHebrew: "גלו את כל המדינות באמריקה הדרומית" },
  { id: "st-australia",     emoji: "🦘", nameHebrew: "קנגורו אוסטרליה",    howHebrew: "גלו את כל המדינות באוסטרליה" },
];

export const STICKERS: StickerDef[] = [
  { id: "st-first",     emoji: "🧭", nameHebrew: "הצעד הראשון",   howHebrew: "גלו 10 גילויים" },
  { id: "st-explorer",  emoji: "🗺️", nameHebrew: "מגלה דרכים",    howHebrew: "גלו 50 גילויים" },
  { id: "st-champion",  emoji: "🏆", nameHebrew: "אלוף העולם",    howHebrew: "גלו 150 גילויים" },
  { id: "st-continents",emoji: "🌍", nameHebrew: "מגלה היבשות",   howHebrew: "גלו את כל 7 היבשות" },
  ...CONTINENT_STICKERS,
  { id: "st-israel",    emoji: "🇮🇱", nameHebrew: "מלך ישראל",     howHebrew: "גלו את כל ערי ישראל" },
  { id: "st-astronaut", emoji: "👨‍🚀", nameHebrew: "אסטרונאוט",     howHebrew: "גלו את כל מערכת השמש" },
  { id: "st-linguist",  emoji: "🗣️", nameHebrew: "בלשן קטן",      howHebrew: "האזינו למילים ב-5 שפות" },
  { id: "st-quiz",      emoji: "🥇", nameHebrew: "אלוף החידונים",  howHebrew: "השיגו 3 מדליות זהב בחידונים" },
];

export const STICKER_BY_ID = new Map(STICKERS.map((s) => [s.id, s]));

const countriesPerContinent = new Map<string, string[]>();
for (const c of COUNTRIES) {
  const list = countriesPerContinent.get(c.continentId) ?? [];
  list.push(c.id);
  countriesPerContinent.set(c.continentId, list);
}

/** Pure: which stickers should be unlocked for the given progress. */
export function computeUnlockedStickers(p: ProgressSnapshot): Set<string> {
  const unlocked = new Set<string>();
  const total =
    p.continentsDiscovered.size +
    p.countriesDiscovered.size +
    p.israelDiscovered +
    p.planetsDiscovered;

  if (total >= 10) unlocked.add("st-first");
  if (total >= 50) unlocked.add("st-explorer");
  if (total >= 150) unlocked.add("st-champion");
  if (p.continentsDiscovered.size >= CONTINENTS.length) unlocked.add("st-continents");

  for (const st of CONTINENT_STICKERS) {
    const continentId = st.id.replace("st-", "");
    const ids = countriesPerContinent.get(continentId) ?? [];
    if (ids.length > 0 && ids.every((id) => p.countriesDiscovered.has(id))) {
      unlocked.add(st.id);
    }
  }

  if (p.israelDiscovered >= TOTAL_ISRAEL_CITIES) unlocked.add("st-israel");
  if (p.planetsDiscovered >= TOTAL_SPACE_OBJECTS) unlocked.add("st-astronaut");
  if (p.languagesLearned >= 5) unlocked.add("st-linguist");
  if (p.goldMedals >= 3) unlocked.add("st-quiz");

  return unlocked;
}

/** Explorer level from total discoveries. */
export interface ExplorerLevel {
  nameHebrew: string;
  emoji: string;
  min: number;
}

export const LEVELS: ExplorerLevel[] = [
  { nameHebrew: "מתחילים",     emoji: "🐣", min: 0 },
  { nameHebrew: "צופה",        emoji: "🔭", min: 15 },
  { nameHebrew: "נווט",        emoji: "🧭", min: 40 },
  { nameHebrew: "מגלה-על",     emoji: "🚀", min: 90 },
  { nameHebrew: "אלוף העולם",  emoji: "👑", min: 150 },
];

export function levelFor(totalDiscoveries: number): ExplorerLevel {
  let best = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalDiscoveries >= lvl.min) best = lvl;
  }
  return best;
}
