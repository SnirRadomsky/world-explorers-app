# 🌍 מגלי העולם — World Explorers

A geography-and-space exploration game for kids ages 5–10, entirely in **Hebrew (RTL)** and fully **offline**. Built with React + TypeScript + Vite + three.js, packaged as an Android app with Capacitor.

See **[SPEC.md](./SPEC.md)** for the full product & technical spec.

## What's inside

| Activity | What kids do |
|---|---|
| 🌍 **3D Globe** | Spin a painted-from-real-map Earth, tap continents/countries to discover them (atmosphere glow, stars, day/night, fly-to) |
| 🗺️ **2D Map** | The classic flat map — same shared progress |
| 🇮🇱 **Israel** | Discover 59 cities on the districts map (nearest-city tap detection) |
| 🚀 **Solar System** | Orbiting planets with procedural textures, tap to learn (11 space objects) |
| 🛂 **Passport cards** | Flag, capital, fun fact + **4 words in the local language** (58 language packs) with Hebrew transliteration and native TTS |
| ❓ **Quiz** | "איפה צרפת?" — find it on the map; hints, medals, adaptive question pool |
| 📒 **Sticker album** | 14 collectible reward stickers with celebrations |

Everything is spoken with TTS (Hebrew + native language voices), all sound effects are synthesized with WebAudio (zero audio assets), and progress is stored locally. A parental math-gate guards progress reset.

## Development

```bash
npm install          # postinstall runs patch-package
npm run dev          # vite dev server
npm run lint         # eslint
npm test             # vitest unit tests (data integrity, quiz/sticker logic, globe math)
npm run build        # tsc + vite build
npm run test:e2e     # Playwright end-to-end suite (builds first via test:all)
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

- `src/three/GlobeScene.ts` — the 3D Earth engine: paints countries from the bundled TopoJSON (`public/countries-110m.json`) onto a canvas texture; tap-picking via raycast → lat/lng → point-in-polygon (`d3-geo`), with a nearest-centroid helper for tiny countries.
- `src/three/SolarSystemScene.ts` — procedural planet textures, orbits, tap-to-focus camera.
- `src/data/` — all game content: countries + passport details, 58 language packs, continents, planets, Israel cities.
- `src/lib/` — pure, unit-tested logic (quiz engine, sticker unlocks).
- Fonts (Heebo) and all geo data are bundled — no network needed after install.
