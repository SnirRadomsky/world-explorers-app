// תיבת הנגינה data — the 8 xylophone notes, the songs (note-index sequences,
// 0 = דו) and the selectable instruments. Kept apart from the component so
// other screens (hub labels, parents report) can count songs.

export const NOTES = [
  { name: "דו", freq: 523.25, color: "#ef4444" },
  { name: "רה", freq: 587.33, color: "#f97316" },
  { name: "מי", freq: 659.25, color: "#eab308" },
  { name: "פה", freq: 698.46, color: "#22c55e" },
  { name: "סול", freq: 783.99, color: "#06b6d4" },
  { name: "לה", freq: 880.0, color: "#3b82f6" },
  { name: "סי", freq: 987.77, color: "#8b5cf6" },
  { name: "דו גבוה", freq: 1046.5, color: "#ec4899" },
];

export interface SongSpec {
  id: string;
  nameHebrew: string;
  emoji: string;
  seq: number[];
}

export const SONGS: SongSpec[] = [
  { id: "yonatan", nameHebrew: "יונתן הקטן",   emoji: "🧒", seq: [4, 2, 2, 3, 1, 1, 0, 1, 2, 3, 4, 4, 4] },
  { id: "twinkle", nameHebrew: "כוכב קטן",      emoji: "⭐", seq: [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0] },
  { id: "jacob",   nameHebrew: "אחינו יעקב",    emoji: "🔔", seq: [0, 1, 2, 0, 0, 1, 2, 0, 2, 3, 4, 2, 3, 4] },
  { id: "lamb",    nameHebrew: "כבשה קטנה",     emoji: "🐑", seq: [2, 1, 0, 1, 2, 2, 2, 1, 1, 1, 2, 4, 4] },
  { id: "bridge",  nameHebrew: "הגשר נופל",     emoji: "🌉", seq: [4, 5, 4, 3, 2, 3, 4, 1, 2, 3, 2, 3, 4] },
  { id: "ode",     nameHebrew: "המנון השמחה",   emoji: "🎼", seq: [2, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 2, 1, 1] },
  { id: "scale",   nameHebrew: "סולם שמח",      emoji: "🌈", seq: [0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1, 0] },
  { id: "magic",   nameHebrew: "מנגינת קסם",    emoji: "🎇", seq: [0, 2, 4, 7, 4, 2, 0, 4, 5, 6, 7, 7, 6, 5, 4] },
];

export const TOTAL_SONGS = SONGS.length;

export type InstrumentId = "xylophone" | "piano" | "flute" | "bells";

export const INSTRUMENTS: { id: InstrumentId; nameHebrew: string; emoji: string }[] = [
  { id: "xylophone", nameHebrew: "קסילופון", emoji: "🎼" },
  { id: "piano",     nameHebrew: "פסנתר",    emoji: "🎹" },
  { id: "flute",     nameHebrew: "חליל",      emoji: "🪈" },
  { id: "bells",     nameHebrew: "פעמונים",  emoji: "🔔" },
];
