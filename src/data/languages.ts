// Language packs for the "איך אומרים?" feature.
// Each pack: 4 core words in the native script, a Hebrew transliteration the
// child can read, and the Hebrew meaning. ttsLang is the BCP-47 voice used to
// speak the native word (falls back to Hebrew transliteration when missing).

export interface LanguageWord {
  native: string;         // word in the native script
  translit: string;       // Hebrew transliteration (readable by the child)
  meaningHebrew: string;  // Hebrew meaning
}

export interface LanguagePack {
  id: string;
  nameHebrew: string;     // e.g. "צרפתית"
  ttsLang: string;        // e.g. "fr-FR"
  words: LanguageWord[];  // always [hello, thanks, yes, no]
}

function pack(
  id: string,
  nameHebrew: string,
  ttsLang: string,
  hello: [string, string],
  thanks: [string, string],
  yes: [string, string],
  no: [string, string],
): LanguagePack {
  return {
    id,
    nameHebrew,
    ttsLang,
    words: [
      { native: hello[0],  translit: hello[1],  meaningHebrew: "שלום" },
      { native: thanks[0], translit: thanks[1], meaningHebrew: "תודה" },
      { native: yes[0],    translit: yes[1],    meaningHebrew: "כן" },
      { native: no[0],     translit: no[1],     meaningHebrew: "לא" },
    ],
  };
}

export const LANGUAGES: LanguagePack[] = [
  pack("hebrew",     "עברית",       "he-IL", ["שלום", "שָׁלוֹם"], ["תודה", "תּוֹדָה"], ["כן", "כֵּן"], ["לא", "לֹא"]),
  pack("english",    "אנגלית",      "en-US", ["Hello", "הֶלוֹ"], ["Thank you", "תֶ'נְק יוּ"], ["Yes", "יֶס"], ["No", "נוֹ"]),
  pack("spanish",    "ספרדית",      "es-ES", ["Hola", "אוֹלָה"], ["Gracias", "גְרָסִיאָס"], ["Sí", "סִי"], ["No", "נוֹ"]),
  pack("portuguese", "פורטוגזית",   "pt-BR", ["Olá", "אוֹלָה"], ["Obrigado", "אוֹבְּרִיגָאדוֹ"], ["Sim", "סִים"], ["Não", "נָאוּ"]),
  pack("french",     "צרפתית",      "fr-FR", ["Bonjour", "בּוֹנְז'וּר"], ["Merci", "מֶרְסִי"], ["Oui", "אוּאִי"], ["Non", "נוֹן"]),
  pack("german",     "גרמנית",      "de-DE", ["Hallo", "הַאלוֹ"], ["Danke", "דַאנְקֶה"], ["Ja", "יָא"], ["Nein", "נַיְן"]),
  pack("italian",    "איטלקית",     "it-IT", ["Ciao", "צָ'אוֹ"], ["Grazie", "גְרַצְיֶה"], ["Sì", "סִי"], ["No", "נוֹ"]),
  pack("dutch",      "הולנדית",     "nl-NL", ["Hallo", "הַאלוֹ"], ["Dank je", "דַאנְק יֶה"], ["Ja", "יָא"], ["Nee", "נֵיי"]),
  pack("russian",    "רוסית",       "ru-RU", ["Привет", "פְּרִיבְיֶט"], ["Спасибо", "סְפָּסִיבָּה"], ["Да", "דָה"], ["Нет", "נְיֶט"]),
  pack("ukrainian",  "אוקראינית",   "uk-UA", ["Привіт", "פְּרִיבִיט"], ["Дякую", "דְיָאקוּיוּ"], ["Так", "טַאק"], ["Ні", "נִי"]),
  pack("polish",     "פולנית",      "pl-PL", ["Cześć", "צֶ'שְׁץ'"], ["Dziękuję", "גֶ'נְקוּיֶה"], ["Tak", "טַאק"], ["Nie", "נְיֶה"]),
  pack("czech",      "צ'כית",       "cs-CZ", ["Ahoj", "אַהוֹי"], ["Děkuji", "דְיֶקוּיִי"], ["Ano", "אָנוֹ"], ["Ne", "נֶה"]),
  pack("slovak",     "סלובקית",     "sk-SK", ["Ahoj", "אַהוֹי"], ["Ďakujem", "דְיָאקוּיֶם"], ["Áno", "אָנוֹ"], ["Nie", "נִיֶה"]),
  pack("hungarian",  "הונגרית",     "hu-HU", ["Szia", "סִיָה"], ["Köszönöm", "קֶסֶנֶם"], ["Igen", "אִיגֶן"], ["Nem", "נֶם"]),
  pack("romanian",   "רומנית",      "ro-RO", ["Salut", "סָלוּט"], ["Mulțumesc", "מוּלְצוּמֶסְק"], ["Da", "דָה"], ["Nu", "נוּ"]),
  pack("bulgarian",  "בולגרית",     "bg-BG", ["Здравей", "זְדְרָבֵיי"], ["Благодаря", "בְּלָגוֹדַרְיָה"], ["Да", "דָה"], ["Не", "נֶה"]),
  pack("greek",      "יוונית",      "el-GR", ["Γεια σου", "יָה סוּ"], ["Ευχαριστώ", "אֶפְחָרִיסְטוֹ"], ["Ναι", "נֶה"], ["Όχι", "אוֹחִי"]),
  pack("turkish",    "טורקית",      "tr-TR", ["Merhaba", "מֶרְחַבָּה"], ["Teşekkürler", "טֶשֶׁקוּרְלֶר"], ["Evet", "אֶוֶט"], ["Hayır", "הָאיִיר"]),
  pack("swedish",    "שוודית",      "sv-SE", ["Hej", "הֵיי"], ["Tack", "טַאק"], ["Ja", "יָא"], ["Nej", "נֵיי"]),
  pack("norwegian",  "נורווגית",    "nb-NO", ["Hei", "הַיי"], ["Takk", "טַאק"], ["Ja", "יָא"], ["Nei", "נַיי"]),
  pack("danish",     "דנית",        "da-DK", ["Hej", "הַיי"], ["Tak", "טַאק"], ["Ja", "יֶא"], ["Nej", "נַיי"]),
  pack("finnish",    "פינית",       "fi-FI", ["Hei", "הֵיי"], ["Kiitos", "קִיטוֹס"], ["Kyllä", "קוּלָה"], ["Ei", "אֵיי"]),
  pack("icelandic",  "איסלנדית",    "is-IS", ["Halló", "הַאלוֹ"], ["Takk", "טַאק"], ["Já", "יַאו"], ["Nei", "נֵיי"]),
  pack("croatian",   "קרואטית",     "hr-HR", ["Bok", "בּוֹק"], ["Hvala", "חְבָאלָה"], ["Da", "דָה"], ["Ne", "נֶה"]),
  pack("serbian",    "סרבית",       "sr-RS", ["Здраво", "זְדְרָאבוֹ"], ["Хвала", "חְבָאלָה"], ["Да", "דָה"], ["Не", "נֶה"]),
  pack("slovenian",  "סלובנית",     "sl-SI", ["Živjo", "זִ'יבְיוֹ"], ["Hvala", "חְבָאלָה"], ["Da", "דָה"], ["Ne", "נֶה"]),
  pack("macedonian", "מקדונית",     "mk-MK", ["Здраво", "זְדְרָאבוֹ"], ["Благодарам", "בְּלָגוֹדָרָם"], ["Да", "דָה"], ["Не", "נֶה"]),
  pack("albanian",   "אלבנית",      "sq-AL", ["Përshëndetje", "פֶּרְשֶׁנְדֶטְיֶה"], ["Faleminderit", "פָלֶמִינְדֶרִיט"], ["Po", "פּוֹ"], ["Jo", "יוֹ"]),
  pack("estonian",   "אסטונית",     "et-EE", ["Tere", "טֶרֶה"], ["Aitäh", "אַיְטֶה"], ["Jah", "יָה"], ["Ei", "אֵיי"]),
  pack("latvian",    "לטבית",       "lv-LV", ["Sveiki", "סְבֵייקִי"], ["Paldies", "פָּלְדִיֶאס"], ["Jā", "יָא"], ["Nē", "נֶה"]),
  pack("lithuanian", "ליטאית",      "lt-LT", ["Labas", "לָאבָּס"], ["Ačiū", "אָאצ'וּ"], ["Taip", "טַייפּ"], ["Ne", "נֶה"]),
  pack("arabic",     "ערבית",       "ar-SA", ["مرحبا", "מַרְחַבָּא"], ["شكرا", "שׁוּקְרָן"], ["نعم", "נַעַם"], ["لا", "לַא"]),
  pack("persian",    "פרסית",       "fa-IR", ["سلام", "סָלָאם"], ["ممنون", "מַמְנוּן"], ["بله", "בָּלֶה"], ["نه", "נָה"]),
  pack("hindi",      "הינדי",       "hi-IN", ["नमस्ते", "נָמַסְטֶה"], ["धन्यवाद", "דַנְיָוָאד"], ["हाँ", "הָאן"], ["नहीं", "נָהִין"]),
  pack("urdu",       "אורדו",       "ur-PK", ["سلام", "סָלָאם"], ["شکریہ", "שׁוּקְרִיָה"], ["ہاں", "הָאן"], ["نہیں", "נָהִין"]),
  pack("bengali",    "בנגלית",      "bn-BD", ["নমস্কার", "נוֹמוֹשְׁקָאר"], ["ধন্যবাদ", "דוֹנוֹבָּאד"], ["হ্যাঁ", "הֶה"], ["না", "נָא"]),
  pack("nepali",     "נפאלית",      "ne-NP", ["नमस्ते", "נָמַסְטֶה"], ["धन्यवाद", "דַנְיָבָאד"], ["हो", "הוֹ"], ["होइन", "הוֹאִין"]),
  pack("sinhala",    "סינהלית",     "si-LK", ["ආයුබෝවන්", "אָיוּבּוֹוָאן"], ["ස්තූතියි", "סְטוּטִי"], ["ඔව්", "אוֹב"], ["නැහැ", "נֶהֶה"]),
  pack("chinese",    "סינית",       "zh-CN", ["你好", "נִי הָאוֹ"], ["谢谢", "שְׁיֶה שְׁיֶה"], ["是", "שְׁה"], ["不", "בּוּ"]),
  pack("japanese",   "יפנית",       "ja-JP", ["こんにちは", "קוֹנִיצִ'יוָה"], ["ありがとう", "אָרִיגָטוֹ"], ["はい", "הַאי"], ["いいえ", "אִיאֶה"]),
  pack("korean",     "קוריאנית",    "ko-KR", ["안녕하세요", "אַנְיוֹנְג הָסֵיוֹ"], ["감사합니다", "קַמְסָהַמְנִידָה"], ["네", "נֶה"], ["아니요", "אָנִיוֹ"]),
  pack("mongolian",  "מונגולית",    "mn-MN", ["Сайн уу", "סַיְן אוּ"], ["Баярлалаа", "בָּיַרְלָלָא"], ["Тийм", "טִים"], ["Үгүй", "אוּגוּי"]),
  pack("thai",       "תאית",        "th-TH", ["สวัสดี", "סָוַואדִי"], ["ขอบคุณ", "קוֹפּ קוּן"], ["ใช่", "צַ'אי"], ["ไม่", "מַאי"]),
  pack("vietnamese", "וייטנאמית",   "vi-VN", ["Xin chào", "סִין צָ'אוֹ"], ["Cảm ơn", "קָאם אוֹן"], ["Vâng", "וָאנְג"], ["Không", "חוֹנְג"]),
  pack("khmer",      "חמרית",       "km-KH", ["សួស្តី", "סוּאָה סְדֵיי"], ["អរគុណ", "אוֹר קוּן"], ["បាទ", "בָּאט"], ["ទេ", "טֶה"]),
  pack("lao",        "לאו",         "lo-LA", ["ສະບາຍດີ", "סָבַּאיְדִי"], ["ຂອບໃຈ", "קוֹפּ צָ'אי"], ["ແມ່ນ", "מֶן"], ["ບໍ່", "בּוֹ"]),
  pack("burmese",    "בורמזית",     "my-MM", ["မင်္ဂလာပါ", "מִינְגָלָבָּה"], ["ကျေးဇူးပါ", "צֶ'זוּ בָּה"], ["ဟုတ်ကဲ့", "הוֹקֶה"], ["မဟုတ်ဘူး", "מָהוֹפּוּ"]),
  pack("indonesian", "אינדונזית",   "id-ID", ["Halo", "הָאלוֹ"], ["Terima kasih", "טֶרִימָה קָאסִי"], ["Ya", "יָה"], ["Tidak", "טִידָאק"]),
  pack("malay",      "מלאית",       "ms-MY", ["Helo", "הֶלוֹ"], ["Terima kasih", "טֶרִימָה קָאסִי"], ["Ya", "יָה"], ["Tidak", "טִידָאק"]),
  pack("filipino",   "פיליפינית",   "fil-PH", ["Kamusta", "קָמוּסְטָה"], ["Salamat", "סָלָאמָט"], ["Oo", "אוֹ-אוֹ"], ["Hindi", "הִינְדִי"]),
  pack("armenian",   "ארמנית",      "hy-AM", ["Բարեւ", "בָּארֶב"], ["Շնորհակալ եմ", "שְׁנוֹרְהָקָל אֶם"], ["Այո", "אָיוֹ"], ["Ոչ", "ווֹץ'"]),
  pack("georgian",   "גיאורגית",    "ka-GE", ["გამარჯობა", "גָמָארְג'וֹבָּה"], ["მადლობა", "מָדְלוֹבָּה"], ["კი", "קִי"], ["არა", "אָרָה"]),
  pack("azerbaijani","אזרית",       "az-AZ", ["Salam", "סָלָאם"], ["Təşəkkür", "טֶשֶׁקוּר"], ["Bəli", "בֶּלִי"], ["Xeyr", "חֵיְיר"]),
  pack("kazakh",     "קזחית",       "kk-KZ", ["Сәлем", "סֶלֶם"], ["Рахмет", "רַחְמֶט"], ["Иә", "יֶה"], ["Жоқ", "ז'וֹק"]),
  pack("swahili",    "סווהילית",    "sw-KE", ["Jambo", "גָ'מְבּוֹ"], ["Asante", "אָסַנְטֶה"], ["Ndiyo", "נְדִיוֹ"], ["Hapana", "הָפָּאנָה"]),
  pack("amharic",    "אמהרית",      "am-ET", ["ሰላም", "סֶלַאם"], ["አመሰግናለሁ", "אָמֶסֶגְנָאלֶהוּ"], ["አዎ", "אָווֹ"], ["አይ", "אַיי"]),
  pack("somali",     "סומלית",      "so-SO", ["Salaan", "סָלָאן"], ["Mahadsanid", "מָהָדְסָנִיד"], ["Haa", "הָא"], ["Maya", "מָיָה"]),
  pack("zulu",       "זולו",        "zu-ZA", ["Sawubona", "סָאוּבּוֹנָה"], ["Ngiyabonga", "נְגִיָבּוֹנְגָה"], ["Yebo", "יֶבּוֹ"], ["Cha", "צָ'ה"]),
];

export const LANGUAGE_BY_ID = new Map(LANGUAGES.map((l) => [l.id, l]));
