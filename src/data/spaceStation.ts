// תחנת החלל — an explorable space station with 7 rooms. Every room is a 3D
// scene (three/SpaceStationScene) full of tappable equipment: consoles,
// levers, holograms, plants in zero gravity... Each object is a discovery
// with a kid-friendly fact, in the same flow as the ocean creatures.

export type StationRoomId =
  | "cockpit"
  | "lab"
  | "greenhouse"
  | "engine"
  | "observation"
  | "cargo"
  | "quarters";

/** Which procedural builder + tap animation the scene uses for an object. */
export type StationObjectKind =
  | "console"     // control desk with animated screens
  | "joystick"    // pilot stick that tilts when tapped
  | "radar"       // spinning radar dish screen
  | "radio"       // comms panel with blinking lights
  | "microscope"
  | "meteorite"   // glass case with a floating space rock
  | "scanner"     // planet scanner with a sweeping beam
  | "hologram"    // holographic planet table
  | "plantPod"    // glowing grow pods
  | "waterBubble" // floating water sphere
  | "tomato"      // space tomato planter
  | "sunLamp"     // grow light
  | "engineCore"  // pulsing reactor core
  | "lever"       // big power lever
  | "toolbox"     // floating toolbox with tools
  | "coolant"     // glowing coolant pipes
  | "telescope"
  | "bigWindow"   // panorama window with Earth outside
  | "starMap"     // glowing star chart
  | "camera"      // space camera on a mount
  | "crates"      // stack of cargo crates
  | "roboticArm"  // robotic arm that waves
  | "probe"       // small probe on a launch rail
  | "spacesuit"   // spacesuit on the wall
  | "sleepPod"    // sleeping bag on the wall
  | "treadmill"   // astronaut treadmill
  | "foodPack"    // floating food packets
  | "guitar";     // the astronaut's guitar

export interface StationRoomSpec {
  id: StationRoomId;
  nameHebrew: string;
  emoji: string;
  /** accent color for UI + room lighting */
  color: string;
  welcomeHebrew: string;
}

export interface StationObjectSpec {
  id: string;
  room: StationRoomId;
  nameHebrew: string;
  emoji: string;
  factHebrew: string;
  kind: StationObjectKind;
}

export const STATION_ROOMS: StationRoomSpec[] = [
  { id: "cockpit",     nameHebrew: "תא הפיקוד",   emoji: "🚀", color: "#38bdf8", welcomeHebrew: "ברוכים הבאים לתא הפיקוד! מכאן מטיסים את התחנה." },
  { id: "observation", nameHebrew: "תא התצפית",   emoji: "🔭", color: "#a78bfa", welcomeHebrew: "תא התצפית! תראו איזה נוף — כדור הארץ מתחתינו!" },
  { id: "lab",         nameHebrew: "המעבדה",      emoji: "🔬", color: "#34d399", welcomeHebrew: "המעבדה של התחנה! כאן חוקרים כוכבים ומטאוריטים." },
  { id: "greenhouse",  nameHebrew: "החממה",       emoji: "🌱", color: "#4ade80", welcomeHebrew: "החממה החללית! כאן מגדלים ירקות בלי כוח משיכה." },
  { id: "engine",      nameHebrew: "חדר המנועים", emoji: "⚙️", color: "#fb923c", welcomeHebrew: "חדר המנועים! מרגישים את הרעד של ליבת הכוח?" },
  { id: "cargo",       nameHebrew: "מחסן המטען",  emoji: "📦", color: "#facc15", welcomeHebrew: "מחסן המטען! כל האספקה מכדור הארץ נמצאת כאן." },
  { id: "quarters",    nameHebrew: "תא הצוות",    emoji: "🛏️", color: "#f472b6", welcomeHebrew: "תא הצוות! כאן האסטרונאוטים ישנים — בעמידה על הקיר!" },
];

export const STATION_ROOM_BY_ID = new Map(STATION_ROOMS.map((r) => [r.id, r]));

export const STATION_OBJECTS: StationObjectSpec[] = [
  // ── תא הפיקוד 🚀 ──────────────────────────────────────────────────────────
  { id: "st-console",   room: "cockpit", nameHebrew: "לוח הבקרה",       emoji: "🖥️", kind: "console",
    factHebrew: "בלוח הבקרה יש מאות כפתורים — האסטרונאוטים מתאמנים שנים כדי להכיר את כולם!" },
  { id: "st-joystick",  room: "cockpit", nameHebrew: "הגה החללית",      emoji: "🕹️", kind: "joystick",
    factHebrew: "בחלל אין כביש — ההגה מזיז את התחנה לכל כיוון: למעלה, למטה ואפילו סיבובים!" },
  { id: "st-radar",     room: "cockpit", nameHebrew: "מסך המכ\"ם",      emoji: "📡", kind: "radar",
    factHebrew: "המכ\"ם מגלה חלליות ואסטרואידים ממרחק של אלפי קילומטרים — עוד לפני שרואים אותם בעין!" },
  { id: "st-radio",     room: "cockpit", nameHebrew: "קשר לכדור הארץ",  emoji: "🎙️", kind: "radio",
    factHebrew: "האסטרונאוטים מדברים כל יום עם מרכז הבקרה — ואפילו מתקשרים הביתה למשפחה!" },

  // ── תא התצפית 🔭 ─────────────────────────────────────────────────────────
  { id: "st-telescope", room: "observation", nameHebrew: "הטלסקופ הגדול", emoji: "🔭", kind: "telescope",
    factHebrew: "מהחלל רואים כוכבים בלי ריצוד — כי אין אטמוספרה שמפריעה. בגלל זה טלסקופ חלל רואה הכי טוב!" },
  { id: "st-window",    room: "observation", nameHebrew: "חלון הפנורמה",  emoji: "🌍", kind: "bigWindow",
    factHebrew: "תחנת חלל מקיפה את כדור הארץ ב-90 דקות — האסטרונאוטים רואים 16 זריחות ביום אחד!" },
  { id: "st-starmap",   room: "observation", nameHebrew: "מפת הכוכבים",  emoji: "🗺️", kind: "starMap",
    factHebrew: "במפת הכוכבים מסומנים מיליוני כוכבים — ובכל זאת זה רק חלק קטנטן מהגלקסיה שלנו!" },
  { id: "st-camera",    room: "observation", nameHebrew: "מצלמת החלל",   emoji: "📷", kind: "camera",
    factHebrew: "אסטרונאוטים מצלמים מהחלון סופות, מדבריות וזוהר קוטבי — התמונות עוזרות למדענים בכדור הארץ!" },

  // ── המעבדה 🔬 ────────────────────────────────────────────────────────────
  { id: "st-microscope", room: "lab", nameHebrew: "המיקרוסקופ",        emoji: "🔬", kind: "microscope",
    factHebrew: "במעבדת החלל בודקים איך גבישים וזרעים גדלים בלי כוח משיכה — התוצאות מפתיעות כל פעם מחדש!" },
  { id: "st-meteorite",  room: "lab", nameHebrew: "המטאוריט",           emoji: "☄️", kind: "meteorite",
    factHebrew: "מטאוריט הוא אבן שהגיעה מהחלל! רוב המטאוריטים זקנים יותר מכדור הארץ עצמו." },
  { id: "st-scanner",    room: "lab", nameHebrew: "סורק כוכבי הלכת",    emoji: "🛰️", kind: "scanner",
    factHebrew: "הסורק בודק ממה עשויים כוכבי לכת רחוקים — בלי לנחות עליהם בכלל!" },
  { id: "st-hologram",   room: "lab", nameHebrew: "שולחן ההולוגרמות",   emoji: "🪐", kind: "hologram",
    factHebrew: "ההולוגרמה מציגה כוכבי לכת באוויר! אפשר לסובב אותם ביד ולראות אותם מכל צד." },

  // ── החממה 🌱 ─────────────────────────────────────────────────────────────
  { id: "st-plants",    room: "greenhouse", nameHebrew: "תאי הצמיחה",    emoji: "🌱", kind: "plantPod",
    factHebrew: "בחלל השורשים לא יודעים איפה זה 'למטה' — אז הצמחים גדלים לכל הכיוונים!" },
  { id: "st-water",     room: "greenhouse", nameHebrew: "בועת מים מרחפת", emoji: "💧", kind: "waterBubble",
    factHebrew: "בלי כוח משיכה, מים לא נשפכים — הם מרחפים באוויר ככדור עגול ומבריק!" },
  { id: "st-tomato",    room: "greenhouse", nameHebrew: "עגבניות החלל",  emoji: "🍅", kind: "tomato",
    factHebrew: "אסטרונאוטים כבר גידלו חסה, צנוניות ועגבניות בחלל — וגם טעמו אותן. טעים מהחלל!" },
  { id: "st-sunlamp",   room: "greenhouse", nameHebrew: "מנורות השמש",   emoji: "💡", kind: "sunLamp",
    factHebrew: "בחממה החללית אין שמש קבועה — מנורות מיוחדות בצבע סגול-ורוד נותנות לצמחים בדיוק את האור שהם צריכים." },

  // ── חדר המנועים ⚙️ ───────────────────────────────────────────────────────
  { id: "st-core",      room: "engine", nameHebrew: "ליבת הכוח",        emoji: "⚡", kind: "engineCore",
    factHebrew: "ליבת הכוח מייצרת חשמל לכל התחנה — ביחד עם לוחות השמש הענקיים שבחוץ!" },
  { id: "st-lever",     room: "engine", nameHebrew: "ידית המנוע",       emoji: "🎚️", kind: "lever",
    factHebrew: "כשמושכים את הידית, מנועי התחנה נדלקים ודוחפים אותה קצת למעלה — כדי שלא תתקרב לכדור הארץ!" },
  { id: "st-toolbox",   room: "engine", nameHebrew: "ארגז כלים מרחף",   emoji: "🧰", kind: "toolbox",
    factHebrew: "בחלל כל מברג חייב להיות קשור בחוט — אחרת הוא מרחף וברח! פעם אסטרונאוטית איבדה תיק כלים שלם בחלל." },
  { id: "st-coolant",   room: "engine", nameHebrew: "צינורות הקירור",   emoji: "🧊", kind: "coolant",
    factHebrew: "בחלל אין אוויר שמקרר — אז נוזל מיוחד זורם בצינורות ואוסף את החום מהמכונות." },

  // ── מחסן המטען 📦 ────────────────────────────────────────────────────────
  { id: "st-crates",    room: "cargo", nameHebrew: "ארגזי האספקה",      emoji: "📦", kind: "crates",
    factHebrew: "חלליות אספקה מביאות לתחנה אוכל, בגדים וניסויים — ולפעמים גם גלידה בהפתעה!" },
  { id: "st-arm",       room: "cargo", nameHebrew: "הזרוע הרובוטית",    emoji: "🦾", kind: "roboticArm",
    factHebrew: "הזרוע הרובוטית ארוכה כמו אוטובוס — היא תופסת חלליות אספקה ומצמידה אותן לתחנה בעדינות!" },
  { id: "st-probe",     room: "cargo", nameHebrew: "משגר הגשושיות",     emoji: "🛸", kind: "probe",
    factHebrew: "גשושית היא רובוט חוקר קטן — משגרים אותה מהתחנה והיא טסה לצלם מקומות שאיש לא ביקר בהם!" },
  { id: "st-suit",      room: "cargo", nameHebrew: "חליפת החלל",        emoji: "👨‍🚀", kind: "spacesuit",
    factHebrew: "חליפת חלל היא כמו חללית קטנה: יש בה אוויר, מים, מזגן ואפילו מיקרופון — והיא שוקלת יותר ממכם!" },

  // ── תא הצוות 🛏️ ─────────────────────────────────────────────────────────
  { id: "st-sleep",     room: "quarters", nameHebrew: "שק השינה הקיר",  emoji: "😴", kind: "sleepPod",
    factHebrew: "בחלל ישנים בשק שינה שקשור לקיר — אחרת מרחפים בשינה ומתנגשים בדברים!" },
  { id: "st-treadmill", room: "quarters", nameHebrew: "ההליכון החללי",  emoji: "🏃", kind: "treadmill",
    factHebrew: "אסטרונאוטים חייבים להתאמן שעתיים כל יום — בלי זה השרירים והעצמות נחלשים בחלל!" },
  { id: "st-food",      room: "quarters", nameHebrew: "אוכל אסטרונאוטים", emoji: "🌮", kind: "foodPack",
    factHebrew: "רוב האוכל בחלל מגיע בשקיות — פירורים אסורים כי הם מרחפים ונכנסים למכשירים ולאף!" },
  { id: "st-guitar",    room: "quarters", nameHebrew: "הגיטרה של הצוות", emoji: "🎸", kind: "guitar",
    factHebrew: "בתחנת החלל יש גיטרה אמיתית! אסטרונאוט קנדי אפילו הקליט שם קליפ שלם בחלל." },
];

export const STATION_OBJECT_BY_ID = new Map(STATION_OBJECTS.map((o) => [o.id, o]));
export const TOTAL_STATION_OBJECTS = STATION_OBJECTS.length;

export function stationObjectsFor(room: StationRoomId): StationObjectSpec[] {
  return STATION_OBJECTS.filter((o) => o.room === room);
}
