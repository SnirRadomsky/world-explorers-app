// "Passport" card for a country: flag, capital, fun fact, and words in the
// local language with Hebrew transliteration + native TTS.

import { COUNTRY_BY_ID } from "../../data/countries";
import { getCountryDetails, flagEmoji } from "../../data/countryDetails";
import { LANGUAGE_BY_ID } from "../../data/languages";
import { CONTINENTS } from "../../data/continents";
import InfoSheet from "./InfoSheet";

interface CountryCardProps {
  countryId: string | null;
  onClose: () => void;
  speakHebrew: (text: string) => void;
  speakLang: (text: string, lang: string, fallbackHebrew?: string) => void;
  playSfx: (name: "pop" | "chime") => void;
  wordsHeard: (languageId: string) => Set<number>;
  markWordHeard: (languageId: string, wordIndex: number, wordsInPack: number) => void;
}

const sectionTitle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 17,
  color: "#334155",
  margin: "18px 0 8px",
};

export default function CountryCard({
  countryId,
  onClose,
  speakHebrew,
  speakLang,
  playSfx,
  wordsHeard,
  markWordHeard,
}: CountryCardProps) {
  const country = countryId ? COUNTRY_BY_ID.get(countryId) : undefined;
  const details = countryId ? getCountryDetails(countryId) : undefined;
  const continent = country ? CONTINENTS.find((c) => c.id === country.continentId) : undefined;
  const lang = details ? LANGUAGE_BY_ID.get(details.languageId) : undefined;
  const heard = lang ? wordsHeard(lang.id) : new Set<number>();

  return (
    <InfoSheet open={!!country && !!details} onClose={onClose} accentColor={continent?.color ?? "#3b82f6"}>
      {country && details && (
        <div>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 2 }}>
            <span style={{ fontSize: 54, lineHeight: 1 }}>{flagEmoji(details.alpha2)}</span>
            <div>
              <div
                style={{ fontWeight: 900, fontSize: 30, color: "#0f172a", cursor: "pointer" }}
                onClick={() => speakHebrew(country.nameHebrew)}
              >
                {country.nameHebrew} 🔊
              </div>
              {continent && (
                <span
                  style={{
                    display: "inline-block",
                    background: continent.color + "33",
                    color: "#1e293b",
                    borderRadius: 999,
                    padding: "2px 12px",
                    fontWeight: 700,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  יבשת: {continent.nameHebrew}
                </span>
              )}
            </div>
            <span style={{ marginRight: "auto", fontSize: 30 }}>{details.emojis}</span>
          </div>

          {/* Capital */}
          <div
            onClick={() => {
              playSfx("pop");
              speakHebrew(`הבירה של ${country.nameHebrew} היא ${details.capitalHebrew}`);
            }}
            style={{
              marginTop: 16,
              background: "#f1f5f9",
              borderRadius: 16,
              padding: "12px 16px",
              fontWeight: 800,
              fontSize: 18,
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            🏙️ עיר הבירה: {details.capitalHebrew}
          </div>

          {/* Fun fact */}
          <div
            onClick={() => {
              playSfx("pop");
              speakHebrew(details.factHebrew);
            }}
            style={{
              marginTop: 10,
              background: "linear-gradient(135deg,#fef9c3,#fde68a)",
              borderRadius: 16,
              padding: "12px 16px",
              fontWeight: 700,
              fontSize: 17,
              color: "#713f12",
              cursor: "pointer",
              lineHeight: 1.45,
            }}
          >
            💡 {details.factHebrew} <span style={{ fontSize: 14 }}>🔊</span>
          </div>

          {/* Language words */}
          {lang && (
            <>
              <div style={sectionTitle}>
                🗣️ איך אומרים ב{lang.nameHebrew}?
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {lang.words.map((w, i) => {
                  const wasHeard = heard.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        playSfx("pop");
                        speakLang(w.native, lang.ttsLang, w.translit);
                        markWordHeard(lang.id, i, lang.words.length);
                      }}
                      style={{
                        border: wasHeard ? "2.5px solid #4ade80" : "2.5px solid #e2e8f0",
                        borderRadius: 18,
                        background: "white",
                        padding: "10px 8px 8px",
                        cursor: "pointer",
                        fontFamily: "Heebo, sans-serif",
                        textAlign: "center",
                        position: "relative",
                      }}
                    >
                      {wasHeard && (
                        <span style={{ position: "absolute", top: 6, left: 8, fontSize: 13 }}>✅</span>
                      )}
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#64748b" }}>{w.meaningHebrew}</div>
                      <div style={{ fontWeight: 900, fontSize: 22, color: "#0f172a", direction: "ltr", margin: "2px 0" }}>
                        {w.native}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#3b82f6" }}>{w.translit} 🔊</div>
                    </button>
                  );
                })}
              </div>
              {lang.id !== "hebrew" ? (
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: "#94a3b8", textAlign: "center" }}>
                  הקשיבו לכל 4 המילים כדי ללמוד את השפה! {heard.size}/4
                </div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: "#3b82f6", textAlign: "center" }}>
                  בישראל מדברים עברית — בדיוק כמוכם! 😄
                </div>
              )}
            </>
          )}
        </div>
      )}
    </InfoSheet>
  );
}
