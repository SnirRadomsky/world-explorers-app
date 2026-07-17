// Data-integrity tests for the 5.0 activities: space station, land journey
// and the deep-sea expedition — plus their sticker unlock logic.

import { describe, it, expect } from "vitest";
import {
  STATION_ROOMS,
  STATION_OBJECTS,
  TOTAL_STATION_OBJECTS,
  stationObjectsFor,
} from "./spaceStation";
import {
  VEHICLES,
  LAND_SIGHTS,
  TOTAL_LAND_SIGHTS,
  sightsFor,
} from "./landJourney";
import {
  DEEP_SEA_AREAS,
  DEEP_SEA_FINDS,
  TOTAL_DEEP_SEA_FINDS,
  DIVE_CRAFTS,
  findsFor,
} from "./deepSea";
import { computeUnlockedStickers, STICKERS, type ProgressSnapshot } from "../lib/stickers";

const ROOM_IDS = new Set(STATION_ROOMS.map((r) => r.id));
const VEHICLE_IDS = new Set(VEHICLES.map((v) => v.id));
const AREA_IDS = new Set(DEEP_SEA_AREAS.map((a) => a.id));

describe("space station data", () => {
  it("object ids are unique", () => {
    const ids = STATION_OBJECTS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every object belongs to a real room and has Hebrew content", () => {
    for (const o of STATION_OBJECTS) {
      expect(ROOM_IDS.has(o.room), `${o.id} room`).toBe(true);
      expect(o.nameHebrew.length).toBeGreaterThan(1);
      expect(o.factHebrew.length, `fact of ${o.id}`).toBeGreaterThan(10);
      expect(o.emoji.length).toBeGreaterThan(0);
    }
  });

  it("every room has at least 3 objects", () => {
    for (const r of STATION_ROOMS) {
      expect(stationObjectsFor(r.id).length, r.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("total matches", () => {
    expect(TOTAL_STATION_OBJECTS).toBe(STATION_OBJECTS.length);
    expect(TOTAL_STATION_OBJECTS).toBeGreaterThanOrEqual(28);
  });
});

describe("land journey data", () => {
  it("sight ids are unique", () => {
    const ids = LAND_SIGHTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every sight belongs to a real vehicle with valid loop position", () => {
    for (const s of LAND_SIGHTS) {
      expect(VEHICLE_IDS.has(s.vehicle), `${s.id} vehicle`).toBe(true);
      expect(s.at).toBeGreaterThanOrEqual(0);
      expect(s.at).toBeLessThan(1);
      expect([-1, 1]).toContain(s.side);
      expect(s.factHebrew.length, `fact of ${s.id}`).toBeGreaterThan(10);
    }
  });

  it("every vehicle route has 12 sights spread around the loop", () => {
    for (const v of VEHICLES) {
      const sights = sightsFor(v.id);
      expect(sights.length, v.id).toBe(12);
      // positions must be distinct enough that sights don't overlap
      const sorted = sights.map((s) => s.at).sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i] - sorted[i - 1], `${v.id} spacing`).toBeGreaterThan(0.02);
      }
    }
  });

  it("total matches", () => {
    expect(TOTAL_LAND_SIGHTS).toBe(LAND_SIGHTS.length);
    expect(TOTAL_LAND_SIGHTS).toBe(36);
  });
});

describe("deep sea data", () => {
  it("find ids are unique", () => {
    const ids = DEEP_SEA_FINDS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every find belongs to a real area and has Hebrew content", () => {
    for (const f of DEEP_SEA_FINDS) {
      expect(AREA_IDS.has(f.area), `${f.id} area`).toBe(true);
      expect(f.nameHebrew.length).toBeGreaterThan(1);
      expect(f.factHebrew.length, `fact of ${f.id}`).toBeGreaterThan(10);
    }
  });

  it("every area has 6 finds", () => {
    for (const a of DEEP_SEA_AREAS) {
      expect(findsFor(a.id).length, a.id).toBe(6);
    }
  });

  it("has rescue, clean and treasure missions", () => {
    const specials = new Set(DEEP_SEA_FINDS.map((f) => f.special).filter(Boolean));
    expect(specials.has("rescue")).toBe(true);
    expect(specials.has("clean")).toBe(true);
    expect(specials.has("treasure")).toBe(true);
  });

  it("both crafts exist", () => {
    expect(DIVE_CRAFTS.map((c) => c.id).sort()).toEqual(["diver", "sub"]);
  });

  it("total matches", () => {
    expect(TOTAL_DEEP_SEA_FINDS).toBe(DEEP_SEA_FINDS.length);
    expect(TOTAL_DEEP_SEA_FINDS).toBe(30);
  });
});

describe("5.0 stickers", () => {
  const base: ProgressSnapshot = {
    continentsDiscovered: new Set(),
    countriesDiscovered: new Set(),
    israelDiscovered: 0,
    planetsDiscovered: 0,
    languagesLearned: 0,
    goldMedals: 0,
  };

  it("new sticker ids exist", () => {
    const ids = new Set(STICKERS.map((s) => s.id));
    for (const id of ["st-crew", "st-engineer", "st-driver", "st-conductor", "st-pilot", "st-roads", "st-submariner", "st-abyss"]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("station stickers unlock at 10 and at all objects", () => {
    expect(computeUnlockedStickers({ ...base, stationDiscovered: 9 }).has("st-crew")).toBe(false);
    expect(computeUnlockedStickers({ ...base, stationDiscovered: 10 }).has("st-crew")).toBe(true);
    const all = computeUnlockedStickers({ ...base, stationDiscovered: TOTAL_STATION_OBJECTS });
    expect(all.has("st-engineer")).toBe(true);
  });

  it("vehicle stickers unlock per completed route", () => {
    const carIds = new Set(sightsFor("car").map((s) => s.id));
    const unlocked = computeUnlockedStickers({ ...base, landDiscovered: carIds });
    expect(unlocked.has("st-driver")).toBe(true);
    expect(unlocked.has("st-conductor")).toBe(false);
    expect(unlocked.has("st-pilot")).toBe(false);
    expect(unlocked.has("st-roads")).toBe(false);

    const allIds = new Set(LAND_SIGHTS.map((s) => s.id));
    const allUnlocked = computeUnlockedStickers({ ...base, landDiscovered: allIds });
    expect(allUnlocked.has("st-driver")).toBe(true);
    expect(allUnlocked.has("st-conductor")).toBe(true);
    expect(allUnlocked.has("st-pilot")).toBe(true);
    expect(allUnlocked.has("st-roads")).toBe(true);
  });

  it("deep-sea stickers unlock at 15 and at all finds", () => {
    expect(computeUnlockedStickers({ ...base, deepSeaDiscovered: 14 }).has("st-submariner")).toBe(false);
    expect(computeUnlockedStickers({ ...base, deepSeaDiscovered: 15 }).has("st-submariner")).toBe(true);
    expect(computeUnlockedStickers({ ...base, deepSeaDiscovered: TOTAL_DEEP_SEA_FINDS }).has("st-abyss")).toBe(true);
  });

  it("empty progress unlocks none of the new stickers", () => {
    const unlocked = computeUnlockedStickers(base);
    for (const id of ["st-crew", "st-engineer", "st-driver", "st-conductor", "st-pilot", "st-roads", "st-submariner", "st-abyss"]) {
      expect(unlocked.has(id), id).toBe(false);
    }
  });
});
