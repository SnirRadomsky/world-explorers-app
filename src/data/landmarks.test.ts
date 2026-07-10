import { describe, it, expect } from "vitest";
import {
  LANDMARKS,
  TOTAL_LANDMARKS,
  TOTAL_TREASURES,
  ALL_TREASURES,
  landmarkOfTreasure,
} from "./landmarks";
import { SITE_IDS } from "../three/landmarkKit";

describe("landmarks data", () => {
  it("has 10-20 famous places, unique and well-formed", () => {
    expect(TOTAL_LANDMARKS).toBeGreaterThanOrEqual(10);
    expect(TOTAL_LANDMARKS).toBeLessThanOrEqual(20);
    const ids = LANDMARKS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LANDMARKS) {
      expect(l.nameHebrew.length).toBeGreaterThan(2);
      expect(l.countryHebrew.length).toBeGreaterThan(1);
      expect(l.flagEmoji.length).toBeGreaterThan(0);
      expect(l.factHebrew.length).toBeGreaterThan(20);
      expect(l.welcomeHebrew.length).toBeGreaterThan(10);
      expect(l.lat).toBeGreaterThanOrEqual(-90);
      expect(l.lat).toBeLessThanOrEqual(90);
      expect(l.lng).toBeGreaterThanOrEqual(-180);
      expect(l.lng).toBeLessThanOrEqual(180);
    }
  });

  it("every landmark has exactly 3 treasures with unique ids and facts", () => {
    for (const l of LANDMARKS) {
      expect(l.treasures.length, l.id).toBe(3);
      for (const t of l.treasures) {
        expect(t.nameHebrew.length).toBeGreaterThan(1);
        expect(t.factHebrew.length).toBeGreaterThan(10);
        expect(t.emoji.length).toBeGreaterThan(0);
      }
    }
    const tIds = ALL_TREASURES.map((t) => t.id);
    expect(new Set(tIds).size).toBe(tIds.length);
    expect(TOTAL_TREASURES).toBe(TOTAL_LANDMARKS * 3);
  });

  it("every landmark has a 3D site builder", () => {
    const siteSet = new Set(SITE_IDS);
    for (const l of LANDMARKS) {
      expect(siteSet.has(l.id), `missing site builder for ${l.id}`).toBe(true);
    }
  });

  it("treasures resolve back to their landmark", () => {
    expect(landmarkOfTreasure("kotel-dove")?.id).toBe("kotel");
    expect(landmarkOfTreasure("pen-egg")?.id).toBe("penguins");
    expect(landmarkOfTreasure("nope")).toBeUndefined();
  });

  it("flag emojis are unique enough for the quiz distractors", () => {
    const flags = new Set(LANDMARKS.map((l) => l.flagEmoji));
    expect(flags.size).toBeGreaterThanOrEqual(14);
  });
});

describe("new quiz categories", () => {
  it("landmarks starter pool points at real landmarks", async () => {
    const { STARTER_POOLS } = await import("../lib/quiz");
    const ids = new Set(LANDMARKS.map((l) => l.id));
    for (const id of STARTER_POOLS.landmarks) expect(ids.has(id), id).toBe(true);
  });

  it("capitals starter pool countries all have capital details", async () => {
    const { STARTER_POOLS } = await import("../lib/quiz");
    const { getCountryDetails } = await import("./countryDetails");
    for (const id of STARTER_POOLS.capitals) {
      expect(getCountryDetails(id)?.capitalHebrew, id).toBeTruthy();
    }
  });
});

describe("landmark 3D builders", () => {
  it("every site builds a non-empty group", async () => {
    const { buildLandmarkSite } = await import("../three/landmarkKit");
    for (const l of LANDMARKS) {
      const site = buildLandmarkSite(l.id);
      expect(site.children.length, l.id).toBeGreaterThan(2);
    }
  });
});
