// מתחילים לקרוא — first fully-pointed words. The child READS the word (no
// auto-TTS!) and picks the matching picture. Emojis are unique so the four
// picture options are never ambiguous.

export interface ReadingWord {
  id: string;
  display: string; // with full nikud
  plain: string;   // for TTS feedback
  emoji: string;
}

export const READING_WORDS: ReadingWord[] = [
  { id: "dag",     display: "דָּג",      plain: "דג",     emoji: "🐟" },
  { id: "aba",     display: "אַבָּא",    plain: "אבא",    emoji: "👨" },
  { id: "ima",     display: "אִמָּא",    plain: "אמא",    emoji: "👩" },
  { id: "bait",    display: "בַּיִת",    plain: "בית",    emoji: "🏠" },
  { id: "hatul",   display: "חָתוּל",    plain: "חתול",   emoji: "🐱" },
  { id: "kelev",   display: "כֶּלֶב",     plain: "כלב",    emoji: "🐶" },
  { id: "shemesh", display: "שֶׁמֶשׁ",    plain: "שמש",    emoji: "☀️" },
  { id: "yareah",  display: "יָרֵחַ",     plain: "ירח",    emoji: "🌙" },
  { id: "perah",   display: "פֶּרַח",     plain: "פרח",    emoji: "🌸" },
  { id: "etz",     display: "עֵץ",       plain: "עץ",     emoji: "🌳" },
  { id: "sus",     display: "סוּס",      plain: "סוס",    emoji: "🐴" },
  { id: "delet",   display: "דֶּלֶת",     plain: "דלת",    emoji: "🚪" },
  { id: "sefer",   display: "סֵפֶר",     plain: "ספר",    emoji: "📖" },
  { id: "kadur",   display: "כַּדּוּר",    plain: "כדור",   emoji: "⚽" },
  { id: "glida",   display: "גְּלִידָה",   plain: "גלידה",  emoji: "🍦" },
  { id: "uga",     display: "עוּגָה",     plain: "עוגה",   emoji: "🎂" },
  { id: "mayim",   display: "מַיִם",     plain: "מים",    emoji: "💧" },
  { id: "esh",     display: "אֵשׁ",      plain: "אש",     emoji: "🔥" },
  { id: "lev",     display: "לֵב",       plain: "לב",     emoji: "❤️" },
  { id: "kova",    display: "כּוֹבַע",    plain: "כובע",   emoji: "🧢" },
  { id: "naal",    display: "נַעַל",     plain: "נעל",    emoji: "👟" },
  { id: "balon",   display: "בָּלוֹן",    plain: "בלון",   emoji: "🎈" },
  { id: "tut",     display: "תּוּת",      plain: "תות",    emoji: "🍓" },
  { id: "banana",  display: "בָּנָנָה",    plain: "בננה",   emoji: "🍌" },
];

export const READING_WORD_BY_ID = new Map(READING_WORDS.map((w) => [w.id, w]));
export const TOTAL_READING_WORDS = READING_WORDS.length;
