// Globe picking math: lat/lng ↔ 3D position roundtrips.

import { describe, it, expect } from "vitest";
import { latLngToVec3, vec3ToLatLng } from "./GlobeScene";

const CASES: Array<[number, number, string]> = [
  [31.5, 35.0, "Israel"],
  [48.85, 2.35, "Paris"],
  [-33.9, 151.2, "Sydney"],
  [40.7, -74.0, "New York"],
  [-82, 0, "Antarctica"],
  [0, 0, "Gulf of Guinea"],
  [0, 179.5, "near antimeridian E"],
  [0, -179.5, "near antimeridian W"],
];

describe("lat/lng ↔ vec3 roundtrip", () => {
  for (const [lat, lng, label] of CASES) {
    it(label, () => {
      const v = latLngToVec3(lat, lng, 100);
      expect(v.length()).toBeCloseTo(100, 5);
      const back = vec3ToLatLng(v);
      expect(back.lat).toBeCloseTo(lat, 4);
      // longitude wraps at ±180
      const dLng = Math.abs(((back.lng - lng + 540) % 360) - 180);
      expect(dLng).toBeLessThan(1e-4);
    });
  }
});
