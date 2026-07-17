// Sticker album: definitions + pure unlock logic (unit-tested).

import { CONTINENTS } from "../data/continents";
import { COUNTRIES } from "../data/countries";
import { TOTAL_ISRAEL_SITES } from "../data/israelCities";
import { TOTAL_SPACE_OBJECTS } from "../data/planets";
import { TOTAL_CONSTELLATIONS } from "../data/constellations";
import { MARINE_LIFE, TOTAL_MARINE_CREATURES } from "../data/marineLife";
import { TOTAL_LANDMARKS, TOTAL_TREASURES } from "../data/landmarks";
import { TOTAL_LETTERS } from "../data/hebrewLetters";
import { TOTAL_STATION_OBJECTS } from "../data/spaceStation";
import { LAND_SIGHTS, TOTAL_LAND_SIGHTS } from "../data/landJourney";
import { TOTAL_DEEP_SEA_FINDS } from "../data/deepSea";

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
  /** 3.0 additions — optional so older callers/tests keep working. */
  constellationsDiscovered?: number;
  seasonsSeen?: number;
  oceanDiscovered?: Set<string>;
  visitedCount?: number;
  dailyStreak?: number;
  flagsGold?: boolean;
  /** 4.0 additions — landmarks, treasures and the little school. */
  landmarksVisited?: number;
  treasuresFound?: number;
  lettersKnown?: number;
  wordsRead?: number;
  mathStarsTotal?: number;
  memoryWins?: number;
  songsDone?: number;
  /** 5.0 additions — space station, land journey and the deep-sea expedition. */
  stationDiscovered?: number;
  landDiscovered?: Set<string>;
  deepSeaDiscovered?: number;
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
  { id: "st-israel",    emoji: "🇮🇱", nameHebrew: "מלך ישראל",     howHebrew: "גלו את כל ערי ישראל והאתרים המיוחדים" },
  { id: "st-astronaut", emoji: "👨‍🚀", nameHebrew: "אסטרונאוט",     howHebrew: "גלו את כל מערכת השמש" },
  { id: "st-stargazer", emoji: "🔭", nameHebrew: "צופה כוכבים",   howHebrew: "גלו את כל המזלות בשמי החלל" },
  { id: "st-seasons",   emoji: "🌦️", nameHebrew: "חוקר העונות",   howHebrew: "צפו בכל 4 עונות השנה על הגלובוס" },
  { id: "st-dolphin",   emoji: "🐬", nameHebrew: "חבר הדולפינים", howHebrew: "גלו 15 חיות ים" },
  { id: "st-deep",      emoji: "🐙", nameHebrew: "חוקר מעמקים",   howHebrew: "גלו את כל יצורי המצולות האפלות" },
  { id: "st-ocean",     emoji: "🌊", nameHebrew: "מלך הים",       howHebrew: "גלו את כל חיות הים" },
  { id: "st-tourist",   emoji: "🧳", nameHebrew: "תייר עולמי",    howHebrew: "בקרו ב-10 מדינות בתלת־ממד" },
  { id: "st-linguist",  emoji: "🗣️", nameHebrew: "בלשן קטן",      howHebrew: "האזינו למילים ב-5 שפות" },
  { id: "st-quiz",      emoji: "🥇", nameHebrew: "אלוף החידונים",  howHebrew: "השיגו 3 מדליות זהב בחידונים" },
  { id: "st-flags",     emoji: "🚩", nameHebrew: "מלך הדגלים",     howHebrew: "השיגו מדליית זהב בחידון הדגלים" },
  { id: "st-daily",     emoji: "🔥", nameHebrew: "נחושים",         howHebrew: "סיימו את אתגר היום 3 ימים ברצף" },
  { id: "st-wonders",   emoji: "🏛️", nameHebrew: "תייר פלאים",     howHebrew: "בקרו ב-8 פלאי עולם" },
  { id: "st-all-wonders", emoji: "🗿", nameHebrew: "מגלה כל הפלאים", howHebrew: `בקרו בכל ${TOTAL_LANDMARKS} פלאי העולם` },
  { id: "st-treasure",  emoji: "💎", nameHebrew: "צייד אוצרות",    howHebrew: "מצאו 20 אוצרות בפלאי העולם" },
  { id: "st-all-treasures", emoji: "👑", nameHebrew: "אוצר לאומי", howHebrew: `מצאו את כל ${TOTAL_TREASURES} האוצרות` },
  { id: "st-letters",   emoji: "🔤", nameHebrew: "מכיר האותיות",   howHebrew: "הכירו את כל 22 האותיות" },
  { id: "st-reader",    emoji: "📖", nameHebrew: "קורא צעיר",      howHebrew: "קראו נכון 12 מילים" },
  { id: "st-math",      emoji: "➕", nameHebrew: "תלמיד מצטיין",   howHebrew: "אספו 6 כוכבים בחשבון בכיף" },
  { id: "st-memory",    emoji: "🃏", nameHebrew: "אלוף הזיכרון",   howHebrew: "נצחו 3 פעמים במשחק הזיכרון" },
  { id: "st-musician",  emoji: "🎵", nameHebrew: "מוזיקאי קטן",    howHebrew: "נגנו 3 שירים בתיבת הנגינה" },
  { id: "st-crew",      emoji: "🛰️", nameHebrew: "איש צוות התחנה", howHebrew: "גלו 10 מכשירים בתחנת החלל" },
  { id: "st-engineer",  emoji: "🧑‍🚀", nameHebrew: "מהנדס החלל",     howHebrew: `גלו את כל ${TOTAL_STATION_OBJECTS} המכשירים בתחנת החלל` },
  { id: "st-driver",    emoji: "🚗", nameHebrew: "נהג מספר 1",     howHebrew: "גלו את כל התחנות במסלול המכונית" },
  { id: "st-conductor", emoji: "🚂", nameHebrew: "מנהל הרכבת",     howHebrew: "גלו את כל התחנות במסלול הרכבת" },
  { id: "st-pilot",     emoji: "✈️", nameHebrew: "טייס צעיר",      howHebrew: "גלו את כל התחנות במסלול המטוס" },
  { id: "st-roads",     emoji: "🛣️", nameHebrew: "מלך הדרכים",     howHebrew: `גלו את כל ${TOTAL_LAND_SIGHTS} התחנות בכל המסלולים` },
  { id: "st-submariner", emoji: "🛥️", nameHebrew: "צוללן אמיץ",    howHebrew: "גלו 15 ממצאים במשלחת הצוללת" },
  { id: "st-abyss",     emoji: "🔱", nameHebrew: "שליט המצולות",   howHebrew: `גלו את כל ${TOTAL_DEEP_SEA_FINDS} הממצאים במעמקי הים` },
];

export const STICKER_BY_ID = new Map(STICKERS.map((s) => [s.id, s]));

const DEEP_CREATURE_IDS = MARINE_LIFE.filter((c) => c.zone === "deep").map((c) => c.id);

const SIGHTS_PER_VEHICLE = new Map<string, string[]>();
for (const s of LAND_SIGHTS) {
  const list = SIGHTS_PER_VEHICLE.get(s.vehicle) ?? [];
  list.push(s.id);
  SIGHTS_PER_VEHICLE.set(s.vehicle, list);
}

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

  if (p.israelDiscovered >= TOTAL_ISRAEL_SITES) unlocked.add("st-israel");
  if (p.planetsDiscovered >= TOTAL_SPACE_OBJECTS) unlocked.add("st-astronaut");
  if ((p.constellationsDiscovered ?? 0) >= TOTAL_CONSTELLATIONS) unlocked.add("st-stargazer");
  if ((p.seasonsSeen ?? 0) >= 4) unlocked.add("st-seasons");

  const ocean = p.oceanDiscovered ?? new Set<string>();
  if (ocean.size >= 15) unlocked.add("st-dolphin");
  if (DEEP_CREATURE_IDS.every((id) => ocean.has(id))) unlocked.add("st-deep");
  if (ocean.size >= TOTAL_MARINE_CREATURES) unlocked.add("st-ocean");
  if ((p.visitedCount ?? 0) >= 10) unlocked.add("st-tourist");
  if (p.flagsGold) unlocked.add("st-flags");
  if ((p.dailyStreak ?? 0) >= 3) unlocked.add("st-daily");
  if (p.languagesLearned >= 5) unlocked.add("st-linguist");
  if (p.goldMedals >= 3) unlocked.add("st-quiz");

  // 4.0: world wonders + treasures
  if ((p.landmarksVisited ?? 0) >= 8) unlocked.add("st-wonders");
  if ((p.landmarksVisited ?? 0) >= TOTAL_LANDMARKS) unlocked.add("st-all-wonders");
  if ((p.treasuresFound ?? 0) >= 20) unlocked.add("st-treasure");
  if ((p.treasuresFound ?? 0) >= TOTAL_TREASURES) unlocked.add("st-all-treasures");
  // 4.0: the little school
  if ((p.lettersKnown ?? 0) >= TOTAL_LETTERS) unlocked.add("st-letters");
  if ((p.wordsRead ?? 0) >= 12) unlocked.add("st-reader");
  if ((p.mathStarsTotal ?? 0) >= 6) unlocked.add("st-math");
  if ((p.memoryWins ?? 0) >= 3) unlocked.add("st-memory");
  if ((p.songsDone ?? 0) >= 3) unlocked.add("st-musician");

  // 5.0: space station, land journey, deep-sea expedition
  if ((p.stationDiscovered ?? 0) >= 10) unlocked.add("st-crew");
  if ((p.stationDiscovered ?? 0) >= TOTAL_STATION_OBJECTS) unlocked.add("st-engineer");
  const land = p.landDiscovered ?? new Set<string>();
  for (const [vehicle, sticker] of [["car", "st-driver"], ["train", "st-conductor"], ["plane", "st-pilot"]] as const) {
    const ids = SIGHTS_PER_VEHICLE.get(vehicle) ?? [];
    if (ids.length > 0 && ids.every((id) => land.has(id))) unlocked.add(sticker);
  }
  if (land.size >= TOTAL_LAND_SIGHTS) unlocked.add("st-roads");
  if ((p.deepSeaDiscovered ?? 0) >= 15) unlocked.add("st-submariner");
  if ((p.deepSeaDiscovered ?? 0) >= TOTAL_DEEP_SEA_FINDS) unlocked.add("st-abyss");

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
