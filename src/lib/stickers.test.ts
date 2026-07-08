import { describe, it, expect } from "vitest";
import { computeUnlockedStickers, levelFor, STICKERS, type ProgressSnapshot } from "./stickers";
import { CONTINENTS } from "../data/continents";
import { COUNTRIES } from "../data/countries";
import { TOTAL_ISRAEL_CITIES } from "../data/israelCities";
import { TOTAL_SPACE_OBJECTS } from "../data/planets";

function empty(): ProgressSnapshot {
  return {
    continentsDiscovered: new Set(),
    countriesDiscovered: new Set(),
    israelDiscovered: 0,
    planetsDiscovered: 0,
    languagesLearned: 0,
    goldMedals: 0,
  };
}

describe("computeUnlockedStickers", () => {
  it("empty progress unlocks nothing", () => {
    expect(computeUnlockedStickers(empty()).size).toBe(0);
  });

  it("total-count stickers", () => {
    const p = empty();
    p.israelDiscovered = 10;
    expect(computeUnlockedStickers(p).has("st-first")).toBe(true);
    p.israelDiscovered = 50;
    expect(computeUnlockedStickers(p).has("st-explorer")).toBe(true);
    p.israelDiscovered = 59;
    p.planetsDiscovered = 11;
    p.countriesDiscovered = new Set(COUNTRIES.map((c) => c.id).slice(0, 80));
    // 59 + 11 + 80 = 150
    expect(computeUnlockedStickers(p).has("st-champion")).toBe(true);
  });

  it("all continents sticker", () => {
    const p = empty();
    p.continentsDiscovered = new Set(CONTINENTS.map((c) => c.id));
    expect(computeUnlockedStickers(p).has("st-continents")).toBe(true);
  });

  it("continent-completion animal sticker (australia)", () => {
    const p = empty();
    const australia = COUNTRIES.filter((c) => c.continentId === "australia").map((c) => c.id);
    p.countriesDiscovered = new Set(australia);
    const unlocked = computeUnlockedStickers(p);
    expect(unlocked.has("st-australia")).toBe(true);
    expect(unlocked.has("st-africa")).toBe(false);
  });

  it("israel / astronaut / linguist / quiz stickers", () => {
    const p = empty();
    p.israelDiscovered = TOTAL_ISRAEL_CITIES;
    p.planetsDiscovered = TOTAL_SPACE_OBJECTS;
    p.languagesLearned = 5;
    p.goldMedals = 3;
    const unlocked = computeUnlockedStickers(p);
    expect(unlocked.has("st-israel")).toBe(true);
    expect(unlocked.has("st-astronaut")).toBe(true);
    expect(unlocked.has("st-linguist")).toBe(true);
    expect(unlocked.has("st-quiz")).toBe(true);
  });

  it("sticker ids are unique", () => {
    const ids = STICKERS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("levelFor", () => {
  it("progresses through levels", () => {
    expect(levelFor(0).nameHebrew).toBe("מתחילים");
    expect(levelFor(14).nameHebrew).toBe("מתחילים");
    expect(levelFor(15).nameHebrew).toBe("צופה");
    expect(levelFor(40).nameHebrew).toBe("נווט");
    expect(levelFor(90).nameHebrew).toBe("מגלה-על");
    expect(levelFor(500).nameHebrew).toBe("אלוף העולם");
  });
});
