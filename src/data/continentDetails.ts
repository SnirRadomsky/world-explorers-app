// Kid-friendly continent cards data.

export interface ContinentDetails {
  id: string;
  emoji: string;         // banner emoji
  animals: string;       // 3 signature animal emojis
  animalsHebrew: string; // their names in Hebrew
  factHebrew: string;    // one wow-fact
  biggestHebrew: string; // biggest country / notable size stat
}

export const CONTINENT_DETAILS: Record<string, ContinentDetails> = {
  asia: {
    id: "asia",
    emoji: "🐼",
    animals: "🐼🐯🐘",
    animalsHebrew: "פנדה, נמר ופיל",
    factHebrew: "אסיה היא היבשת הכי גדולה — יותר מחצי מאנשי העולם גרים בה!",
    biggestHebrew: "המדינה הגדולה בה: רוסיה (החלק האסייתי)",
  },
  africa: {
    id: "africa",
    emoji: "🦁",
    animals: "🦁🦒🦓",
    animalsHebrew: "אריה, ג'ירפה וזברה",
    factHebrew: "באפריקה נמצא מדבר סהרה — המדבר החם הכי גדול בעולם!",
    biggestHebrew: "המדינה הגדולה בה: אלג'יריה",
  },
  europe: {
    id: "europe",
    emoji: "🦊",
    animals: "🦊🦔🐺",
    animalsHebrew: "שועל, קיפוד וזאב",
    factHebrew: "באירופה יש יותר מ-40 מדינות — ואפשר לנסוע ביניהן ברכבת!",
    biggestHebrew: "המדינה הגדולה בה: רוסיה (החלק האירופי)",
  },
  "north-america": {
    id: "north-america",
    emoji: "🦅",
    animals: "🦅🐻🦬",
    animalsHebrew: "נשר, דוב וביזון",
    factHebrew: "באמריקה הצפונית יש הכול — קרחונים בצפון וחופים טרופיים בדרום!",
    biggestHebrew: "המדינה הגדולה בה: קנדה",
  },
  "south-america": {
    id: "south-america",
    emoji: "🦜",
    animals: "🦜🦥🦙",
    animalsHebrew: "תוכי, עצלן ולמה",
    factHebrew: "באמריקה הדרומית זורם האמזונס — הנהר עם הכי הרבה מים בעולם!",
    biggestHebrew: "המדינה הגדולה בה: ברזיל",
  },
  australia: {
    id: "australia",
    emoji: "🦘",
    animals: "🦘🐨🦈",
    animalsHebrew: "קנגורו, קואלה וכריש",
    factHebrew: "באוסטרליה רוב החיות לא קיימות בשום מקום אחר בעולם!",
    biggestHebrew: "המדינה הגדולה בה: אוסטרליה",
  },
  antarctica: {
    id: "antarctica",
    emoji: "🐧",
    animals: "🐧🐋🦭",
    animalsHebrew: "פינגווין, לווייתן וכלב ים",
    factHebrew: "אנטארקטיקה היא המקום הכי קר בעולם — ואף אחד לא גר בה קבוע!",
    biggestHebrew: "אין בה מדינות בכלל — רק תחנות מחקר!",
  },
};
