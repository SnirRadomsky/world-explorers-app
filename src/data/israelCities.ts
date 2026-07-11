export interface IsraelCity {
  id: string;
  nameHebrew: string;
  coordinates: [number, number]; // [lng, lat]
  districtId: string; // iso_3166_2
  /** Optional spice: a small emoji + kid-friendly fact, spoken on first discovery. */
  emoji?: string;
  factHebrew?: string;
}

/** A special attraction (lake, crater, fortress...) — a golden star pin on the map. */
export interface IsraelPlace {
  id: string;
  nameHebrew: string;
  emoji: string;
  coordinates: [number, number]; // [lng, lat]
  factHebrew: string;
}

export interface IsraelDistrict {
  id: string;        // iso_3166_2, e.g. "IL-D"
  nameHebrew: string;
  color: string;
}

export const ISRAEL_DISTRICTS: IsraelDistrict[] = [
  { id: "IL-Z",  nameHebrew: "מחוז הצפון",       color: "#3b82f6" },
  { id: "IL-HA", nameHebrew: "מחוז חיפה",        color: "#8b5cf6" },
  { id: "IL-M",  nameHebrew: "מחוז המרכז",       color: "#f59e0b" },
  { id: "IL-TA", nameHebrew: "מחוז תל אביב",     color: "#ec4899" },
  { id: "IL-JM", nameHebrew: "מחוז ירושלים",     color: "#06b6d4" },
  { id: "IL-WB", nameHebrew: "יהודה ושומרון",    color: "#f97316" },
  { id: "IL-D",  nameHebrew: "מחוז הדרום",       color: "#10b981" },
];

export const DISTRICT_BY_ID = new Map(ISRAEL_DISTRICTS.map((d) => [d.id, d]));

export const ISRAEL_CITIES: IsraelCity[] = [
  // מחוז הצפון
  { id: "il-metula",        nameHebrew: "מטולה",           coordinates: [35.5683, 33.2741], districtId: "IL-Z", emoji: "🏔️", factHebrew: "המושבה הכי צפונית בישראל — ממש על הגבול!" },
  { id: "il-kiryat-shmona", nameHebrew: "קרית שמונה",      coordinates: [35.5697, 33.2095], districtId: "IL-Z", emoji: "🚡", factHebrew: "העיר הכי צפונית בישראל — למרגלות הרי הגליל!" },
  { id: "il-shlomi",        nameHebrew: "שלומי",            coordinates: [35.1601, 33.0668], districtId: "IL-Z" },
  { id: "il-maalot",        nameHebrew: "מעלות-תרשיחא",    coordinates: [35.2720, 33.0159], districtId: "IL-Z" },
  { id: "il-katzrin",       nameHebrew: "קצרין",            coordinates: [35.6903, 32.9951], districtId: "IL-Z", emoji: "🍇", factHebrew: "בירת הגולן — מוקפת מעיינות ומטעים!" },
  { id: "il-safed",         nameHebrew: "צפת",              coordinates: [35.4965, 32.9648], districtId: "IL-Z", emoji: "🎨", factHebrew: "עיר בהרים עם סמטאות כחולות — מהגבוהות בישראל!" },
  { id: "il-hazor",         nameHebrew: "חצור הגלילית",     coordinates: [35.5381, 32.9731], districtId: "IL-Z" },
  { id: "il-rosh-pina",     nameHebrew: "ראש פינה",         coordinates: [35.5483, 32.9686], districtId: "IL-Z", emoji: "🌸", factHebrew: "מהמושבות הראשונות בגליל — עם רחוב אבנים עתיק ויפה!" },
  { id: "il-karmiel",       nameHebrew: "כרמיאל",           coordinates: [35.2969, 32.9167], districtId: "IL-Z", emoji: "💃", factHebrew: "עיר המחולות — כל שנה רוקדים בה בפסטיבל ענק!" },
  { id: "il-shfaram",       nameHebrew: "שפרעם",            coordinates: [35.1671, 32.8043], districtId: "IL-Z" },
  { id: "il-tiberias",      nameHebrew: "טבריה",            coordinates: [35.5312, 32.7940], districtId: "IL-Z", emoji: "⛵", factHebrew: "עיר על שפת הכנרת — האגם המתוק הגדול של ישראל!" },
  { id: "il-nazareth",      nameHebrew: "נצרת",             coordinates: [35.3035, 32.6996], districtId: "IL-Z", emoji: "🕍", factHebrew: "עיר עתיקה בגליל עם שווקים צבעוניים!" },
  { id: "il-nof-hagalil",   nameHebrew: "נוף הגליל",        coordinates: [35.3308, 32.7023], districtId: "IL-Z" },
  { id: "il-migdal-haemek", nameHebrew: "מגדל העמק",        coordinates: [35.2394, 32.6794], districtId: "IL-Z" },
  { id: "il-yokneam",       nameHebrew: "יקנעם עילית",      coordinates: [35.1100, 32.6590], districtId: "IL-Z", emoji: "💻", factHebrew: "עיר קטנה עם המון חברות מחשבים חכמות!" },
  { id: "il-afula",         nameHebrew: "עפולה",            coordinates: [35.2892, 32.6076], districtId: "IL-Z", emoji: "🌻", factHebrew: "בירת העמק — מוקפת שדות חמניות ירוקים!" },
  { id: "il-beit-shean",    nameHebrew: "בית שאן",          coordinates: [35.4999, 32.4989], districtId: "IL-Z", emoji: "🏛️", factHebrew: "עיר עם שרידים רומיים עתיקים ומרשימים!" },

  // מחוז חיפה
  { id: "il-haifa",         nameHebrew: "חיפה",             coordinates: [34.9896, 32.7940], districtId: "IL-HA", emoji: "⚓", factHebrew: "עיר על הר הכרמל — עם הגנים הבהאיים היפהפיים והנמל הגדול!" },
  { id: "il-kiryat-ata",    nameHebrew: "קרית אתא",         coordinates: [35.1074, 32.8095], districtId: "IL-HA" },
  { id: "il-kiryat-yam",    nameHebrew: "קרית ים",          coordinates: [35.0668, 32.8503], districtId: "IL-HA" },
  { id: "il-kiryat-motzkin",nameHebrew: "קרית מוצקין",      coordinates: [35.0771, 32.8375], districtId: "IL-HA" },
  { id: "il-kiryat-bialik", nameHebrew: "קרית ביאליק",      coordinates: [35.0856, 32.8275], districtId: "IL-HA" },
  { id: "il-nesher",        nameHebrew: "נשר",              coordinates: [35.0424, 32.7657], districtId: "IL-HA", emoji: "🌉", factHebrew: "יש בה גשרים תלויים מעל נחל קטן ביער!" },
  { id: "il-tirat-carmel",  nameHebrew: "טירת כרמל",        coordinates: [34.9720, 32.7599], districtId: "IL-HA" },
  { id: "il-acre",          nameHebrew: "עכו",              coordinates: [35.0818, 32.9228], districtId: "IL-HA", emoji: "🏰", factHebrew: "עיר נמל עתיקה עם חומות וסמטאות מימי האבירים!" },
  { id: "il-nahariya",      nameHebrew: "נהריה",            coordinates: [35.0950, 33.0070], districtId: "IL-HA", emoji: "🚲", factHebrew: "עיר חוף צפונית עם נחל שזורם ממש באמצע הרחוב!" },
  { id: "il-umm-al-fahm",   nameHebrew: "אום אל-פחם",       coordinates: [35.1522, 32.5166], districtId: "IL-HA", emoji: "⛰️", factHebrew: "עיר גדולה על ההר בואדי עארה!" },
  { id: "il-zichron-yaakov",nameHebrew: "זכרון יעקב",       coordinates: [34.9579, 32.5670], districtId: "IL-HA", emoji: "🍷", factHebrew: "מושבה על הכרמל עם יקבים מפורסמים ורחוב מדרחוב יפה!" },
  { id: "il-or-akiva",      nameHebrew: "אור עקיבא",        coordinates: [34.9172, 32.5065], districtId: "IL-HA" },
  { id: "il-hadera",        nameHebrew: "חדרה",             coordinates: [34.9175, 32.4346], districtId: "IL-HA", emoji: "🌴", factHebrew: "עיר בין פרדסים — עם ארובות תחנת הכוח הגדולה על החוף!" },

  // מחוז המרכז
  { id: "il-netanya",       nameHebrew: "נתניה",            coordinates: [34.8567, 32.3215], districtId: "IL-M", emoji: "🪂", factHebrew: "עיר עם צוקים גבוהים מעל חוף הים התיכון!" },
  { id: "il-raanana",       nameHebrew: "רעננה",            coordinates: [34.8705, 32.1841], districtId: "IL-M" },
  { id: "il-hod-hasharon",  nameHebrew: "הוד השרון",        coordinates: [34.8932, 32.1500], districtId: "IL-M" },
  { id: "il-herzliya",      nameHebrew: "הרצליה",           coordinates: [34.8440, 32.1663], districtId: "IL-M", emoji: "⛵", factHebrew: "עיר על שם הרצל — עם מרינה מלאה סירות לבנות!" },
  { id: "il-ramat-hasharon",nameHebrew: "רמת השרון",        coordinates: [34.8393, 32.1461], districtId: "IL-M" },
  { id: "il-kfar-saba",     nameHebrew: "כפר סבא",          coordinates: [34.9078, 32.1786], districtId: "IL-M" },
  { id: "il-rosh-haayin",   nameHebrew: "ראש העין",         coordinates: [34.9561, 32.0956], districtId: "IL-M", emoji: "💧", factHebrew: "ליד מעיינות הירקון — מכאן מתחיל הנהר לזרום!" },
  { id: "il-petah-tikva",   nameHebrew: "פתח תקווה",        coordinates: [34.8878, 32.0878], districtId: "IL-M", emoji: "🚜", factHebrew: "אם המושבות — המושבה העברית הראשונה!" },
  { id: "il-yehud",         nameHebrew: "יהוד",             coordinates: [34.8903, 32.0334], districtId: "IL-M" },
  { id: "il-lod",           nameHebrew: "לוד",              coordinates: [34.8958, 31.9516], districtId: "IL-M", emoji: "✈️", factHebrew: "לידה נמצא שדה התעופה הגדול של ישראל — נתב\"ג!" },
  { id: "il-ramla",         nameHebrew: "רמלה",             coordinates: [34.8651, 31.9285], districtId: "IL-M" },
  { id: "il-rishon",        nameHebrew: "ראשון לציון",      coordinates: [34.7996, 31.9730], districtId: "IL-M", emoji: "🎶", factHebrew: "מהמושבות הראשונות — כאן שרו לראשונה את התקווה!" },
  { id: "il-nes-ziona",     nameHebrew: "נס ציונה",         coordinates: [34.7997, 31.9293], districtId: "IL-M" },
  { id: "il-rehovot",       nameHebrew: "רחובות",           coordinates: [34.8120, 31.8928], districtId: "IL-M", emoji: "🔬", factHebrew: "עיר המדע — עם מכון ויצמן המפורסם!" },
  { id: "il-yavne",         nameHebrew: "יבנה",             coordinates: [34.7384, 31.8781], districtId: "IL-M" },
  { id: "il-gedera",        nameHebrew: "גדרה",             coordinates: [34.7793, 31.8136], districtId: "IL-M" },
  { id: "il-modiin",        nameHebrew: "מודיעין",          coordinates: [35.0102, 31.8969], districtId: "IL-M", emoji: "🕎", factHebrew: "עיר מתוכננת וחדשה — ליד ההרים של סיפור החנוכה!" },

  // מחוז תל אביב
  { id: "il-tel-aviv",      nameHebrew: "תל אביב",          coordinates: [34.7818, 32.0853], districtId: "IL-TA", emoji: "🏖️", factHebrew: "העיר שלא ישנה — עם חוף ים ארוך והבתים הלבנים המפורסמים!" },
  { id: "il-bnei-brak",     nameHebrew: "בני ברק",          coordinates: [34.8338, 32.0831], districtId: "IL-TA" },
  { id: "il-ramat-gan",     nameHebrew: "רמת גן",           coordinates: [34.8186, 32.0700], districtId: "IL-TA", emoji: "🦁", factHebrew: "עיר הספארי! חיות מסתובבות חופשי בפארק הענק." },
  { id: "il-givatayim",     nameHebrew: "גבעתיים",          coordinates: [34.8123, 32.0720], districtId: "IL-TA" },
  { id: "il-kiryat-ono",    nameHebrew: "קרית אונו",        coordinates: [34.8554, 32.0636], districtId: "IL-TA" },
  { id: "il-or-yehuda",     nameHebrew: "אור יהודה",        coordinates: [34.8552, 32.0300], districtId: "IL-TA" },
  { id: "il-holon",         nameHebrew: "חולון",            coordinates: [34.7793, 32.0101], districtId: "IL-TA", emoji: "🧸", factHebrew: "עיר הילדים — עם מוזיאון ילדים מפורסם!" },
  { id: "il-bat-yam",       nameHebrew: "בת ים",            coordinates: [34.7502, 32.0227], districtId: "IL-TA", emoji: "🌅", factHebrew: "עיר על החוף עם טיילת יפה מול השקיעה!" },

  // מחוז ירושלים
  { id: "il-jerusalem",     nameHebrew: "ירושלים",          coordinates: [35.2137, 31.7683], districtId: "IL-JM", emoji: "🦁", factHebrew: "בירת ישראל — העיר הכי גדולה בארץ, עם חומות עתיקות בנות אלפי שנים!" },
  { id: "il-beit-shemesh",  nameHebrew: "בית שמש",          coordinates: [34.9908, 31.7459], districtId: "IL-JM" },
  { id: "il-mevaseret-zion",nameHebrew: "מבשרת ציון",       coordinates: [35.1660, 31.8062], districtId: "IL-JM" },
  { id: "il-abu-ghosh",     nameHebrew: "אבו גוש",          coordinates: [35.1079, 31.8043], districtId: "IL-JM", emoji: "🥙", factHebrew: "כפר בהרי ירושלים שמפורסם בחומוס הכי טעים!" },

  // יהודה ושומרון
  { id: "il-nablus",        nameHebrew: "שכם",              coordinates: [35.2605, 32.2211], districtId: "IL-WB" },
  { id: "il-ariel",         nameHebrew: "אריאל",            coordinates: [35.1667, 32.1061], districtId: "IL-WB" },
  { id: "il-ramallah",      nameHebrew: "רמאללה",           coordinates: [35.2057, 31.9038], districtId: "IL-WB" },
  { id: "il-jericho",       nameHebrew: "יריחו",            coordinates: [35.4610, 31.8561], districtId: "IL-WB", emoji: "🌴", factHebrew: "אחת הערים העתיקות בעולם — ליד ים המלח!" },
  { id: "il-maaleh-adumim", nameHebrew: "מעלה אדומים",      coordinates: [35.2985, 31.7770], districtId: "IL-WB" },
  { id: "il-bethlehem",     nameHebrew: "בית לחם",          coordinates: [35.2024, 31.7054], districtId: "IL-WB", emoji: "⭐", factHebrew: "עיר עתיקה בהרי יהודה!" },
  { id: "il-hebron",        nameHebrew: "חברון",            coordinates: [35.0998, 31.5326], districtId: "IL-WB", emoji: "🏛️", factHebrew: "עיר עתיקה עם מערת המכפלה!" },

  // מחוז הדרום
  { id: "il-ashdod",        nameHebrew: "אשדוד",            coordinates: [34.6499, 31.8040], districtId: "IL-D", emoji: "🚢", factHebrew: "עיר נמל גדולה — לשם מגיעות אוניות ענק מכל העולם!" },
  { id: "il-ashkelon",      nameHebrew: "אשקלון",           coordinates: [34.5748, 31.6688], districtId: "IL-D", emoji: "🏺", factHebrew: "אחת הערים העתיקות בעולם — עם חוף ים יפהפה!" },
  { id: "il-kiryat-gat",    nameHebrew: "קרית גת",          coordinates: [34.7640, 31.6107], districtId: "IL-D" },
  { id: "il-kiryat-malachi",nameHebrew: "קרית מלאכי",       coordinates: [34.7442, 31.7291], districtId: "IL-D" },
  { id: "il-sderot",        nameHebrew: "שדרות",            coordinates: [34.5975, 31.5241], districtId: "IL-D", emoji: "🎸", factHebrew: "עיר של מוזיקה — הרבה להקות ישראליות נולדו כאן!" },
  { id: "il-netivot",       nameHebrew: "נתיבות",           coordinates: [34.5853, 31.4206], districtId: "IL-D" },
  { id: "il-rahat",         nameHebrew: "רהט",              coordinates: [34.7553, 31.3926], districtId: "IL-D", emoji: "🐪", factHebrew: "העיר הבדואית הגדולה בעולם!" },
  { id: "il-ofakim",        nameHebrew: "אופקים",           coordinates: [34.6203, 31.3141], districtId: "IL-D" },
  { id: "il-beersheba",     nameHebrew: "באר שבע",          coordinates: [34.7913, 31.2518], districtId: "IL-D", emoji: "🏜️", factHebrew: "בירת הנגב! העיר הגדולה של המדבר." },
  { id: "il-omer",          nameHebrew: "עומר",             coordinates: [34.8480, 31.2632], districtId: "IL-D" },
  { id: "il-arad",          nameHebrew: "ערד",              coordinates: [35.2127, 31.2587], districtId: "IL-D", emoji: "🌬️", factHebrew: "עיר על גבול המדבר — עם אוויר צלול במיוחד!" },
  { id: "il-dimona",        nameHebrew: "דימונה",           coordinates: [35.0326, 31.0676], districtId: "IL-D", emoji: "🌵", factHebrew: "עיר בלב מדבר הנגב!" },
  { id: "il-yeruham",       nameHebrew: "ירוחם",            coordinates: [34.9285, 30.9877], districtId: "IL-D" },
  { id: "il-mitzpe-ramon",  nameHebrew: "מצפה רמון",        coordinates: [34.8010, 30.6099], districtId: "IL-D", emoji: "🔭", factHebrew: "העיירה על שפת המכתש הענק — עם שמי כוכבים מדהימים בלילה!" },
  { id: "il-eilat",         nameHebrew: "אילת",             coordinates: [34.9519, 29.5581], districtId: "IL-D", emoji: "🐠", factHebrew: "העיר הכי דרומית — ים אדום, דגים צבעוניים ושמש כל השנה!" },
];

/** Special attractions — golden star pins with a fact that is spoken aloud. */
export const ISRAEL_PLACES: IsraelPlace[] = [
  { id: "place-hermon",      nameHebrew: "החרמון",           emoji: "⛷️", coordinates: [35.7400, 33.2900], factHebrew: "ההר הכי גבוה בישראל — בחורף יורד בו שלג ואפשר לגלוש!" },
  { id: "place-rosh-hanikra",nameHebrew: "ראש הנקרה",        emoji: "🚡", coordinates: [35.1050, 33.0930], factHebrew: "מערות לבנות וקסומות שהים חצב בסלע — יורדים אליהן ברכבל!" },
  { id: "place-kinneret",    nameHebrew: "הכנרת",            emoji: "🌊", coordinates: [35.5900, 32.8100], factHebrew: "האגם המתוק הגדול של ישראל — ממנו שותים מים בכל הארץ!" },
  { id: "place-carmel",      nameHebrew: "הר הכרמל",         emoji: "🌲", coordinates: [35.0300, 32.6800], factHebrew: "הר ירוק מעל חיפה — עם יער גדול ואיילות שקופצות בין העצים!" },
  { id: "place-caesarea",    nameHebrew: "קיסריה העתיקה",    emoji: "🏛️", coordinates: [34.8900, 32.5000], factHebrew: "עיר נמל עתיקה שבנה המלך הורדוס — עם תיאטרון רומי ממש ליד הים!" },
  { id: "place-deadsea",     nameHebrew: "ים המלח",          emoji: "🧂", coordinates: [35.4200, 31.3300], factHebrew: "המקום הנמוך בעולם! המים כל כך מלוחים שצפים בהם בלי לשחות!" },
  { id: "place-masada",      nameHebrew: "מצדה",             emoji: "🏰", coordinates: [35.3530, 31.3120], factHebrew: "מבצר עתיק על הר שטוח מעל ים המלח — עולים אליו ברכבל או בשביל הנחש!" },
  { id: "place-ramon",       nameHebrew: "מכתש רמון",        emoji: "🌋", coordinates: [34.8700, 30.5700], factHebrew: "המכתש הגדול בעולם! נוצר בטבע במשך מיליוני שנים — ויש בו יעלים!" },
  { id: "place-timna",       nameHebrew: "פארק תמנע",        emoji: "🏜️", coordinates: [34.9500, 29.7900], factHebrew: "פארק במדבר עם עמודי סלע אדומים ענקיים — ומכרות נחושת עתיקים!" },
  { id: "place-reef",        nameHebrew: "שונית האלמוגים",   emoji: "🐠", coordinates: [34.9200, 29.5030], factHebrew: "שונית אלמוגים צבעונית עם דגים מכל הצבעים — כמו אקווריום ענק בים!" },
];

export const ISRAEL_CITIES_BY_ID = new Map(ISRAEL_CITIES.map((c) => [c.id, c]));
export const ISRAEL_PLACE_BY_ID = new Map(ISRAEL_PLACES.map((p) => [p.id, p]));
export const TOTAL_ISRAEL_CITIES = ISRAEL_CITIES.length;
export const TOTAL_ISRAEL_PLACES = ISRAEL_PLACES.length;
/** Cities + special places — one shared discovery counter. */
export const TOTAL_ISRAEL_SITES = TOTAL_ISRAEL_CITIES + TOTAL_ISRAEL_PLACES;
