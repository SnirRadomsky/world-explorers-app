// מסע תחבורה — explore the land by car, train or plane. Each vehicle drives
// itself around a scenic loop (three/LandJourneyScene) past tappable sights:
// animals, waterfalls, castles, volcanoes... every sight is a discovery with
// a fact, in the same flow as the rest of the game.

export type VehicleId = "car" | "train" | "plane";

/** Which procedural builder the scene uses for a sight. */
export type SightKind =
  // car route
  | "deer" | "waterfall" | "windmill" | "castle" | "farm" | "orchard"
  | "flowers" | "ruins" | "picnic" | "viewpoint" | "rangers" | "lake"
  // train route
  | "tunnel" | "snowPeak" | "riverBridge" | "city" | "trainStation" | "sheep"
  | "pineForest" | "snowman" | "canyon" | "silo" | "eagleNest" | "geyser"
  // plane route
  | "volcano" | "rainbow" | "balloons" | "desert" | "skyCity" | "riverDelta"
  | "blueLake" | "iceMountain" | "skyRings" | "birdFlock" | "island" | "cloudCastle";

export interface VehicleSpec {
  id: VehicleId;
  nameHebrew: string;
  emoji: string;
  color: string;
  welcomeHebrew: string;
  /** what the journey is about, for the UI chip */
  routeHebrew: string;
}

export interface LandSightSpec {
  id: string;
  vehicle: VehicleId;
  nameHebrew: string;
  emoji: string;
  factHebrew: string;
  kind: SightKind;
  /** position along the loop, 0..1 */
  at: number;
  /** which side of the track, -1 = inner, 1 = outer */
  side: -1 | 1;
}

export const VEHICLES: VehicleSpec[] = [
  { id: "car",   nameHebrew: "מכונית", emoji: "🚗", color: "#ef4444", routeHebrew: "יערות · כפרים · הרים",
    welcomeHebrew: "יוצאים לטיול במכונית! שימו לב לחיות ולמפלים בצדי הדרך." },
  { id: "train", nameHebrew: "רכבת",   emoji: "🚂", color: "#10b981", routeHebrew: "הרים · שלג · גשרים",
    welcomeHebrew: "כל העולה! הרכבת יוצאת למסע בין הרים, מנהרות ושלג." },
  { id: "plane", nameHebrew: "מטוס",   emoji: "✈️", color: "#3b82f6", routeHebrew: "עננים · הרי געש · איים",
    welcomeHebrew: "טייסים צעירים, ממריאים! מעל העננים רואים את כל העולם." },
];

export const VEHICLE_BY_ID = new Map(VEHICLES.map((v) => [v.id, v]));

export const LAND_SIGHTS: LandSightSpec[] = [
  // ── מסלול המכונית 🚗 — יער, כפר, חווה, הרים ─────────────────────────────
  { id: "ld-deer",      vehicle: "car", kind: "deer",      at: 0.05, side: 1,  nameHebrew: "איילת היער",   emoji: "🦌",
    factHebrew: "לאייל צומחות קרניים חדשות בכל שנה — הן מהאיברים שגדלים הכי מהר בטבע!" },
  { id: "ld-waterfall", vehicle: "car", kind: "waterfall", at: 0.13, side: 1,  nameHebrew: "המפל הגדול",   emoji: "💦",
    factHebrew: "מים של מפל מלטשים את הסלע טיפה אחרי טיפה — במשך אלפי שנים!" },
  { id: "ld-windmill",  vehicle: "car", kind: "windmill",  at: 0.22, side: -1, nameHebrew: "טחנת הרוח",    emoji: "🌬️",
    factHebrew: "פעם טחנות רוח טחנו קמח — היום הן מייצרות חשמל נקי מהרוח!" },
  { id: "ld-farm",      vehicle: "car", kind: "farm",      at: 0.3,  side: 1,  nameHebrew: "חוות הפרות",   emoji: "🐄",
    factHebrew: "לכל פרה יש חברות קרובות בעדר — והיא עצובה כשמפרידים ביניהן!" },
  { id: "ld-orchard",   vehicle: "car", kind: "orchard",   at: 0.38, side: -1, nameHebrew: "מטע התפוחים", emoji: "🍎",
    factHebrew: "עץ תפוח אחד יכול להניב 400 תפוחים בשנה — והדבורים עוזרות לו בהפריה!" },
  { id: "ld-flowers",   vehicle: "car", kind: "flowers",   at: 0.45, side: 1,  nameHebrew: "שדה הפרחים",   emoji: "🌷",
    factHebrew: "הפרחים מסובבים את הראש אחרי השמש במשך היום — כמו מצפן של אור!" },
  { id: "ld-picnic",    vehicle: "car", kind: "picnic",    at: 0.53, side: -1, nameHebrew: "פינת הפיקניק", emoji: "🧺",
    factHebrew: "טיול טוב מתחיל בעצירה טובה — בפינת פיקניק עוצרים לנוח, לאכול ולהקשיב לציפורים." },
  { id: "ld-bridge",    vehicle: "car", kind: "lake",      at: 0.6,  side: 1,  nameHebrew: "אגם הברבורים", emoji: "🦢",
    factHebrew: "ברבורים בוחרים בן זוג אחד לכל החיים — ושוחים יחד שנים רבות!" },
  { id: "ld-castle",    vehicle: "car", kind: "castle",    at: 0.68, side: -1, nameHebrew: "הטירה העתיקה", emoji: "🏰",
    factHebrew: "לטירות היו חומות עבות וגשר שאפשר להרים — כדי להגן על מי שגר בפנים!" },
  { id: "ld-ruins",     vehicle: "car", kind: "ruins",     at: 0.76, side: 1,  nameHebrew: "העתיקות",      emoji: "🏛️",
    factHebrew: "ארכאולוגים חופרים בעדינות עם מברשות קטנות — כל חרס עתיק מספר סיפור בן אלפי שנים!" },
  { id: "ld-viewpoint", vehicle: "car", kind: "viewpoint", at: 0.85, side: -1, nameHebrew: "מצפה ההר",     emoji: "🔭",
    factHebrew: "ככל שמטפסים גבוה יותר רואים רחוק יותר — ממצפה גבוה אפשר לראות עשרות קילומטרים!" },
  { id: "ld-rangers",   vehicle: "car", kind: "rangers",   at: 0.93, side: 1,  nameHebrew: "תחנת הפקחים",  emoji: "🧑‍🌾",
    factHebrew: "פקחי הטבע שומרים על החיות והצמחים בשמורה — ותמיד שמחים לספר לטיילים על הטבע!" },

  // ── מסלול הרכבת 🚂 — הרים, שלג, מנהרות, העיר ────────────────────────────
  { id: "ld-station",   vehicle: "train", kind: "trainStation", at: 0.03, side: 1, nameHebrew: "תחנת הרכבת", emoji: "🚉",
    factHebrew: "בתחנת רכבת יש לוח זמנים, חנות מזכרות ומפות — נקודת ההתחלה של כל הרפתקה!" },
  { id: "ld-sheep",     vehicle: "train", kind: "sheep",     at: 0.11, side: -1, nameHebrew: "עדר הכבשים",  emoji: "🐑",
    factHebrew: "צמר הכבשים גדל כל הזמן — גוזזים אותו פעם בשנה והכבשה בכלל לא נפגעת!" },
  { id: "ld-pines",     vehicle: "train", kind: "pineForest", at: 0.19, side: 1, nameHebrew: "יער האורנים", emoji: "🌲",
    factHebrew: "עצי אורן נשארים ירוקים כל השנה — המחטים שלהם הם בעצם עלים דקיקים ועמידים!" },
  { id: "ld-tunnel",    vehicle: "train", kind: "tunnel",    at: 0.27, side: -1, nameHebrew: "המנהרה בהר",  emoji: "🚇",
    factHebrew: "מנהרות רכבת חוצבים משני צידי ההר בבת אחת — והקבוצות נפגשות בדיוק באמצע!" },
  { id: "ld-snowpeak",  vehicle: "train", kind: "snowPeak",  at: 0.36, side: 1,  nameHebrew: "הפסגה המושלגת", emoji: "🏔️",
    factHebrew: "בראש הרים גבוהים קר כל כך שהשלג לא נמס אף פעם — אפילו בקיץ!" },
  { id: "ld-snowman",   vehicle: "train", kind: "snowman",   at: 0.44, side: -1, nameHebrew: "איש השלג",    emoji: "⛄",
    factHebrew: "שלג הוא בעצם המון פתיתי קרח — ואין שני פתיתים זהים בכל העולם!" },
  { id: "ld-rbridge",   vehicle: "train", kind: "riverBridge", at: 0.52, side: 1, nameHebrew: "גשר הנהר",   emoji: "🌉",
    factHebrew: "גשרי רכבת בנויים בצורת קשתות — הצורה הזאת חזקה במיוחד ומחזיקה רכבות כבדות!" },
  { id: "ld-canyon",    vehicle: "train", kind: "canyon",    at: 0.6,  side: -1, nameHebrew: "הקניון",      emoji: "🏜️",
    factHebrew: "קניון נוצר כשנהר חופר בסלע מיליוני שנים — שכבות הצבע בקירות הן דפים בספר של כדור הארץ!" },
  { id: "ld-geyser",    vehicle: "train", kind: "geyser",    at: 0.68, side: 1,  nameHebrew: "הגייזר החם",  emoji: "♨️",
    factHebrew: "גייזר הוא מזרקה טבעית של מים רותחים — האדמה מחממת אותם עמוק למטה והם מתפרצים למעלה!" },
  { id: "ld-silo",      vehicle: "train", kind: "silo",      at: 0.76, side: -1, nameHebrew: "ממגורת הדגן", emoji: "🌾",
    factHebrew: "בממגורה שומרים את החיטה אחרי הקציר — ממנה מכינים את הקמח ללחם שלנו!" },
  { id: "ld-eagle",     vehicle: "train", kind: "eagleNest", at: 0.84, side: 1,  nameHebrew: "קן הנשרים",   emoji: "🦅",
    factHebrew: "נשרים בונים קן ענק על צוק גבוה — וחוזרים אליו כל שנה ומוסיפים עוד ענפים!" },
  { id: "ld-city",      vehicle: "train", kind: "city",      at: 0.92, side: -1, nameHebrew: "העיר הגדולה", emoji: "🏙️",
    factHebrew: "רכבות מגיעות עד ללב העיר — רכבת אחת יכולה להחליף מאות מכוניות בכביש!" },

  // ── מסלול המטוס ✈️ — מעל עננים, הרי געש, איים ───────────────────────────
  { id: "ld-volcano",   vehicle: "plane", kind: "volcano",   at: 0.05, side: 1,  nameHebrew: "הר הגעש",     emoji: "🌋",
    factHebrew: "עמוק בתוך הר געש יש סלע נוזלי לוהט — כשהוא מתפרץ קוראים לו לבה!" },
  { id: "ld-rainbow",   vehicle: "plane", kind: "rainbow",   at: 0.14, side: -1, nameHebrew: "הקשת בענן",   emoji: "🌈",
    factHebrew: "קשת נוצרת כשאור השמש עובר דרך טיפות גשם — מהמטוס אפשר לראות קשת עגולה שלמה!" },
  { id: "ld-balloons",  vehicle: "plane", kind: "balloons",  at: 0.22, side: 1,  nameHebrew: "הכדורים הפורחים", emoji: "🎈",
    factHebrew: "כדור פורח עולה כי אוויר חם קל מאוויר קר — הטייס מדליק להבה כדי לטפס גבוה!" },
  { id: "ld-skycity",   vehicle: "plane", kind: "skyCity",   at: 0.3,  side: -1, nameHebrew: "גורדי השחקים", emoji: "🏙️",
    factHebrew: "מלמעלה העיר נראית כמו לוח משחק — הבניינים הכי גבוהים בעולם מתנשאים לגובה של יותר מ-800 מטר!" },
  { id: "ld-delta",     vehicle: "plane", kind: "riverDelta", at: 0.38, side: 1, nameHebrew: "הנהר המתפתל", emoji: "🐍",
    factHebrew: "מהאוויר רואים שנהרות מתפתלים כמו נחש — הם תמיד מחפשים את הדרך הכי קלה לים!" },
  { id: "ld-desert",    vehicle: "plane", kind: "desert",    at: 0.46, side: -1, nameHebrew: "דיונות המדבר", emoji: "🏜️",
    factHebrew: "הרוח מזיזה את דיונות החול לאט לאט — מדבר שלם נודד כמה מטרים בכל שנה!" },
  { id: "ld-bluelake",  vehicle: "plane", kind: "blueLake",  at: 0.54, side: 1,  nameHebrew: "האגם הכחול",  emoji: "💙",
    factHebrew: "יש אגמים בצבע טורקיז מדהים — הצבע מגיע מאבקת סלעים דקיקה שהקרחונים טחנו!" },
  { id: "ld-island",    vehicle: "plane", kind: "island",    at: 0.62, side: -1, nameHebrew: "האי הבודד",   emoji: "🏝️",
    factHebrew: "יש איים שנולדו מהר געש שהתפרץ מתחת לים — ולאט לאט צמחו עליהם עצים וחופים!" },
  { id: "ld-birds",     vehicle: "plane", kind: "birdFlock", at: 0.7,  side: 1,  nameHebrew: "להקת הציפורים", emoji: "🦜",
    factHebrew: "ציפורים נודדות עפות בצורת חץ — כל ציפור עוזרת לחברה שמאחוריה לעוף בקלות!" },
  { id: "ld-icemount",  vehicle: "plane", kind: "iceMountain", at: 0.78, side: -1, nameHebrew: "הר הקרח",   emoji: "🏔️",
    factHebrew: "טייסים חוצים הרים בגובה שבו קר מ-50 מעלות מתחת לאפס — בתוך המטוס נעים וחמים!" },
  { id: "ld-cloudcastle", vehicle: "plane", kind: "cloudCastle", at: 0.86, side: 1, nameHebrew: "ענן הענק", emoji: "☁️",
    factHebrew: "ענן גשם ענק יכול לשקול כמו 100 פילים — אבל הוא מרחף כי הטיפות שלו קטנטנות!" },
  { id: "ld-rings",     vehicle: "plane", kind: "skyRings",  at: 0.94, side: -1, nameHebrew: "טבעות הטיסה", emoji: "⭕",
    factHebrew: "טייסים מתאמנים לעוף דרך שערים באוויר — זה מלמד אותם לטוס מדויק כמו אלופים!" },
];

export const LAND_SIGHT_BY_ID = new Map(LAND_SIGHTS.map((s) => [s.id, s]));
export const TOTAL_LAND_SIGHTS = LAND_SIGHTS.length;

export function sightsFor(vehicle: VehicleId): LandSightSpec[] {
  return LAND_SIGHTS.filter((s) => s.vehicle === vehicle);
}
