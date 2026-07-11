import { describe, it, expect } from "vitest";
import { computeUnlockedStickers, levelFor, STICKERS, type ProgressSnapshot } from "./stickers";
import { CONTINENTS } from "../data/continents";
import { COUNTRIES } from "../data/countries";
import { TOTAL_ISRAEL_SITES } from "../data/israelCities";
import { TOTAL_SPACE_OBJECTS } from "../data/planets";
import { TOTAL_LANDMARKS, TOTAL_TREASURES } from "../data/landmarks";

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

  it("4.0: landmark + treasure stickers", () => {
    const p = empty();
    p.landmarksVisited = 8;
    p.treasuresFound = 20;
    let u = computeUnlockedStickers(p);
    expect(u.has("st-wonders")).toBe(true);
    expect(u.has("st-all-wonders")).toBe(false);
    expect(u.has("st-treasure")).toBe(true);
    expect(u.has("st-all-treasures")).toBe(false);
    p.landmarksVisited = TOTAL_LANDMARKS;
    p.treasuresFound = TOTAL_TREASURES;
    u = computeUnlockedStickers(p);
    expect(u.has("st-all-wonders")).toBe(true);
    expect(u.has("st-all-treasures")).toBe(true);
  });

  it("4.0: little-school stickers", () => {
    const p = empty();
    p.lettersKnown = 22;
    p.wordsRead = 12;
    p.mathStarsTotal = 6;
    p.memoryWins = 3;
    p.songsDone = 3;
    const u = computeUnlockedStickers(p);
    expect(u.has("st-letters")).toBe(true);
    expect(u.has("st-reader")).toBe(true);
    expect(u.has("st-math")).toBe(true);
    expect(u.has("st-memory")).toBe(true);
    expect(u.has("st-musician")).toBe(true);
  });

  it("4.0: thresholds are not unlocked early", () => {
    const p = empty();
    p.lettersKnown = 21;
    p.wordsRead = 11;
    p.mathStarsTotal = 5;
    p.memoryWins = 2;
    p.songsDone = 2;
    p.landmarksVisited = 7;
    p.treasuresFound = 19;
    const u = computeUnlockedStickers(p);
    for (const id of ["st-letters", "st-reader", "st-math", "st-memory", "st-musician", "st-wonders", "st-treasure"]) {
      expect(u.has(id), id).toBe(false);
    }
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
    p.israelDiscovered = TOTAL_ISRAEL_SITES;
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

describe("3.0 stickers (stargazer / seasons)", () => {
  it("stargazer unlocks when all constellations are found", () => {
    const p = empty();
    expect(computeUnlockedStickers(p).has("st-stargazer")).toBe(false);
    p.constellationsDiscovered = 10;
    expect(computeUnlockedStickers(p).has("st-stargazer")).toBe(true);
  });

  it("seasons sticker unlocks after exploring all four seasons", () => {
    const p = empty();
    p.seasonsSeen = 3;
    expect(computeUnlockedStickers(p).has("st-seasons")).toBe(false);
    p.seasonsSeen = 4;
    expect(computeUnlockedStickers(p).has("st-seasons")).toBe(true);
  });
});

describe("ocean stickers", () => {
  it("dolphin friend at 15 creatures, ocean king when all found", async () => {
    const { MARINE_LIFE } = await import("../data/marineLife");
    const p = empty();
    p.oceanDiscovered = new Set(MARINE_LIFE.slice(0, 15).map((c) => c.id));
    let u = computeUnlockedStickers(p);
    expect(u.has("st-dolphin")).toBe(true);
    expect(u.has("st-ocean")).toBe(false);
    p.oceanDiscovered = new Set(MARINE_LIFE.map((c) => c.id));
    u = computeUnlockedStickers(p);
    expect(u.has("st-ocean")).toBe(true);
    expect(u.has("st-deep")).toBe(true);
  });

  it("deep explorer needs exactly the deep-zone creatures", async () => {
    const { MARINE_LIFE } = await import("../data/marineLife");
    const p = empty();
    p.oceanDiscovered = new Set(MARINE_LIFE.filter((c) => c.zone === "deep").map((c) => c.id));
    const u = computeUnlockedStickers(p);
    expect(u.has("st-deep")).toBe(true);
    expect(u.has("st-ocean")).toBe(false);
  });
});

describe("tourist sticker", () => {
  it("unlocks after visiting 10 countries in 3D", () => {
    const p = empty();
    p.visitedCount = 9;
    expect(computeUnlockedStickers(p).has("st-tourist")).toBe(false);
    p.visitedCount = 10;
    expect(computeUnlockedStickers(p).has("st-tourist")).toBe(true);
  });
});
