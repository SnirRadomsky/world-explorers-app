// משלחת הצוללת — a deep-sea expedition to 5 special places: a shipwreck, a
// kelp forest, a glowing cave, a sunken city and hot vents with a research
// station. The child explores as a submarine or a diver
// (three/DeepSeaScene) and taps finds: treasures, animals to rescue,
// pollution to clean... every find is a discovery with a fact.

export type DeepSeaAreaId = "wreck" | "kelp" | "cave" | "ruins" | "vents";
export type DiveCraftId = "sub" | "diver";

/** Which procedural builder the scene uses for a find. */
export type FindKind =
  // shipwreck
  | "chest" | "anchor" | "bell" | "wheel" | "cannon" | "portOctopus"
  // kelp forest
  | "trappedTurtle" | "seahorses" | "kelpCrab" | "anemones" | "sardines" | "bottles"
  // glowing cave
  | "crystals" | "glowfish" | "pearls" | "stalactites" | "blindfish" | "caveEntrance"
  // sunken city
  | "statue" | "amphora" | "crown" | "mosaic" | "archway" | "coins"
  // vents + research station
  | "smoker" | "ventShrimp" | "tubeWorms" | "researchDome" | "diveRobot" | "giantClam";

export interface DeepSeaAreaSpec {
  id: DeepSeaAreaId;
  nameHebrew: string;
  emoji: string;
  /** water background color */
  water: string;
  /** exp2 fog density */
  fog: number;
  /** accent color for UI */
  color: string;
  welcomeHebrew: string;
  /** true = dark area, headlights/glows matter */
  dark?: boolean;
}

export interface DeepSeaFindSpec {
  id: string;
  area: DeepSeaAreaId;
  nameHebrew: string;
  emoji: string;
  factHebrew: string;
  kind: FindKind;
  /** special interaction flavor: rescue an animal / clean pollution / open a treasure */
  special?: "rescue" | "clean" | "treasure";
}

export interface DiveCraftSpec {
  id: DiveCraftId;
  nameHebrew: string;
  emoji: string;
  helloHebrew: string;
}

export const DIVE_CRAFTS: DiveCraftSpec[] = [
  { id: "sub",   nameHebrew: "צוללת",  emoji: "🛥️", helloHebrew: "עולים על הצוללת הצהובה! הפנסים דולקים — צוללים!" },
  { id: "diver", nameHebrew: "צוללן",  emoji: "🤿", helloHebrew: "לובשים סנפירים ומסכה! שוחים חופשי כמו דג." },
];

export const DEEP_SEA_AREAS: DeepSeaAreaSpec[] = [
  { id: "wreck", nameHebrew: "הספינה הטרופה", emoji: "🚢", water: "#0b3a55", fog: 0.03,  color: "#0ea5e9",
    welcomeHebrew: "ספינה טרופה עתיקה! מי יודע אילו אוצרות מסתתרים בה..." },
  { id: "kelp",  nameHebrew: "יער האצות",     emoji: "🌿", water: "#0d4a3a", fog: 0.028, color: "#10b981",
    welcomeHebrew: "יער אצות ענק! האצות גבוהות כמו בניינים ומתנדנדות בזרם." },
  { id: "cave",  nameHebrew: "מערת הזוהר",    emoji: "🔮", water: "#221c4d", fog: 0.034, color: "#8b5cf6", dark: true,
    welcomeHebrew: "מערה תת-ימית סודית! הגבישים כאן זוהרים באור קסום." },
  { id: "ruins", nameHebrew: "העיר השקועה",   emoji: "🏛️", water: "#14465e", fog: 0.03,  color: "#f59e0b",
    welcomeHebrew: "עיר עתיקה ששקעה בים לפני אלפי שנים! עמודים, פסלים ומטבעות זהב." },
  { id: "vents", nameHebrew: "המעיינות החמים", emoji: "🌋", water: "#262640", fog: 0.036, color: "#f97316", dark: true,
    welcomeHebrew: "הגעתם לקרקעית העמוקה! ארובות חמות ותחנת מחקר מהבהבת בחושך." },
];

export const DEEP_SEA_AREA_BY_ID = new Map(DEEP_SEA_AREAS.map((a) => [a.id, a]));

export const DEEP_SEA_FINDS: DeepSeaFindSpec[] = [
  // ── הספינה הטרופה 🚢 ─────────────────────────────────────────────────────
  { id: "ds-chest",    area: "wreck", kind: "chest",  special: "treasure", nameHebrew: "תיבת האוצר", emoji: "💰",
    factHebrew: "בקרקעית הים באמת מוצאים אוצרות מספינות עתיקות — מטבעות זהב ששכבו שם מאות שנים!" },
  { id: "ds-anchor",   area: "wreck", kind: "anchor",   nameHebrew: "העוגן הענק",   emoji: "⚓",
    factHebrew: "העוגן נתפס בקרקעית ומחזיק את הספינה במקום — גם בסערה חזקה!" },
  { id: "ds-bell",     area: "wreck", kind: "bell",     nameHebrew: "פעמון הספינה", emoji: "🔔",
    factHebrew: "לכל ספינה יש פעמון עם השם שלה — כשמוצאים אותו, יודעים איזו ספינה טבעה כאן!" },
  { id: "ds-wheel",    area: "wreck", kind: "wheel",    nameHebrew: "הגה הקברניט",  emoji: "☸️",
    factHebrew: "בהגה העץ הגדול הקברניט סובב את כל הספינה — כל ידית בהגה נקראת 'שפיצה'!" },
  { id: "ds-cannon",   area: "wreck", kind: "cannon",   nameHebrew: "התותח העתיק",  emoji: "🫙",
    factHebrew: "ספינות מלפני 300 שנה נשאו תותחים כבדים — היום הם בית נעים לדגים קטנים!" },
  { id: "ds-octopus",  area: "wreck", kind: "portOctopus", nameHebrew: "תמנון הצוהר", emoji: "🐙",
    factHebrew: "תמנונים אוהבים לגור בתוך ספינות טרופות — הם נכנסים דרך חלונות עגולים שנקראים צוהרים!" },

  // ── יער האצות 🌿 ─────────────────────────────────────────────────────────
  { id: "ds-turtle",   area: "kelp", kind: "trappedTurtle", special: "rescue", nameHebrew: "חילוץ הצב", emoji: "🐢",
    factHebrew: "הצלתם צב ים שהסתבך ברשת! חוקרי ים אמיתיים מצילים צבים כאלה ומחזירים אותם לים." },
  { id: "ds-bottles",  area: "kelp", kind: "bottles", special: "clean", nameHebrew: "ניקוי הים", emoji: "🧹",
    factHebrew: "כל הכבוד! אספתם זבל מהים. פלסטיק בים מסוכן לחיות — כל בקבוק שאוספים מציל דגים!" },
  { id: "ds-seahorse", area: "kelp", kind: "seahorses", nameHebrew: "משפחת הסוסונים", emoji: "🦄",
    factHebrew: "סוסוני ים נאחזים באצות עם הזנב — כמו קוף שנאחז בענף!" },
  { id: "ds-kelpcrab", area: "kelp", kind: "kelpCrab",  nameHebrew: "סרטן האצות",   emoji: "🦀",
    factHebrew: "סרטן האצות מדביק על עצמו חתיכות אצה — תחפושת מושלמת מפני טורפים!" },
  { id: "ds-anemone",  area: "kelp", kind: "anemones",  nameHebrew: "גן השושנות",   emoji: "🌸",
    factHebrew: "שושנת ים נראית כמו פרח — אבל היא בעצם חיה שתופסת אוכל בזרועות שלה!" },
  { id: "ds-sardines", area: "kelp", kind: "sardines",  nameHebrew: "מערבולת הסרדינים", emoji: "🐟",
    factHebrew: "אלפי סרדינים שוחים יחד ככדור ענק ומסתובב — ככה קשה לטורפים לתפוס דג אחד!" },

  // ── מערת הזוהר 🔮 ────────────────────────────────────────────────────────
  { id: "ds-crystals", area: "cave", kind: "crystals",  nameHebrew: "גבישי הקסם",   emoji: "💎",
    factHebrew: "במערות אמיתיות מצאו גבישים ענקיים באורך אוטובוס — הם גדלו לאט במשך מאות אלפי שנים!" },
  { id: "ds-glowfish", area: "cave", kind: "glowfish",  nameHebrew: "הדג הזוהר",    emoji: "✨",
    factHebrew: "יש דגים שמייצרים אור בעצמם — זה נקרא ביולומינסנציה, פנס טבעי בגוף!" },
  { id: "ds-pearls",   area: "cave", kind: "pearls", special: "treasure", nameHebrew: "צדפת הפנינים", emoji: "🦪",
    factHebrew: "פנינה נוצרת כשגרגר חול נכנס לצדפה — הצדפה עוטפת אותו בשכבות מבריקות שנים שלמות!" },
  { id: "ds-stalact",  area: "cave", kind: "stalactites", nameHebrew: "הנטיפים",    emoji: "🪨",
    factHebrew: "נטיפים גדלים טיפה אחרי טיפה מהתקרה — סנטימטר אחד לוקח מאה שנה!" },
  { id: "ds-blindfish", area: "cave", kind: "blindfish", nameHebrew: "דג המערות",   emoji: "🐡",
    factHebrew: "דגי מערות חיים בחושך מוחלט — לחלקם אין עיניים בכלל, והם 'רואים' עם חוש מיוחד בעור!" },
  { id: "ds-cavedoor", area: "cave", kind: "caveEntrance", nameHebrew: "המעבר הסודי", emoji: "🚪",
    factHebrew: "צוללנים מגלים מערות שאיש לא ראה מעולם — יש מערות תת-ימיות באורך של קילומטרים!" },

  // ── העיר השקועה 🏛️ ──────────────────────────────────────────────────────
  { id: "ds-statue",   area: "ruins", kind: "statue",   nameHebrew: "הפסל העתיק",   emoji: "🗿",
    factHebrew: "בים התיכון מצאו ערים שלמות מתחת למים — עם פסלים ורחובות מלפני אלפי שנים!" },
  { id: "ds-amphora",  area: "ruins", kind: "amphora",  nameHebrew: "כד הקדמונים",  emoji: "🏺",
    factHebrew: "בכדים כאלה הובילו פעם שמן זית ודבש בספינות — חלקם עדיין סגורים עם ההפתעה בפנים!" },
  { id: "ds-crown",    area: "ruins", kind: "crown", special: "treasure", nameHebrew: "כתר הזהב", emoji: "👑",
    factHebrew: "מצאתם כתר מלכותי! זהב לא מחליד גם אחרי אלפי שנים בים — הוא נשאר מבריק ויפה." },
  { id: "ds-mosaic",   area: "ruins", kind: "mosaic",   nameHebrew: "רצפת הפסיפס",  emoji: "🎨",
    factHebrew: "פסיפס עשוי מאלפי אבנים צבעוניות קטנות — ככה ציירו תמונות על הרצפה בעולם העתיק!" },
  { id: "ds-arch",     area: "ruins", kind: "archway",  nameHebrew: "שער העמודים",  emoji: "⛩️",
    factHebrew: "העמודים העתיקים עמדו פעם בשוק סואן — היום שוחים ביניהם דגים במקום אנשים!" },
  { id: "ds-coins",    area: "ruins", kind: "coins", special: "treasure", nameHebrew: "מטבעות הזהב", emoji: "🪙",
    factHebrew: "על מטבעות עתיקים חרוטים מלכים וספינות — כל מטבע מגלה לנו מי חי כאן פעם!" },

  // ── המעיינות החמים 🌋 ────────────────────────────────────────────────────
  { id: "ds-smoker",   area: "vents", kind: "smoker",    nameHebrew: "הארובה השחורה", emoji: "🌋",
    factHebrew: "מהארובות בקרקעית יוצאים מים חמים מאוד — הם מתפרצים כמו עשן שחור מתוך כדור הארץ!" },
  { id: "ds-shrimp",   area: "vents", kind: "ventShrimp", nameHebrew: "שרימפס המעיינות", emoji: "🦐",
    factHebrew: "ליד המעיינות החמים חיים המוני שרימפסים — להם לא אכפת מהחושך ומהחום!" },
  { id: "ds-worms",    area: "vents", kind: "tubeWorms",  nameHebrew: "תולעי הצינור", emoji: "🪱",
    factHebrew: "תולעי הצינור האדומות חיות בלי לאכול בכלל — חיידקים ידידותיים בגוף שלהן מכינים להן אוכל!" },
  { id: "ds-dome",     area: "vents", kind: "researchDome", nameHebrew: "תחנת המחקר", emoji: "🔬",
    factHebrew: "יש מעבדות אמיתיות בקרקעית הים! חוקרים גרים בהן ימים שלמים וחוקרים את המעמקים." },
  { id: "ds-robot",    area: "vents", kind: "diveRobot",  nameHebrew: "רובוט הצלילה", emoji: "🤖",
    factHebrew: "למקומות הכי עמוקים שולחים רובוטים — הם צוללים קילומטרים ומצלמים יצורים שאיש לא ראה!" },
  { id: "ds-clam",     area: "vents", kind: "giantClam",  nameHebrew: "הצדפה הענקית", emoji: "🐚",
    factHebrew: "צדפות ענק יכולות להגיע לגודל של אמבטיה — והן חיות יותר ממאה שנה!" },
];

export const DEEP_SEA_FIND_BY_ID = new Map(DEEP_SEA_FINDS.map((f) => [f.id, f]));
export const TOTAL_DEEP_SEA_FINDS = DEEP_SEA_FINDS.length;

export function findsFor(area: DeepSeaAreaId): DeepSeaFindSpec[] {
  return DEEP_SEA_FINDS.filter((f) => f.area === area);
}
