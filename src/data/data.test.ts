// Data-integrity tests: every country/continent/planet must be fully wired.

import { describe, it, expect } from "vitest";
import { COUNTRIES } from "./countries";
import { CONTINENTS } from "./continents";
import { getContinentId } from "./continentMapping";
import { COUNTRY_DETAILS, flagEmoji } from "./countryDetails";
import { LANGUAGES, LANGUAGE_BY_ID } from "./languages";
import { CONTINENT_DETAILS } from "./continentDetails";
import { PLANETS, TOTAL_SPACE_OBJECTS } from "./planets";

const CONTINENT_IDS = new Set(CONTINENTS.map((c) => c.id));

describe("countries data", () => {
  it("every country has a valid continent", () => {
    for (const c of COUNTRIES) {
      expect(CONTINENT_IDS.has(c.continentId), `${c.nameHebrew} (${c.id})`).toBe(true);
    }
  });

  it("country ids are unique", () => {
    const ids = COUNTRIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("continentMapping agrees with each country's continentId", () => {
    for (const c of COUNTRIES) {
      expect(getContinentId(c.id), `${c.nameHebrew} (${c.id})`).toBe(c.continentId);
    }
  });

  it("every country has full passport details", () => {
    for (const c of COUNTRIES) {
      const d = COUNTRY_DETAILS[c.id];
      expect(d, `missing details for ${c.nameHebrew} (${c.id})`).toBeTruthy();
      expect(d.alpha2).toMatch(/^[A-Z]{2}$/);
      expect(d.capitalHebrew.length, `capital of ${c.nameHebrew}`).toBeGreaterThan(1);
      expect(d.factHebrew.length, `fact of ${c.nameHebrew}`).toBeGreaterThan(8);
      expect(d.emojis.length, `emojis of ${c.nameHebrew}`).toBeGreaterThan(0);
      expect(LANGUAGE_BY_ID.has(d.languageId), `language ${d.languageId} of ${c.nameHebrew}`).toBe(true);
    }
  });

  it("no orphan detail entries", () => {
    const countryIds = new Set(COUNTRIES.map((c) => c.id));
    for (const id of Object.keys(COUNTRY_DETAILS)) {
      expect(countryIds.has(id), `orphan details for ${id}`).toBe(true);
    }
  });

  it("alpha2 codes are unique and produce flag emoji", () => {
    const seen = new Set<string>();
    for (const [id, d] of Object.entries(COUNTRY_DETAILS)) {
      expect(seen.has(d.alpha2), `duplicate alpha2 ${d.alpha2} (${id})`).toBe(false);
      seen.add(d.alpha2);
    }
    expect(flagEmoji("IL")).toBe("🇮🇱");
    expect(flagEmoji("fr")).toBe("🇫🇷");
  });
});

describe("languages data", () => {
  it("every pack has 4 complete words and a plausible TTS code", () => {
    for (const lang of LANGUAGES) {
      expect(lang.words.length, lang.id).toBe(4);
      expect(lang.nameHebrew.length).toBeGreaterThan(1);
      expect(lang.ttsLang).toMatch(/^[a-z]{2,3}(-[A-Z]{2})?$/);
      const meanings = lang.words.map((w) => w.meaningHebrew);
      expect(meanings).toEqual(["שלום", "תודה", "כן", "לא"]);
      for (const w of lang.words) {
        expect(w.native.length, `${lang.id} native`).toBeGreaterThan(0);
        expect(w.translit.length, `${lang.id} translit`).toBeGreaterThan(0);
      }
    }
  });

  it("language ids are unique", () => {
    const ids = LANGUAGES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("continent details", () => {
  it("covers all continents with facts and animals", () => {
    for (const c of CONTINENTS) {
      const d = CONTINENT_DETAILS[c.id];
      expect(d, `missing continent details for ${c.id}`).toBeTruthy();
      expect(d.factHebrew.length).toBeGreaterThan(10);
      expect(d.animalsHebrew.length).toBeGreaterThan(3);
      expect(d.animals.length).toBeGreaterThan(0);
    }
  });
});

describe("planets data", () => {
  it("has the sun, 8 planets, the moon and Pluto", () => {
    expect(PLANETS.length).toBe(11);
    expect(TOTAL_SPACE_OBJECTS).toBe(11);
    expect(PLANETS[0].id).toBe("sun");
    const ids = PLANETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PLANETS) {
      expect(p.nameHebrew.length).toBeGreaterThan(1);
      expect(p.factHebrew.length).toBeGreaterThan(10);
      expect(p.extraHebrew.length).toBeGreaterThan(5);
      expect(p.radius).toBeGreaterThan(0);
    }
  });

  it("planet orbits grow outward from the sun", () => {
    const orbiting = PLANETS.filter((p) => p.id !== "sun" && p.id !== "moon");
    for (let i = 1; i < orbiting.length; i++) {
      expect(orbiting[i].orbitRadius).toBeGreaterThan(orbiting[i - 1].orbitRadius);
    }
  });
});
