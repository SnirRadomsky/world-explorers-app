// ארץ האותיות — the Hebrew alphabet with nikud for first reading steps.
// Every letter carries a friendly word (fully pointed) + emoji, and the
// vowel row (kamatz/patach/segol/hirik/holam/shuruk) is spoken via TTS.

export interface HebrewLetter {
  id: string;          // the base letter itself
  letter: string;
  nameHebrew: string;  // אָלֶף
  word: string;        // אַרְיֵה (with nikud)
  wordPlain: string;   // אריה (for TTS)
  emoji: string;
  /** final form (ך ם ן ף ץ) — shown on the same card when it exists */
  finalForm?: string;
  finalWord?: string;
  finalWordPlain?: string;
  finalEmoji?: string;
}

export interface NikudForm {
  id: string;
  nameHebrew: string;
  /** mark(s) appended to a base letter for display, e.g. "ָ" */
  mark: string;
  /** suffix that makes TTS pronounce the syllable naturally */
  speakSuffix: string;
}

export const NIKUD_FORMS: NikudForm[] = [
  { id: "kamatz", nameHebrew: "קָמָץ",  mark: "ָ",  speakSuffix: "ָה" },
  { id: "patach", nameHebrew: "פַּתָח",  mark: "ַ",  speakSuffix: "ַה" },
  { id: "segol",  nameHebrew: "סֶגּוֹל", mark: "ֶ",  speakSuffix: "ֶה" },
  { id: "hirik",  nameHebrew: "חִירִיק", mark: "ִ",  speakSuffix: "ִי" },
  { id: "holam",  nameHebrew: "חוֹלָם",  mark: "וֹ", speakSuffix: "וֹ" },
  { id: "shuruk", nameHebrew: "שׁוּרוּק", mark: "וּ", speakSuffix: "וּ" },
];

export const HEBREW_LETTERS: HebrewLetter[] = [
  { id: "א", letter: "א", nameHebrew: "אָלֶף",   word: "אַרְיֵה",   wordPlain: "אריה",  emoji: "🦁" },
  { id: "ב", letter: "ב", nameHebrew: "בֵּית",   word: "בַּיִת",    wordPlain: "בית",   emoji: "🏠" },
  { id: "ג", letter: "ג", nameHebrew: "גִּימֶל",  word: "גָּמָל",    wordPlain: "גמל",   emoji: "🐪" },
  { id: "ד", letter: "ד", nameHebrew: "דָּלֶת",   word: "דָּג",      wordPlain: "דג",    emoji: "🐟" },
  { id: "ה", letter: "ה", nameHebrew: "הֵא",     word: "הַר",      wordPlain: "הר",    emoji: "⛰️" },
  { id: "ו", letter: "ו", nameHebrew: "וָו",      word: "וֶרֶד",     wordPlain: "ורד",   emoji: "🌹" },
  { id: "ז", letter: "ז", nameHebrew: "זַיִן",    word: "זֶבְּרָה",   wordPlain: "זברה",  emoji: "🦓" },
  { id: "ח", letter: "ח", nameHebrew: "חֵית",    word: "חָתוּל",    wordPlain: "חתול",  emoji: "🐱" },
  { id: "ט", letter: "ט", nameHebrew: "טֵית",    word: "טַוָּס",     wordPlain: "טווס",  emoji: "🦚" },
  { id: "י", letter: "י", nameHebrew: "יוֹד",     word: "יָרֵחַ",     wordPlain: "ירח",   emoji: "🌙" },
  { id: "כ", letter: "כ", nameHebrew: "כָּף",     word: "כֶּלֶב",     wordPlain: "כלב",   emoji: "🐶",
    finalForm: "ך", finalWord: "מֶלֶךְ", finalWordPlain: "מלך", finalEmoji: "👑" },
  { id: "ל", letter: "ל", nameHebrew: "לָמֶד",   word: "לִימוֹן",   wordPlain: "לימון", emoji: "🍋" },
  { id: "מ", letter: "מ", nameHebrew: "מֵם",     word: "מַיִם",     wordPlain: "מים",   emoji: "💧",
    finalForm: "ם", finalWord: "יָם", finalWordPlain: "ים", finalEmoji: "🌊" },
  { id: "נ", letter: "נ", nameHebrew: "נוּן",     word: "נָחָשׁ",    wordPlain: "נחש",   emoji: "🐍",
    finalForm: "ן", finalWord: "מְלָפְפוֹן", finalWordPlain: "מלפפון", finalEmoji: "🥒" },
  { id: "ס", letter: "ס", nameHebrew: "סָמֶךְ",   word: "סוּס",     wordPlain: "סוס",   emoji: "🐴" },
  { id: "ע", letter: "ע", nameHebrew: "עַיִן",    word: "עֵץ",      wordPlain: "עץ",    emoji: "🌳" },
  { id: "פ", letter: "פ", nameHebrew: "פֵּא",     word: "פִּיל",     wordPlain: "פיל",   emoji: "🐘",
    finalForm: "ף", finalWord: "כֶּסֶף", finalWordPlain: "כסף", finalEmoji: "💰" },
  { id: "צ", letter: "צ", nameHebrew: "צָדִי",    word: "צָב",      wordPlain: "צב",    emoji: "🐢",
    finalForm: "ץ", finalWord: "לֵץ", finalWordPlain: "לץ", finalEmoji: "🤡" },
  { id: "ק", letter: "ק", nameHebrew: "קוֹף",     word: "קוֹף",     wordPlain: "קוף",   emoji: "🐒" },
  { id: "ר", letter: "ר", nameHebrew: "רֵישׁ",    word: "רַכֶּבֶת",   wordPlain: "רכבת",  emoji: "🚂" },
  { id: "ש", letter: "ש", nameHebrew: "שִׁין",    word: "שֶׁמֶשׁ",    wordPlain: "שמש",   emoji: "☀️" },
  { id: "ת", letter: "ת", nameHebrew: "תָּו",      word: "תַּפּוּחַ",   wordPlain: "תפוח",  emoji: "🍎" },
];

export const LETTER_BY_ID = new Map(HEBREW_LETTERS.map((l) => [l.id, l]));
export const TOTAL_LETTERS = HEBREW_LETTERS.length;

/** Display form of a letter+nikud, using the dagesh where it reads better. */
export function nikudDisplay(letter: string, form: NikudForm): string {
  const withDagesh = new Set(["ב", "כ", "פ", "ת", "ד", "ג"]);
  const base = withDagesh.has(letter) ? letter + "ּ" : letter;
  return base + form.mark;
}

/** What we hand to TTS so the syllable is pronounced naturally. */
export function nikudSpoken(letter: string, form: NikudForm): string {
  const withDagesh = new Set(["ב", "כ", "פ", "ת", "ד", "ג"]);
  const base = withDagesh.has(letter) ? letter + "ּ" : letter;
  return base + form.speakSuffix;
}
