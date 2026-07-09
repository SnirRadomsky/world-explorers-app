import { describe, it, expect } from "vitest";
import { hash2D, valueNoise2D, fbm2D } from "./noise";

describe("noise", () => {
  it("hash2D is deterministic and in [0,1)", () => {
    for (let i = 0; i < 200; i++) {
      const v = hash2D(i * 7, i * 13, 42);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(hash2D(i * 7, i * 13, 42)).toBe(v);
    }
  });

  it("hash2D varies with seed", () => {
    const a = hash2D(5, 9, 1);
    const b = hash2D(5, 9, 2);
    expect(a).not.toBe(b);
  });

  it("valueNoise2D interpolates smoothly between lattice points", () => {
    const seed = 7;
    // at integer coordinates the noise equals the lattice hash
    expect(valueNoise2D(3, 4, seed)).toBeCloseTo(hash2D(3, 4, seed), 10);
    // midpoints stay within the hull of the four corners
    const corners = [hash2D(3, 4, seed), hash2D(4, 4, seed), hash2D(3, 5, seed), hash2D(4, 5, seed)];
    const mid = valueNoise2D(3.5, 4.5, seed);
    expect(mid).toBeGreaterThanOrEqual(Math.min(...corners) - 1e-9);
    expect(mid).toBeLessThanOrEqual(Math.max(...corners) + 1e-9);
  });

  it("fbm2D is deterministic, bounded, and octaves add detail", () => {
    let min = 1;
    let max = 0;
    for (let i = 0; i < 400; i++) {
      const v = fbm2D(i * 0.17, i * 0.31, 99, 5);
      expect(v).toBe(fbm2D(i * 0.17, i * 0.31, 99, 5));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    // real variation, not a constant
    expect(max - min).toBeGreaterThan(0.2);
    // more octaves changes the field (adds high-frequency detail)
    expect(fbm2D(1.23, 4.56, 99, 1)).not.toBeCloseTo(fbm2D(1.23, 4.56, 99, 6), 4);
  });
});
