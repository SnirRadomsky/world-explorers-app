// פלאי העולם — 16 famous places reachable from the globe (gold pins) or the
// gallery. Each has a rich 3D scene (three/landmarkKit) and 3 hidden treasures
// to find — the "items" of the landmarks world.

export type LandmarkSky = "day" | "sunset" | "dusk" | "night" | "aurora" | "polar";
export type LandmarkGround = "sand" | "grass" | "snow" | "stone" | "savanna" | "plaza" | "ice";

export interface LandmarkTreasure {
  id: string;
  emoji: string;
  nameHebrew: string;
  factHebrew: string;
}

export interface LandmarkSpec {
  id: string;
  nameHebrew: string;
  emoji: string;
  countryHebrew: string;
  flagEmoji: string;
  /** real-world position for the globe pin */
  lat: number;
  lng: number;
  factHebrew: string;
  welcomeHebrew: string;
  sky: LandmarkSky;
  ground: LandmarkGround;
  treasures: LandmarkTreasure[];
}

export const LANDMARKS: LandmarkSpec[] = [
  {
    id: "kotel",
    nameHebrew: "הכותל המערבי",
    emoji: "🕍",
    countryHebrew: "ישראל",
    flagEmoji: "🇮🇱",
    lat: 31.7767, lng: 35.2345,
    factHebrew: "הכותל המערבי בירושלים עומד כבר יותר מ-2,000 שנה — ואנשים מכל העולם באים לגעת באבנים הענקיות שלו!",
    welcomeHebrew: "ברוכים הבאים לכותל המערבי בירושלים! תראו את האבנים הענקיות!",
    sky: "day", ground: "plaza",
    treasures: [
      { id: "kotel-dove",  emoji: "🕊️", nameHebrew: "יונת שלום",  factHebrew: "יונים לבנות גרות בין אבני הכותל הגבוהות!" },
      { id: "kotel-note",  emoji: "📜", nameHebrew: "פתק משאלה",  factHebrew: "אנשים כותבים משאלות על פתקים וטומנים אותם בין האבנים." },
      { id: "kotel-jar",   emoji: "🏺", nameHebrew: "כד עתיק",     factHebrew: "בחפירות ליד הכותל מוצאים כדים בני אלפי שנים!" },
    ],
  },
  {
    id: "pyramids",
    nameHebrew: "הפירמידות של גיזה",
    emoji: "🔺",
    countryHebrew: "מצרים",
    flagEmoji: "🇪🇬",
    lat: 29.9792, lng: 31.1342,
    factHebrew: "הפירמידה הגדולה נבנתה לפני 4,500 שנה מ-2 מיליון אבני ענק — בלי אף מנוף!",
    welcomeHebrew: "ברוכים הבאים למצרים! הפירמידות והספינקס מחכים לכם במדבר!",
    sky: "sunset", ground: "sand",
    treasures: [
      { id: "pyr-crown",  emoji: "👑", nameHebrew: "כתר פרעה",      factHebrew: "פרעה היה המלך של מצרים העתיקה — והכתר שלו היה כפול!" },
      { id: "pyr-scarab", emoji: "🪲", nameHebrew: "חרפושית קסומה", factHebrew: "המצרים האמינו שחיפושית החרפושית מביאה מזל טוב!" },
      { id: "pyr-camel",  emoji: "🐪", nameHebrew: "גמל המדבר",     factHebrew: "הגמל אוגר שומן בדבשת — ככה הוא שורד ימים בלי מים!" },
    ],
  },
  {
    id: "savanna",
    nameHebrew: "הסוואנה הגדולה",
    emoji: "🦁",
    countryHebrew: "קניה",
    flagEmoji: "🇰🇪",
    lat: -1.5, lng: 35.14,
    factHebrew: "בסוואנה של אפריקה מיליוני חיות בר נודדות יחד כל שנה — המסע הגדול בעולם!",
    welcomeHebrew: "ברוכים הבאים לסוואנה האפריקאית! אריות, פילים וג'ירפות מסתובבים חופשי!",
    sky: "sunset", ground: "savanna",
    treasures: [
      { id: "sav-giraffe", emoji: "🦒", nameHebrew: "ג'ירפה",       factHebrew: "לג'ירפה יש צוואר ענק — אבל בדיוק 7 חוליות, כמו לנו!" },
      { id: "sav-drum",    emoji: "🥁", nameHebrew: "תוף אפריקאי",  factHebrew: "בתופים אפריקאיים מספרים סיפורים — כל קצב הוא מילה!" },
      { id: "sav-baobab",  emoji: "🌳", nameHebrew: "עץ באובב",     factHebrew: "עץ הבאובב אוגר מים בגזע — ויכול לחיות אלפי שנים!" },
    ],
  },
  {
    id: "eiffel",
    nameHebrew: "מגדל אייפל",
    emoji: "🗼",
    countryHebrew: "צרפת",
    flagEmoji: "🇫🇷",
    lat: 48.8584, lng: 2.2945,
    factHebrew: "מגדל אייפל בפריז בנוי מ-18,000 חלקי ברזל — ובקיץ הוא גדל ב-15 סנטימטר מהחום!",
    welcomeHebrew: "ברוכים הבאים לפריז! הנה מגדל אייפל המפורסם, עשוי כולו ברזל!",
    sky: "dusk", ground: "grass",
    treasures: [
      { id: "eif-croissant", emoji: "🥐", nameHebrew: "קרואסון",    factHebrew: "הקרואסון הצרפתי עשוי מ-27 שכבות בצק חמאה!" },
      { id: "eif-baguette",  emoji: "🥖", nameHebrew: "בגט",        factHebrew: "בצרפת אופים 10 מיליארד בגטים בשנה!" },
      { id: "eif-palette",   emoji: "🎨", nameHebrew: "ציור אמן",   factHebrew: "ציירים מפורסמים מכל העולם באו לצייר בפריז!" },
    ],
  },
  {
    id: "greatwall",
    nameHebrew: "החומה הגדולה של סין",
    emoji: "🐉",
    countryHebrew: "סין",
    flagEmoji: "🇨🇳",
    lat: 40.4319, lng: 116.5704,
    factHebrew: "החומה הגדולה של סין נמתחת לאורך 21,000 קילומטר — כמו מירושלים לאוסטרליה ובחזרה!",
    welcomeHebrew: "ברוכים הבאים לסין! החומה הגדולה מטפסת על ההרים עד האופק!",
    sky: "day", ground: "grass",
    treasures: [
      { id: "wall-lantern", emoji: "🏮", nameHebrew: "פנס סיני",      factHebrew: "בחג הפנסים הסיני משחררים אלפי פנסים זוהרים לשמיים!" },
      { id: "wall-panda",   emoji: "🐼", nameHebrew: "דוב פנדה",      factHebrew: "הפנדה אוכלת במבוק 12 שעות ביום — ורק בסין!" },
      { id: "wall-kite",    emoji: "🪁", nameHebrew: "עפיפון דרקון",  factHebrew: "העפיפון הומצא בסין לפני יותר מ-2,000 שנה!" },
    ],
  },
  {
    id: "colosseum",
    nameHebrew: "הקולוסאום",
    emoji: "🏛️",
    countryHebrew: "איטליה",
    flagEmoji: "🇮🇹",
    lat: 41.8902, lng: 12.4922,
    factHebrew: "בקולוסאום ברומא ישבו 50,000 צופים לפני 2,000 שנה — כמו אצטדיון של היום!",
    welcomeHebrew: "ברוכים הבאים לרומא! הקולוסאום העתיק עם הקשתות המפורסמות!",
    sky: "day", ground: "stone",
    treasures: [
      { id: "col-shield", emoji: "🛡️", nameHebrew: "מגן גלדיאטור", factHebrew: "הגלדיאטורים התאמנו שנים לפני שנכנסו לזירה!" },
      { id: "col-laurel", emoji: "🌿", nameHebrew: "זר דפנה",       factHebrew: "ברומא העתיקה המנצחים קיבלו זר עלים ירוק לראש!" },
      { id: "col-coin",   emoji: "🪙", nameHebrew: "מטבע רומי",     factHebrew: "מטבעות רומיים עתיקים מתגלים עד היום באדמה!" },
    ],
  },
  {
    id: "liberty",
    nameHebrew: "פסל החירות",
    emoji: "🗽",
    countryHebrew: "ארצות הברית",
    flagEmoji: "🇺🇸",
    lat: 40.6892, lng: -74.0445,
    factHebrew: "פסל החירות בניו יורק היה מתנה מצרפת — הוא הפליג באונייה בתוך 350 חתיכות!",
    welcomeHebrew: "ברוכים הבאים לניו יורק! פסל החירות מרים את הלפיד מעל הים!",
    sky: "day", ground: "plaza",
    treasures: [
      { id: "lib-torch",  emoji: "🔥", nameHebrew: "לפיד הזהב",   factHebrew: "הלפיד של הפסל מצופה זהב אמיתי — ונוצץ בשמש!" },
      { id: "lib-book",   emoji: "📖", nameHebrew: "ספר החוקים",  factHebrew: "ביד השנייה הפסל מחזיק ספר עם תאריך מיוחד!" },
      { id: "lib-gull",   emoji: "🐦", nameHebrew: "שחף הנמל",    factHebrew: "שחפים מלווים את הספינות שמגיעות לנמל ניו יורק!" },
    ],
  },
  {
    id: "tajmahal",
    nameHebrew: "הטאג' מהאל",
    emoji: "🕌",
    countryHebrew: "הודו",
    flagEmoji: "🇮🇳",
    lat: 27.1751, lng: 78.0421,
    factHebrew: "הטאג' מהאל בהודו בנוי כולו משיש לבן — ו-20,000 בנאים בנו אותו במשך 22 שנה!",
    welcomeHebrew: "ברוכים הבאים להודו! ארמון השיש הלבן נוצץ מעל בריכת המים!",
    sky: "sunset", ground: "grass",
    treasures: [
      { id: "taj-lotus",   emoji: "🪷", nameHebrew: "פרח לוטוס",  factHebrew: "פרח הלוטוס צף על המים — הפרח הלאומי של הודו!" },
      { id: "taj-diamond", emoji: "💎", nameHebrew: "יהלום נוצץ", factHebrew: "בקירות הטאג' מהאל משובצות אלפי אבנים יקרות!" },
      { id: "taj-monkey",  emoji: "🐒", nameHebrew: "קוף שובב",   factHebrew: "קופים מסתובבים חופשי ליד הטאג' מהאל — ואוהבים לגנוב חטיפים!" },
    ],
  },
  {
    id: "opera",
    nameHebrew: "האופרה של סידני",
    emoji: "🎭",
    countryHebrew: "אוסטרליה",
    flagEmoji: "🇦🇺",
    lat: -33.8568, lng: 151.2153,
    factHebrew: "הגגות של האופרה בסידני נראים כמו מפרשים של ספינה ענקית — ויש עליהם מיליון רעפים!",
    welcomeHebrew: "ברוכים הבאים לסידני! בניין האופרה עם המפרשים הלבנים על המים!",
    sky: "day", ground: "plaza",
    treasures: [
      { id: "op-ticket", emoji: "🎫", nameHebrew: "כרטיס קסם",   factHebrew: "באופרה מופיעים זמרים, רקדנים ותזמורות מכל העולם!" },
      { id: "op-violin", emoji: "🎻", nameHebrew: "כינור",        factHebrew: "בתזמורת יש יותר כינורות מכל כלי אחר!" },
      { id: "op-koala",  emoji: "🐨", nameHebrew: "קואלה",        factHebrew: "הקואלה ישנה 20 שעות ביום — אלופת השינה של אוסטרליה!" },
    ],
  },
  {
    id: "machu",
    nameHebrew: "מאצ'ו פיצ'ו",
    emoji: "🏔️",
    countryHebrew: "פרו",
    flagEmoji: "🇵🇪",
    lat: -13.1631, lng: -72.545,
    factHebrew: "מאצ'ו פיצ'ו היא עיר שלמה שבנו בני האינקה על ראש הר — והיא הייתה נסתרת 400 שנה!",
    welcomeHebrew: "ברוכים הבאים לפרו! העיר הסודית של האינקה מציצה מבין העננים!",
    sky: "day", ground: "grass",
    treasures: [
      { id: "mac-llama", emoji: "🦙", nameHebrew: "למה",          factHebrew: "הלמה עוזרת לסחוב משאות בהרים — אבל כשנמאס לה, היא יורקת!" },
      { id: "mac-corn",  emoji: "🌽", nameHebrew: "תירס זהב",     factHebrew: "בני האינקה גידלו תירס ב-55 צבעים שונים!" },
      { id: "mac-map",   emoji: "🗺️", nameHebrew: "מפת סוד",      factHebrew: "רק ב-1911 חוקר מצא את הדרך הנסתרת אל העיר!" },
    ],
  },
  {
    id: "moai",
    nameHebrew: "פסלי המואי",
    emoji: "🗿",
    countryHebrew: "צ'ילה",
    flagEmoji: "🇨🇱",
    lat: -27.1127, lng: -109.3497,
    factHebrew: "באי הפסחא עומדים כמעט 1,000 פסלי ענק מסתוריים — הכבד שבהם שוקל כמו 20 פילים!",
    welcomeHebrew: "ברוכים הבאים לאי הפסחא! פסלי האבן הענקיים שומרים על האי!",
    sky: "dusk", ground: "grass",
    treasures: [
      { id: "moai-hat",   emoji: "🎩", nameHebrew: "כובע פוקאו", factHebrew: "לחלק מהפסלים יש 'כובע' אבן אדומה ששוקל טונות!" },
      { id: "moai-shell", emoji: "🐚", nameHebrew: "צדף פנינה",  factHebrew: "עיני הפסלים היו עשויות פעם מצדפים לבנים ואבן אדומה!" },
      { id: "moai-canoe", emoji: "🛶", nameHebrew: "סירת קאנו",  factHebrew: "המתיישבים הראשונים הגיעו לאי בסירות — אחרי חודשים בים!" },
    ],
  },
  {
    id: "fuji",
    nameHebrew: "הר פוג'י",
    emoji: "🗻",
    countryHebrew: "יפן",
    flagEmoji: "🇯🇵",
    lat: 35.3606, lng: 138.7274,
    factHebrew: "הר פוג'י הוא הר געש מושלם בצורתו — ובאביב פורחים סביבו מיליוני פרחי דובדבן ורודים!",
    welcomeHebrew: "ברוכים הבאים ליפן! הר פוג'י המושלג ושער הטורי האדום!",
    sky: "day", ground: "grass",
    treasures: [
      { id: "fuji-sakura",  emoji: "🌸", nameHebrew: "פרח דובדבן", factHebrew: "ביפן חוגגים את פריחת הדובדבן עם פיקניקים מתחת לעצים!" },
      { id: "fuji-onigiri", emoji: "🍙", nameHebrew: "כדור אורז",  factHebrew: "אוניגירי — כדור אורז עטוף באצה — הוא החטיף האהוב ביפן!" },
      { id: "fuji-koi",     emoji: "🎏", nameHebrew: "דגלוני דגים", factHebrew: "ביום הילדים תולים ביפן דגלונים בצורת דג קרפיון!" },
    ],
  },
  {
    id: "bigben",
    nameHebrew: "הביג בן",
    emoji: "🕰️",
    countryHebrew: "בריטניה",
    flagEmoji: "🇬🇧",
    lat: 51.5007, lng: -0.1246,
    factHebrew: "הפעמון הענק של הביג בן בלונדון שוקל כמו שני פילים — ומצלצל כבר 160 שנה!",
    welcomeHebrew: "ברוכים הבאים ללונדון! מגדל השעון המפורסם ליד הנהר!",
    sky: "dusk", ground: "plaza",
    treasures: [
      { id: "ben-umbrella", emoji: "☂️", nameHebrew: "מטרייה",      factHebrew: "בלונדון יורד גשם כמעט 160 ימים בשנה — מטרייה חובה!" },
      { id: "ben-tea",      emoji: "🫖", nameHebrew: "קומקום תה",   factHebrew: "הבריטים שותים 100 מיליון כוסות תה — כל יום!" },
      { id: "ben-bus",      emoji: "🚌", nameHebrew: "אוטובוס אדום", factHebrew: "האוטובוסים האדומים של לונדון הם בני שתי קומות!" },
    ],
  },
  {
    id: "redeemer",
    nameHebrew: "פסל הגואל",
    emoji: "🌄",
    countryHebrew: "ברזיל",
    flagEmoji: "🇧🇷",
    lat: -22.9519, lng: -43.2105,
    factHebrew: "פסל הגואל עומד על הר גבוה מעל ריו דה ז'ניירו — ופורש ידיים ברוחב של מטוס!",
    welcomeHebrew: "ברוכים הבאים לריו! הפסל הענק משקיף על העיר מראש ההר!",
    sky: "sunset", ground: "grass",
    treasures: [
      { id: "rio-ball",      emoji: "⚽", nameHebrew: "כדור זהב",   factHebrew: "ברזיל זכתה במונדיאל 5 פעמים — יותר מכל מדינה!" },
      { id: "rio-toucan",    emoji: "🦜", nameHebrew: "טוקן צבעוני", factHebrew: "ביערות ברזיל חיים תוכים בכל צבעי הקשת!" },
      { id: "rio-butterfly", emoji: "🦋", nameHebrew: "פרפר כחול",  factHebrew: "פרפר המורפו הכחול נוצץ כמו תכשיט מעופף!" },
    ],
  },
  {
    id: "aurora",
    nameHebrew: "הזוהר הצפוני",
    emoji: "🌌",
    countryHebrew: "נורווגיה",
    flagEmoji: "🇳🇴",
    lat: 69.6492, lng: 18.9553,
    factHebrew: "הזוהר הצפוני הוא וילון אורות ירוק-סגול שרוקד בשמי הקוטב — מתנה מהשמש!",
    welcomeHebrew: "ברוכים הבאים ללפלנד! תראו את האורות הקסומים רוקדים בשמיים!",
    sky: "aurora", ground: "snow",
    treasures: [
      { id: "aur-reindeer", emoji: "🦌", nameHebrew: "אייל הצפון", factHebrew: "לאיילי הצפון יש פרווה אפילו על האף — בגלל הקור!" },
      { id: "aur-mittens",  emoji: "🧤", nameHebrew: "כפפות צמר",  factHebrew: "בלפלנד הטמפרטורה יורדת למינוס 40 מעלות!" },
      { id: "aur-sled",     emoji: "🛷", nameHebrew: "מזחלת שלג",  factHebrew: "ילדי הצפון גולשים במזחלות — גם בדרך לבית הספר!" },
    ],
  },
  {
    id: "penguins",
    nameHebrew: "ממלכת הפינגווינים",
    emoji: "🐧",
    countryHebrew: "אנטארקטיקה",
    flagEmoji: "🇦🇶",
    lat: -64.0, lng: -60.0,
    factHebrew: "באנטארקטיקה חיים מיליוני פינגווינים — האבות שומרים על הביצים ברגליים בקור של מינוס 60!",
    welcomeHebrew: "ברוכים הבאים לאנטארקטיקה! מושבת פינגווינים שלמה על הקרח!",
    sky: "polar", ground: "ice",
    treasures: [
      { id: "pen-egg",     emoji: "🥚", nameHebrew: "ביצת פינגווין", factHebrew: "אבא פינגווין מחמם את הביצה על הרגליים חודשיים שלמים!" },
      { id: "pen-fish",    emoji: "🐟", nameHebrew: "דג ארוחה",      factHebrew: "פינגווין יכול לאכול קילוגרם דגים ביום אחד!" },
      { id: "pen-iceberg", emoji: "🧊", nameHebrew: "קרחון קטן",     factHebrew: "רוב הקרחון מסתתר מתחת למים — רואים רק את הקצה!" },
    ],
  },
];

export const LANDMARK_BY_ID = new Map(LANDMARKS.map((l) => [l.id, l]));
export const TOTAL_LANDMARKS = LANDMARKS.length;
export const ALL_TREASURES = LANDMARKS.flatMap((l) => l.treasures);
export const TOTAL_TREASURES = ALL_TREASURES.length;
export const TREASURE_BY_ID = new Map(ALL_TREASURES.map((t) => [t.id, t]));

/** The landmark a treasure belongs to. */
export function landmarkOfTreasure(treasureId: string): LandmarkSpec | undefined {
  return LANDMARKS.find((l) => l.treasures.some((t) => t.id === treasureId));
}
