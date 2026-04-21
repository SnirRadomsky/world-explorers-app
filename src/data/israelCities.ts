export interface IsraelCity {
  id: string;
  nameHebrew: string;
  coordinates: [number, number]; // [lng, lat]
  districtId: string; // iso_3166_2
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
  { id: "il-metula",        nameHebrew: "מטולה",           coordinates: [35.5683, 33.2741], districtId: "IL-Z" },
  { id: "il-kiryat-shmona", nameHebrew: "קרית שמונה",      coordinates: [35.5697, 33.2095], districtId: "IL-Z" },
  { id: "il-shlomi",        nameHebrew: "שלומי",            coordinates: [35.1601, 33.0668], districtId: "IL-Z" },
  { id: "il-maalot",        nameHebrew: "מעלות-תרשיחא",    coordinates: [35.2720, 33.0159], districtId: "IL-Z" },
  { id: "il-katzrin",       nameHebrew: "קצרין",            coordinates: [35.6903, 32.9951], districtId: "IL-Z" },
  { id: "il-safed",         nameHebrew: "צפת",              coordinates: [35.4965, 32.9648], districtId: "IL-Z" },
  { id: "il-hazor",         nameHebrew: "חצור הגלילית",     coordinates: [35.5381, 32.9731], districtId: "IL-Z" },
  { id: "il-karmiel",       nameHebrew: "כרמיאל",           coordinates: [35.2969, 32.9167], districtId: "IL-Z" },
  { id: "il-shfaram",       nameHebrew: "שפרעם",            coordinates: [35.1671, 32.8043], districtId: "IL-Z" },
  { id: "il-tiberias",      nameHebrew: "טבריה",            coordinates: [35.5312, 32.7940], districtId: "IL-Z" },
  { id: "il-nazareth",      nameHebrew: "נצרת",             coordinates: [35.3035, 32.6996], districtId: "IL-Z" },
  { id: "il-nof-hagalil",   nameHebrew: "נוף הגליל",        coordinates: [35.3308, 32.7023], districtId: "IL-Z" },
  { id: "il-migdal-haemek", nameHebrew: "מגדל העמק",        coordinates: [35.2394, 32.6794], districtId: "IL-Z" },
  { id: "il-afula",         nameHebrew: "עפולה",            coordinates: [35.2892, 32.6076], districtId: "IL-Z" },
  { id: "il-beit-shean",    nameHebrew: "בית שאן",          coordinates: [35.4999, 32.4989], districtId: "IL-Z" },

  // מחוז חיפה
  { id: "il-haifa",         nameHebrew: "חיפה",             coordinates: [34.9896, 32.7940], districtId: "IL-HA" },
  { id: "il-kiryat-ata",    nameHebrew: "קרית אתא",         coordinates: [35.1074, 32.8095], districtId: "IL-HA" },
  { id: "il-kiryat-yam",    nameHebrew: "קרית ים",          coordinates: [35.0668, 32.8503], districtId: "IL-HA" },
  { id: "il-acre",          nameHebrew: "עכו",              coordinates: [35.0818, 32.9228], districtId: "IL-HA" },
  { id: "il-nahariya",      nameHebrew: "נהריה",            coordinates: [35.0950, 33.0070], districtId: "IL-HA" },
  { id: "il-umm-al-fahm",   nameHebrew: "אום אל-פחם",       coordinates: [35.1522, 32.5166], districtId: "IL-HA" },
  { id: "il-zichron-yaakov",nameHebrew: "זכרון יעקב",       coordinates: [34.9579, 32.5670], districtId: "IL-HA" },
  { id: "il-hadera",        nameHebrew: "חדרה",             coordinates: [34.9175, 32.4346], districtId: "IL-HA" },

  // מחוז המרכז
  { id: "il-netanya",       nameHebrew: "נתניה",            coordinates: [34.8567, 32.3215], districtId: "IL-M" },
  { id: "il-raanana",       nameHebrew: "רעננה",            coordinates: [34.8705, 32.1841], districtId: "IL-M" },
  { id: "il-herzliya",      nameHebrew: "הרצליה",           coordinates: [34.8440, 32.1663], districtId: "IL-M" },
  { id: "il-kfar-saba",     nameHebrew: "כפר סבא",          coordinates: [34.9078, 32.1786], districtId: "IL-M" },
  { id: "il-petah-tikva",   nameHebrew: "פתח תקווה",        coordinates: [34.8878, 32.0878], districtId: "IL-M" },
  { id: "il-lod",           nameHebrew: "לוד",              coordinates: [34.8958, 31.9516], districtId: "IL-M" },
  { id: "il-ramla",         nameHebrew: "רמלה",             coordinates: [34.8651, 31.9285], districtId: "IL-M" },
  { id: "il-rishon",        nameHebrew: "ראשון לציון",      coordinates: [34.7996, 31.9730], districtId: "IL-M" },
  { id: "il-rehovot",       nameHebrew: "רחובות",           coordinates: [34.8120, 31.8928], districtId: "IL-M" },
  { id: "il-modiin",        nameHebrew: "מודיעין",          coordinates: [35.0102, 31.8969], districtId: "IL-M" },

  // מחוז תל אביב
  { id: "il-tel-aviv",      nameHebrew: "תל אביב",          coordinates: [34.7818, 32.0853], districtId: "IL-TA" },
  { id: "il-bnei-brak",     nameHebrew: "בני ברק",          coordinates: [34.8338, 32.0831], districtId: "IL-TA" },
  { id: "il-ramat-gan",     nameHebrew: "רמת גן",           coordinates: [34.8186, 32.0700], districtId: "IL-TA" },
  { id: "il-holon",         nameHebrew: "חולון",            coordinates: [34.7793, 32.0101], districtId: "IL-TA" },
  { id: "il-bat-yam",       nameHebrew: "בת ים",            coordinates: [34.7502, 32.0227], districtId: "IL-TA" },

  // מחוז ירושלים
  { id: "il-jerusalem",     nameHebrew: "ירושלים",          coordinates: [35.2137, 31.7683], districtId: "IL-JM" },
  { id: "il-beit-shemesh",  nameHebrew: "בית שמש",          coordinates: [34.9908, 31.7459], districtId: "IL-JM" },
  { id: "il-mevaseret-zion",nameHebrew: "מבשרת ציון",       coordinates: [35.1660, 31.8062], districtId: "IL-JM" },

  // יהודה ושומרון
  { id: "il-nablus",        nameHebrew: "שכם",              coordinates: [35.2605, 32.2211], districtId: "IL-WB" },
  { id: "il-ariel",         nameHebrew: "אריאל",            coordinates: [35.1667, 32.1061], districtId: "IL-WB" },
  { id: "il-ramallah",      nameHebrew: "רמאללה",           coordinates: [35.2057, 31.9038], districtId: "IL-WB" },
  { id: "il-jericho",       nameHebrew: "יריחו",            coordinates: [35.4610, 31.8561], districtId: "IL-WB" },
  { id: "il-maaleh-adumim", nameHebrew: "מעלה אדומים",      coordinates: [35.2985, 31.7770], districtId: "IL-WB" },
  { id: "il-bethlehem",     nameHebrew: "בית לחם",          coordinates: [35.2024, 31.7054], districtId: "IL-WB" },
  { id: "il-hebron",        nameHebrew: "חברון",            coordinates: [35.0998, 31.5326], districtId: "IL-WB" },

  // מחוז הדרום
  { id: "il-ashdod",        nameHebrew: "אשדוד",            coordinates: [34.6499, 31.8040], districtId: "IL-D" },
  { id: "il-ashkelon",      nameHebrew: "אשקלון",           coordinates: [34.5748, 31.6688], districtId: "IL-D" },
  { id: "il-kiryat-gat",    nameHebrew: "קרית גת",          coordinates: [34.7640, 31.6107], districtId: "IL-D" },
  { id: "il-sderot",        nameHebrew: "שדרות",            coordinates: [34.5975, 31.5241], districtId: "IL-D" },
  { id: "il-netivot",       nameHebrew: "נתיבות",           coordinates: [34.5853, 31.4206], districtId: "IL-D" },
  { id: "il-beersheba",     nameHebrew: "באר שבע",          coordinates: [34.7913, 31.2518], districtId: "IL-D" },
  { id: "il-arad",          nameHebrew: "ערד",              coordinates: [35.2127, 31.2587], districtId: "IL-D" },
  { id: "il-dimona",        nameHebrew: "דימונה",           coordinates: [35.0326, 31.0676], districtId: "IL-D" },
  { id: "il-yeruham",       nameHebrew: "ירוחם",            coordinates: [34.9285, 30.9877], districtId: "IL-D" },
  { id: "il-mitzpe-ramon",  nameHebrew: "מצפה רמון",        coordinates: [34.8010, 30.6099], districtId: "IL-D" },
  { id: "il-eilat",         nameHebrew: "אילת",             coordinates: [34.9519, 29.5581], districtId: "IL-D" },
];

export const ISRAEL_CITIES_BY_ID = new Map(ISRAEL_CITIES.map((c) => [c.id, c]));
export const TOTAL_ISRAEL_CITIES = ISRAEL_CITIES.length;
