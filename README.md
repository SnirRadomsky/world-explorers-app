# 🌍 מגלי העולם — World Explorers

A geography-space-and-school exploration game for kids ages 5–10, entirely in **Hebrew (RTL)** and fully **offline**. Built with React + TypeScript + Vite + three.js, packaged as an Android app with Capacitor.

See **[SPEC.md](./SPEC.md)** (2.0), **[SPEC-3.0.md](./SPEC-3.0.md)** (3.0) and **[SPEC-4.0.md](./SPEC-4.0.md)** for the 4.0 upgrade design.

## What's inside

| Activity | What kids do |
|---|---|
| 🌍 **3D Globe** | Spin a painted-from-real-map Earth, tap continents/countries to discover them (atmosphere glow, stars, day/night, fly-to) — now with **pulsing gold pins on the 20 world wonders** |
| 🏛️ **World Wonders** | Visit 20 famous places in hand-built 3D scenes — the Western Wall, Giza + Sphinx, the African savanna, the Eiffel Tower, the Great Wall, Machu Picchu, the Northern Lights, a penguin colony, and new in 4.1: **Petra, Neuschwanstein Castle, Burj Khalifa and Niagara Falls**… each hiding **3 floating treasures** to find (60 total) |
| 🌦️ **Four Seasons** | Slide through spring→summer→autumn→winter on the globe: land tints, growing/shrinking snow caps, a real sun terminator, and "why we have seasons" |
| 🌊 **Ocean Dives** | Tap any sea → dive 5 oceans × 3 depth zones and meet **49 sea creatures rebuilt in 4.0**: smooth countershaded bodies, real patterns (clownfish bands, orca eye-patches, whale-shark spots), wagging tails, flapping manta wings, snapping claws |
| 🎓 **The Little School** | Seven learning games: **math** (counting/addition/subtraction with objects), **Hebrew letters with full nikud row**, **first reading** (read the pointed word, pick the picture), **a clock corner with 5 mini-games** (whole/half/quarter hours, digital↔analog matching, drag-the-hands), **memory pairs**, a **finger-painting studio** and a **music box** with 8 play-after-me songs, a live note sheet, 4 instruments, a Simon-style echo game and a recording studio |
| 🚪 **Country Dioramas** | "Visit" a country in a rotating 3D scene: a famous landmark, a local animal and nature |
| 🗺️ **2D Map** | The classic flat map — same shared progress |
| 🇮🇱 **Israel** | Discover 81 cities (with spoken fun facts) + 10 golden special-place pins — the Kinneret, the Dead Sea, Masada, the Ramon Crater and more |
| 🚀 **Solar System** | A **rebuilt cinematic launch** (metallic ship, layered flame with shock diamonds, smoke, Hebrew stage captions, soft-painted Earth from space), realistic planets, asteroid belt, comet, ISS, a spacewalking astronaut, the Hubble telescope and the Andromeda galaxy (17 space objects), constellations |
| 🛂 **Passport cards** | Flag, capital, fun fact + 4 words in the local language (58 language packs) |
| ❓ **Quiz** | 8 topics: find-it-on-the-map (now **auto-zooms to the target on reveal**), flags, sea life with **real rendered creature portraits**, world wonders ("which country is X in?"), capitals, plus the deterministic daily challenge with a streak |
| 📖 **Explorer Encyclopedia** | Everything discovered — now including wonders, treasures and photo cards for sea creatures |
| 📒 **Sticker album** | 31 collectible reward stickers with celebrations |
| 👨‍👩‍👧 **Parents report** | A read-only progress summary behind the multiplication gate |

Everything is spoken with TTS (Hebrew + native language voices), all sound effects and music are synthesized with WebAudio (zero audio assets), every 3D scene is painted/built procedurally (no model or image files), and progress is stored locally. A parental math-gate guards progress reset and the parents report.

## Development

```bash
npm install          # postinstall runs patch-package
npm run dev          # vite dev server
npm run lint         # eslint
npm test             # vitest unit tests (data integrity, quiz/math/sticker logic, creature builders)
npm run build        # tsc + vite build
npm run test:e2e     # Playwright end-to-end suite
npm run test:all     # unit → build → e2e
```

## Android

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug   # APK at android/app/build/outputs/apk/debug/
```

CI (`.github/workflows/android-release.yml`) builds the APK and attaches it to a GitHub Release on every push to `main`.

## Architecture notes

- `src/three/GlobeScene.ts` — the 3D Earth engine: paints countries from the bundled TopoJSON onto a canvas texture; seasons overlay, day/night terminator shader, city lights, **landmark pins with raycast-first picking**.
- `src/three/landmarkKit.ts` + `LandmarkScene.ts` — the 20 hand-built wonder sites (mood skies, painted grounds, animated doves/penguins/aurora/bus) and the visit engine with floating treasure pedestals.
- `src/three/lowPolyLife.ts` — sea-creature builders 2.0: spline-lathe bodies, vertex-color countershading & patterns, shaped fins and a named animation rig driven by `OceanDiveScene.ts`.
- `src/three/creatureSnapshots.ts` — offscreen WebGL "photo studio" that renders each creature once to a cached PNG for the quiz & encyclopedia.
- `src/three/SolarSystemScene.ts` — realistic planets, asteroid belt, comet, ISS, constellations.
- `src/three/DioramaScene.ts` + `dioramaKit.ts` — the country diorama stage and its low-poly kit.
- `src/components/Learn/` — the seven school games; pure math engine in `src/lib/mathQuiz.ts`; alphabet + nikud data in `src/data/hebrewLetters.ts`, first words in `src/data/readingWords.ts`; progress in `src/hooks/useLearning.ts`.
- `src/data/landmarks.ts` — the 20 wonders with real coordinates, facts and 60 treasures.
- `src/lib/` — pure, unit-tested logic (quiz engine, choice quiz, math quiz, daily challenge, sticker unlocks).
- Fonts (Heebo) and all geo data are bundled — no network needed after install.
