// Solar-system bodies for the space mode. Sizes/distances are stylized for
// kids (NOT to scale) — chosen so everything is visible and tappable.

import { SPACE_OBJECTS } from "./spaceObjects";

export interface PlanetSpec {
  id: string;
  nameHebrew: string;
  emoji: string;
  factHebrew: string;
  extraHebrew: string;    // a second fun line (comparison / detail)
  // Visual spec for the procedural texture painter:
  baseColor: string;
  accentColor: string;
  style: "rocky" | "banded" | "cloudy" | "icy" | "earth" | "sun" | "moon";
  radius: number;         // scene units (stylized)
  orbitRadius: number;    // scene units from the sun (0 = the sun itself)
  orbitSpeed: number;     // radians/sec (stylized)
  hasRings?: boolean;
  isDwarf?: boolean;
}

export const PLANETS: PlanetSpec[] = [
  {
    id: "sun", nameHebrew: "השמש", emoji: "☀️",
    factHebrew: "השמש היא כוכב ענק ולוהט — בלעדיה לא היו חיים בכדור הארץ!",
    extraHebrew: "מיליון כדורי ארץ יכולים להיכנס בתוך השמש!",
    baseColor: "#fdb813", accentColor: "#ff8c00", style: "sun",
    radius: 5.2, orbitRadius: 0, orbitSpeed: 0,
  },
  {
    id: "mercury", nameHebrew: "כוכב חמה", emoji: "🪨",
    factHebrew: "כוכב חמה הוא הכי קרוב לשמש — ביום לוהט ובלילה קפוא!",
    extraHebrew: "שנה שלמה שם נמשכת רק 88 ימים!",
    baseColor: "#9c8e7e", accentColor: "#6e6259", style: "rocky",
    radius: 0.9, orbitRadius: 9, orbitSpeed: 0.28,
  },
  {
    id: "venus", nameHebrew: "נוגה", emoji: "🌕",
    factHebrew: "נוגה הוא הכוכב הכי חם — חם יותר מתנור אפייה!",
    extraHebrew: "הוא מכוסה בעננים צהובים וסמיכים.",
    baseColor: "#e8c46f", accentColor: "#d4a13d", style: "cloudy",
    radius: 1.35, orbitRadius: 12.5, orbitSpeed: 0.2,
  },
  {
    id: "earth", nameHebrew: "כדור הארץ", emoji: "🌍",
    factHebrew: "הבית שלנו! הכוכב היחיד שאנחנו מכירים שיש בו חיים.",
    extraHebrew: "רובו מכוסה במים — בגלל זה הוא כחול מהחלל!",
    baseColor: "#3b82c4", accentColor: "#3fa060", style: "earth",
    radius: 1.45, orbitRadius: 16.5, orbitSpeed: 0.16,
  },
  {
    id: "moon", nameHebrew: "הירח", emoji: "🌙",
    factHebrew: "הירח מסתובב סביב כדור הארץ — אפשר לראות עליו מכתשים!",
    extraHebrew: "בני אדם כבר הלכו על הירח — ב-1969!",
    baseColor: "#c9c9c9", accentColor: "#9a9a9a", style: "moon",
    radius: 0.55, orbitRadius: 16.5, orbitSpeed: 0.16, // rendered orbiting Earth
  },
  {
    id: "mars", nameHebrew: "מאדים", emoji: "🔴",
    factHebrew: "מאדים אדום בגלל חלודה בחול שלו — ויש עליו רובוטים חוקרים!",
    extraHebrew: "בו נמצא ההר הכי גבוה במערכת השמש!",
    baseColor: "#c1533f", accentColor: "#8f3a2b", style: "rocky",
    radius: 1.1, orbitRadius: 20.5, orbitSpeed: 0.13,
  },
  {
    id: "jupiter", nameHebrew: "צדק", emoji: "🟠",
    factHebrew: "צדק הוא הכוכב הכי גדול — 1,300 כדורי ארץ נכנסים בתוכו!",
    extraHebrew: "הכתם האדום שלו הוא סערה ענקית שנמשכת מאות שנים!",
    baseColor: "#d8a468", accentColor: "#b0713a", style: "banded",
    radius: 3.1, orbitRadius: 26.5, orbitSpeed: 0.09,
  },
  {
    id: "saturn", nameHebrew: "שבתאי", emoji: "🪐",
    factHebrew: "לשבתאי יש טבעות יפהפיות עשויות מקרח ואבנים!",
    extraHebrew: "הוא קל כל כך שהיה צף באמבטיה ענקית!",
    baseColor: "#e3c88f", accentColor: "#c3a15e", style: "banded",
    radius: 2.7, orbitRadius: 33, orbitSpeed: 0.075, hasRings: true,
  },
  {
    id: "uranus", nameHebrew: "אורנוס", emoji: "🔵",
    factHebrew: "אורנוס מסתובב על הצד — כמו כדור שמתגלגל!",
    extraHebrew: "הוא קר מאוד וצבעו תכלת בגלל גז מיוחד.",
    baseColor: "#8fd3e8", accentColor: "#5db6d1", style: "icy",
    radius: 1.9, orbitRadius: 39, orbitSpeed: 0.06,
  },
  {
    id: "neptune", nameHebrew: "נפטון", emoji: "🔷",
    factHebrew: "בנפטון נושבות הרוחות הכי חזקות במערכת השמש!",
    extraHebrew: "הוא כל כך רחוק שהשמש נראית ממנו כמו כוכב קטן.",
    baseColor: "#4169c9", accentColor: "#2c4a9e", style: "icy",
    radius: 1.85, orbitRadius: 44.5, orbitSpeed: 0.05,
  },
  {
    id: "pluto", nameHebrew: "פלוטו", emoji: "🤍",
    factHebrew: "פלוטו הקטן הוא 'כוכב לכת ננסי' — קטן יותר מהירח שלנו!",
    extraHebrew: "יש עליו צורה בהירה שנראית בדיוק כמו לב! 💙",
    baseColor: "#d8c4ad", accentColor: "#a88f77", style: "moon",
    radius: 0.5, orbitRadius: 49.5, orbitSpeed: 0.04, isDwarf: true,
  },
];

export const PLANET_BY_ID = new Map(PLANETS.map((p) => [p.id, p]));
/** Planets + the extra space objects (belt/comet/ISS/astronaut/Hubble/galaxy) share one discovery counter. */
export const TOTAL_SPACE_OBJECTS = PLANETS.length + SPACE_OBJECTS.length; // 17
