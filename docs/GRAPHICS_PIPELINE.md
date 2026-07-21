# Painted Nature Graphics Pipeline

Guide for upgrading low-poly Three.js place scenes with AI-generated image assets.
Adapted from **אלוף התנ״ך / tanach-champion** for **World Explorers**.

Earth globe and galaxy / solar system stay procedural - do not run this pipeline on them.

Entity heroes (animals, landmarks, land sights) use a parallel pack under
`public/assets/entities/sprites` via `src/three/entityAssets.ts` and
`npm run process:entities`. Builders prefer painted sprites with procedural fallback.

---

## Goal

Make country dioramas, landmarks, land journeys, and ocean reefs feel **painted** without:

- loading dozens of heavy GLBs
- flat solid-color grounds
- obvious procedural “toy cones”

Use **shared textures + billboard sprites**, with a **theme pack** per biome mood.

---

## Architecture

```
AI image gen  →  process script (resize + chroma-key)  →  public/assets/nature/
                                                              ↓
                                                     THEME_PACKS
                                                              ↓
                                              ground material + billboards
```

| Layer | Role |
|--------|------|
| **Ground JPEG** | Seamless tileable top-down texture |
| **Sprite PNG** | Isolated prop on magenta → alpha → crossed planes |
| **Theme pack** | Maps themeId → { ground, sprites } |
| **Procedural fallback** | If a sprite is missing, keep old mesh builders |

---

## Themes (this app)

| Theme | Use | Ground | Signature sprites |
|-------|-----|--------|-------------------|
| `lush` | grass biomes, forests | grass-eden | oak, flower bush, grass, flowers |
| `desert` | sand biomes | ground-desert | palm, cactus, sandstone, dry grass |
| `savanna` | savanna biomes | ground-savanna | acacia, dry bush, dry grass |
| `snow` | snow / ice landmarks | ground-snow | night tree, coastal rock |
| `rock` | rocky biomes / stone | ground-sinai | night tree, sandstone |
| `coast` | beaches / palms | ground-sea | palm, coastal rock |
| `reef` | ocean reef floor | ground-reef | coral, kelp |
| `olive` | Mediterranean | ground-canaan | olive, cypress |
| `plaza` | city landmark plazas | stone-path | olive, flower bush |

**Do not theme:** `GlobeScene`, `SolarSystemScene`, `earthPainter`, space station (except optional greenhouse later).

---

## 1. Generate assets

### Ground textures

```
Seamless tileable top-down [SURFACE] texture for a children's stylized 3D game.
Colors: [HEX LIST].
Hand-painted soft look, gentle variation only.
NO checkerboard, NO hard grid, NO diamond tiling, NO text, NO characters.
Square, seamlessly tileable on all edges.
```

### Prop sprites

```
Children's game sprite: cute stylized [PROP], chibi cartoon kids-game style.
Solid bright magenta #FF00FF background only (for chroma key).
Centered, full subject visible with margin.
NO ground plane, NO shadow on the background, NO text, NO characters.
```

GenerateImage writes into the Cursor project `assets/` folder, then process.

---

## 2. Process

```bash
npm run process:nature
```

Script: `scripts/process-nature-assets.mjs`

- Textures → 512 JPEG q≈78
- Sprites → chroma-key magenta → 512 PNG palette

---

## 3. Runtime

| File | Role |
|------|------|
| `src/three/natureAssets.ts` | THEME_PACKS, setNatureTheme, billboards, painted grounds |
| `src/three/dioramaKit.ts` | Nature builders prefer sprites |
| `src/three/DioramaScene.ts` | Theme + painted island ground |
| `src/three/LandmarkScene.ts` | Painted landmark stage |
| `src/three/LandJourneyScene.ts` | Painted road disc + roadside trees |
| `src/three/OceanDiveScene.ts` | Reef sand + coral/kelp billboards |

```ts
setNatureTheme(themeForBiome(biome)); // before spawning ground / trees
```

---

## 4. Checklist for a new mood

1. [ ] Generate ground JPEG source + 3–6 sprites (magenta bg)
2. [ ] Add filenames to `process-nature-assets.mjs`
3. [ ] `npm run process:nature`
4. [ ] Add `THEME_PACKS[themeId]`
5. [ ] Map biome / landmark ground → theme helper
6. [ ] Playtest load time + alpha fringing on device

---

## Anti-patterns

- Touching Earth globe or solar-system textures with this pipeline
- Photoreal PBR on a toon/chibi art direction
- Unique material per prop (draw-call explosion)
- 2048 PNGs uncompressed in the APK
