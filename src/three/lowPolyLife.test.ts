// Every creature in the catalog must build successfully (headless — geometry
// and materials only, no WebGL) and carry pickable ids + vertex colors.

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { MARINE_LIFE } from "../data/marineLife";
import { buildCreature, collectRig } from "./lowPolyLife";

const SWIMMER_STYLES = new Set([
  "fish", "angelfish", "swordfish", "flyingfish", "shark", "hammerhead",
  "whaleshark", "whale", "spermwhale", "dolphin", "narwhal", "penguin",
  "seal", "walrus", "sunfish", "hatchetfish", "manta", "ray",
]);

describe("lowPolyLife builders", () => {
  for (const c of MARINE_LIFE) {
    it(`builds ${c.id} (${c.style})`, () => {
      const g = buildCreature(c);
      expect(g.children.length).toBeGreaterThan(0);

      // every descendant is pickable
      let meshes = 0;
      let hasVertexColors = false;
      g.traverse((obj) => {
        expect(obj.userData.creatureId).toBe(c.id);
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          meshes++;
          if (mesh.geometry.getAttribute("color")) hasVertexColors = true;
        }
      });
      expect(meshes).toBeGreaterThanOrEqual(2);
      // the painted-body look: every opaque creature carries at least one
      // vertex-colored surface (countershading / pattern). Jellyfish are
      // translucent glow-material creatures by design.
      if (c.style !== "jellyfish") expect(hasVertexColors).toBe(true);
    });
  }

  it("swimming creatures expose an animatable rig part", () => {
    for (const c of MARINE_LIFE) {
      if (!SWIMMER_STYLES.has(c.style)) continue;
      const rig = collectRig(buildCreature(c));
      const animated = ["tail", "flukes", "wingL", "flipperL", "pectL", "dorsal"].some((n) => rig[n]);
      expect(animated, `${c.id} should have a rig`).toBe(true);
    }
  });

  it("special rigs exist: jaws, claws, lure, bell", () => {
    const byId = (id: string) => {
      const c = MARINE_LIFE.find((m) => m.id === id)!;
      return collectRig(buildCreature(c));
    };
    expect(byId("moray").jaw).toBeTruthy();
    expect(byId("gulper-eel").jaw).toBeTruthy();
    expect(byId("anglerfish").lure).toBeTruthy();
    expect(byId("crab").clawL).toBeTruthy();
    expect(byId("lobster").clawR).toBeTruthy();
    expect(byId("jellyfish").bell).toBeTruthy();
    expect(byId("octopus").arm0).toBeTruthy();
  });
});
