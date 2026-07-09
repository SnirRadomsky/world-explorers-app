// Paints a realistic mini-Earth (equirectangular) from the bundled TopoJSON —
// used by the solar-system scene so Earth shows real continents from space,
// with latitude-based biome tinting (forests, deserts, tundra, polar ice).

import * as THREE from "three";
import { feature as topoFeature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { geoEquirectangular, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { makeCanvas } from "./proceduralTextures";
import { fbm2D } from "./noise";

const W = 1024;
const H = 512;

/** Paint the Earth canvas: real coastlines + biome bands + ocean depth. */
export function paintEarthCanvas(topo: Topology): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(W, H);
  const projection = geoEquirectangular()
    .scale(W / (2 * Math.PI))
    .translate([W / 2, H / 2]);
  const path = geoPath(projection);

  // ── Ocean: deep blue with subtle FBM depth variation ──
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0, "#9fd0ea");
  og.addColorStop(0.28, "#2e7fc2");
  og.addColorStop(0.5, "#1b5fa8");
  og.addColorStop(0.72, "#2e7fc2");
  og.addColorStop(1, "#9fd0ea");
  ctx.fillStyle = og;
  ctx.fillRect(0, 0, W, H);

  // ── Land: paint on a separate transparent layer, then biome-tint it ──
  const [landCanvas, lctx] = makeCanvas(W, H);
  const collection = topoFeature(topo, topo.objects.countries) as unknown as {
    features: Array<GeoPermissibleObjects>;
  };
  lctx.fillStyle = "#4c9e5f"; // temperate green base
  for (const f of collection.features) {
    lctx.beginPath();
    path.context(lctx as unknown as CanvasRenderingContext2D)(f);
    lctx.fill();
  }

  // Biome bands, clipped to land via source-atop:
  lctx.globalCompositeOperation = "source-atop";
  const bands = lctx.createLinearGradient(0, 0, 0, H);
  //          y: 0 = +90°, 0.5 = equator, 1 = -90°
  bands.addColorStop(0.0, "rgba(240,247,252,0.95)");  // arctic ice
  bands.addColorStop(0.1, "rgba(212,222,208,0.75)");  // tundra
  bands.addColorStop(0.2, "rgba(66,120,64,0.5)");     // boreal forest
  bands.addColorStop(0.32, "rgba(110,160,80,0.25)");  // temperate
  bands.addColorStop(0.4, "rgba(216,190,120,0.55)");  // desert belt (Sahara etc.)
  bands.addColorStop(0.5, "rgba(38,110,52,0.55)");    // tropical rainforest
  bands.addColorStop(0.6, "rgba(206,182,116,0.45)");  // southern desert belt
  bands.addColorStop(0.72, "rgba(120,164,88,0.3)");   // temperate south
  bands.addColorStop(0.88, "rgba(226,232,226,0.7)");  // sub-antarctic
  bands.addColorStop(1.0, "rgba(245,250,252,0.98)");  // antarctic ice
  lctx.fillStyle = bands;
  lctx.fillRect(0, 0, W, H);

  // FBM terrain richness (mountains/valleys shimmer), still land-only
  const nw = 256;
  const nh = 128;
  const [noiseCanvas, nctx] = makeCanvas(nw, nh);
  const img = nctx.createImageData(nw, nh);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const ang = (x / nw) * Math.PI * 2;
      const v = fbm2D(Math.cos(ang) * 4 + 7, (y / nh) * 8, 29, 4) * 0.5 +
                fbm2D(Math.sin(ang) * 4 + 3, (y / nh) * 8 + 1, 31, 4) * 0.5;
      const g = Math.floor(v * 255);
      const i = (y * nw + x) * 4;
      img.data[i] = g; img.data[i + 1] = g; img.data[i + 2] = g; img.data[i + 3] = 255;
    }
  }
  nctx.putImageData(img, 0, 0);
  lctx.globalAlpha = 0.25;
  lctx.globalCompositeOperation = "overlay" as GlobalCompositeOperation;
  lctx.imageSmoothingEnabled = true;
  lctx.drawImage(noiseCanvas, 0, 0, W, H);
  lctx.globalAlpha = 1;
  lctx.globalCompositeOperation = "source-over";

  ctx.drawImage(landCanvas, 0, 0);

  // ── Arctic sea ice cap (the Arctic is ocean — paint it white on top) ──
  const ice = ctx.createLinearGradient(0, 0, 0, H * 0.09);
  ice.addColorStop(0, "rgba(255,255,255,0.95)");
  ice.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = ice;
  ctx.fillRect(0, 0, W, H * 0.09);

  return canvas;
}

/** Wrap the painted canvas in a three texture. */
export function makeEarthTexture(topo: Topology): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(paintEarthCanvas(topo));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
