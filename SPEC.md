# מגלי העולם 2.0 — World Explorers — Full Product & Technical Spec

**Target:** Android app (Capacitor WebView) for children ages 5–10. Entire UI in **Hebrew, RTL**.
**Guiding principles:** fun first, zero reading required to play (everything is spoken), no ads, no network needed after install (fully offline), big touch targets, gentle failure (never punish), celebrate everything.

---

## 1. High-level overview

The app becomes a small "explorer universe" with six activities reachable from a redesigned home screen:

| # | Activity | Hebrew name | What the child does |
|---|----------|-------------|---------------------|
| 1 | **3D Globe** (primary) | 🌍 גלובוס | Spin a beautiful 3D Earth, tap continents/countries to discover them |
| 2 | **2D Map** (kept) | 🗺️ מפה שטוחה | The classic flat map, same discovery progress |
| 3 | **Israel** | 🇮🇱 ערי ישראל | Discover 59 Israeli cities on the districts map |
| 4 | **Solar System** | 🚀 מערכת השמש | Fly to space, orbit planets, tap to learn |
| 5 | **Quiz** | ❓ חידון | "Where is France?" — find it on the map/globe |
| 6 | **Sticker Album** | 📒 אלבום מדבקות | Collect reward stickers for milestones |

Discovery progress is **shared** between the 3D globe and 2D map (same storage keys as today — existing users lose nothing).

---

## 2. The 3D Globe (the star of the show) 🌍

### 2.1 Rendering
- **three.js** WebGL scene, no external textures — the Earth texture is **painted at runtime onto a canvas** from bundled TopoJSON (offline, crisp, and styleable):
  - Ocean: deep-blue radial gradient with subtle animated specular shine.
  - Land: filled per continent color (continents mode) or per country (countries mode, continent-hued palette with per-country variation).
  - Borders: white 1.5px strokes — high contrast, easy for kids to see shapes.
  - Undiscovered regions are desaturated/translucent; discovered ones glow in full color — the child literally "paints the world" by playing.
- **Atmosphere:** soft blue fresnel glow shader around the rim (the "wow" factor).
- **Stars:** procedural starfield (2,500 points) + subtle nebula sprites.
- **Auto-rotation:** globe idles with a slow spin; stops while the child interacts, resumes after 10s.
- **Day/Night button (🌞/🌙):** night mode dims the ocean, brightens borders and shows warm "city lights" dots on discovered countries.

### 2.2 Interaction
- One-finger drag → rotate (with inertia + damping, kid-friendly "heavy ball" feel).
- Pinch → zoom (clamped; zooming never flips or gimbal-locks).
- **Tap country/continent** → discovery flow (see §5). Picking is done by raycasting the sphere → lat/lng → point-in-polygon (`d3-geo geoContains`) — pixel-accurate even for tiny countries.
- **Tiny-country helper:** tapping near several small countries when zoomed out picks the nearest country center within a tolerance, so קטאר or ישראל are still selectable by little fingers.
- **Fly-to animation:** when the quiz gives a hint, the globe smoothly rotates the target country to face the camera and pulses it.
- Mode chips on-screen: **יבשות | מדינות** (switch what a tap selects), plus **🗺️ button** to jump to the 2D map (and back — 2D screen has a 🌍 button).

### 2.3 Space transition
- A **🚀 rocket button** floats on the globe screen. Tapping it launches the space transition (star-warp overlay + rocket animation) into the Solar System screen.
- Pinch-zooming out to the maximum distance makes the rocket button bounce with a hint bubble: **"רוצים לטוס לחלל? לחצו עליי! 🚀"** — but zooming alone never yanks the child into space, so Earth navigation is never disrupted.

---

## 3. Solar System — מערכת השמש 🪐

- Separate three.js scene: the **Sun** (glowing, animated corona sprite) + **8 planets + the Moon + Pluto** ("פלוטו הקטן", flagged as a dwarf planet — kids love the story).
- Planets have **procedural textures**: banded Jupiter with the red spot, Saturn with tilted rings (RingGeometry), icy Uranus/Neptune, cratered Mercury/Moon, red Mars with a polar cap, cloudy Venus, and Earth reusing the painted map.
- Planets **orbit slowly** on visible thin orbit lines; sizes and distances are stylized (not to scale) so everything is visible and tappable.
- **Tap a planet** → camera glides to it, it becomes a "discovery" (own progress counter: 11 space objects), TTS says its Hebrew name, and a **Planet Card** opens: name, emoji, one wow-fact, size rank, and a fun comparison ("בכדור הארץ נכנסות 1,300 פעמים בתוך צדק!").
- **Galaxy backdrop:** dense starfield + milky-way band + colored nebulae (all procedural).
- **חזרה לכדור הארץ 🌍** button returns to the globe (reverse transition). Back button also works.
- Discovering all 11 objects → milestone + **אסטרונאוט sticker**.

---

## 4. Country Passport Cards — דרכון המדינות 🛂

Tapping a country (globe or 2D) shows the name bubble as today, **plus a "עוד! 👀" button** that opens the country's passport card:

| Field | Example (צרפת) |
|-------|----------------|
| Flag | 🇫🇷 (emoji flag, derived from ISO code — zero assets) |
| Name + TTS | צרפת (spoken) |
| Continent | אירופה |
| Capital | פריז 🏙️ |
| Fun fact | "במגדל אייפל יש 1,665 מדרגות! 🗼" |
| Landmark/animal/food emojis | 🗼🥐🧀 |
| **Words in the local language** | see below |

### 4.1 "How do they say it?" — איך אומרים? 🗣️
Every country maps to a **language pack** (58 languages cover all 157 countries). Each pack has 4 core words:
- שלום (hello) · תודה (thank you) · כן (yes) · לא (no)

Each word shows: the word **in native script** (e.g. *Bonjour*), **Hebrew transliteration** (בּוֹנְז'וּר), and **Hebrew meaning** (שלום). Tapping the word **speaks it with the native TTS voice** (`fr-FR`, `ja-JP`, …). If that voice isn't installed on the device, the app falls back to speaking the Hebrew transliteration — the child always hears *something*.

Hearing all 4 words of a language marks it "learned" → counts toward the **בלשן קטן (little linguist) sticker** (5 / 10 / 20 languages).

### 4.2 Continent cards
Tapping a continent (continents mode) similarly offers a card: name, emoji banner, 3 signature animals, biggest country, a wow-fact, and count of countries discovered there.

---

## 5. Discovery flow (shared, upgraded)

1. Tap → **pop sound** (WebAudio, synthesized — no audio files) + name bubble + Hebrew TTS.
2. New discovery → confetti burst + **success chime** + star marker appears + progress ring ticks up.
3. Card button ("עוד! 👀") for countries/continents/planets.
4. Milestones: completing a continent's countries → continent completion modal + **animal sticker**; completing all continents/countries/cities/planets → trophy modal (existing) + sticker.
5. **Explorer level:** total discoveries drive a level badge on home: מתחיל → צופה → נווט → מגלה־על → אלוף העולם (0/15/40/90/150+).

---

## 6. Quiz mode — חידון ❓

- Child picks a category: יבשות / מדינות / ערי ישראל / כוכבי לכת.
- A round = **8 questions**. The app **speaks**: "איפה אוסטרליה?" (also shown big on screen). The child taps on the map/globe/solar-system picture.
  - Countries quiz uses the 2D map for precision; continents quiz uses the 2D map; planets quiz shows a lineup of the planets; Israel quiz uses the Israel map.
- **Question pool is adaptive:** prefers items the child already discovered (reinforcement); falls back to a "famous & easy" starter set when little is discovered.
- Feedback: correct → confetti + chime + "כל הכבוד!" · wrong → gentle wobble + "אופס, נסו שוב!" (never blocks). After 2 misses the target **pulses/glows** as a hint; after 3 the app shows it and says "הנה זה! ננסה את הבא".
- Round end: 0–3 stars + medal (ארד/כסף/זהב), stored; 3 gold medals in a category → **quiz sticker**.

---

## 7. Israel map upgrades 🇮🇱

- **Better city detection:** tap resolution now uses a **Voronoi/nearest-point search in screen space with a zoom-aware radius** (d3-delaunay), so the tapped city is always the one visually closest to the finger; district-fill taps keep working as "discover nearest undiscovered city in that district".
- Labels de-clutter: at low zoom only discovered cities show names (❓ for others, as today) with collision-aware font scaling; zooming in reveals bigger labels and easier tap targets (tap radius grows in screen px).
- District completion: when a district's cities are all found, the district gets a ✅ badge + small celebration; per-district progress shown in a legend chip row.

---

## 8. Sound & voice design 🔊

- **All SFX are synthesized with WebAudio** (no binary assets): tap-pop, success chime (major arpeggio), quiz-correct (tada), quiz-miss (soft "boing"), rocket whoosh, space ambient pad, sticker unlock sparkle.
- **TTS everywhere:** Hebrew (`he-IL`) for names, questions, facts intro; native language voices for the greeting words (§4.1). Rate 0.85, playful pitch.
- Global mute toggle (persisted) silences TTS + SFX. Everything remains fully playable muted.

---

## 9. Sticker Album — אלבום מדבקות 📒

Grid of sticker slots (locked = grey ❓ silhouette). Unlocks:

| Sticker | Condition |
|---------|-----------|
| 🦁 אריה אפריקה · 🐼 פנדת אסיה · 🦊 שועל אירופה · 🦅 נשר אמריקה הצפונית · 🦜 תוכי אמריקה הדרומית · 🦘 קנגורו אוסטרליה · 🐧 פינגווין אנטארקטיקה | complete all countries of that continent (or tap-discover the continent in continents mode ×?—no: continent's sticker = finish its countries; discovering all 7 continents in continents mode = 🌍 sticker) |
| 🌍 מגלה היבשות | all 7 continents discovered |
| 🧭 10 גילויים · 🗺️ 50 גילויים · 🏆 150 גילויים | total discoveries |
| 🇮🇱 מלך ישראל | all 59 cities |
| 👨‍🚀 אסטרונאוט | all 11 space objects |
| 🗣️ בלשן קטן | 5 languages learned |
| 🥇 אלוף החידונים | 3 gold medals |

Unlock = full-screen sparkle + TTS "קיבלתם מדבקה חדשה!". Album screen shows collected count and lets kids tap stickers to hear their name.

---

## 10. Safety & parental details

- **Parental gate** on destructive actions (reset progress): "שאלה להורים: כמה זה 7 × 3?" — numeric keypad; wrong answer just closes.
- No external links, no purchases, no analytics, no camera/mic permissions. Only TTS is used.
- Reduced-motion respected (confetti already does; globe auto-rotate disabled when `prefers-reduced-motion`).

---

## 11. Technical architecture

```
src/
  data/
    continents.ts            (existing)
    countries.ts             (existing, + capital/factKey/langId via countryDetails)
    countryDetails.ts        (NEW: alpha2→flag emoji, capital, fact, emojis, languageId)
    languages.ts             (NEW: ~35 language packs: words, translit, meaning, ttsLang)
    continentDetails.ts      (NEW: facts, animals, stats)
    planets.ts               (NEW: 11 bodies: name, fact, color spec, orbit)
    israelCities.ts          (existing)
    continentMapping.ts      (existing)
  three/
    GlobeScene.ts            (NEW: engine class — texture painter, picking, flyTo, night mode)
    SolarSystemScene.ts      (NEW: engine class — bodies, orbits, focus camera)
    proceduralTextures.ts    (NEW: planet/canvas texture painters, starfield)
  components/
    Globe/GlobeView.tsx      (NEW: React wrapper + chips + rocket + cards)
    Space/SolarSystemView.tsx(NEW)
    Cards/CountryCard.tsx    (NEW) · ContinentCard.tsx (NEW) · PlanetCard.tsx (NEW)
    Quiz/QuizView.tsx        (NEW) + lib/quiz.ts (pure logic, tested)
    Album/StickerAlbum.tsx   (NEW) + lib/stickers.ts (pure logic, tested)
    UI/ParentalGate.tsx      (NEW), HomeScreen.tsx (redesigned), …existing kept
  hooks/
    useAudio.ts              (extended: speak(text, lang?), sfx integration)
    useSfx.ts                (NEW: WebAudio synth)
    useDiscovery.ts          (existing keys kept; + planets store)
    useStickers.ts           (NEW)
```

- **Offline:** `countries-110m.json` (world-atlas) is bundled into the app (`public/`), no CDN at runtime. Fonts get local fallback (system font stack keeps Hebrew rendering if Google Fonts unreachable).
- **Dependencies added:** `three`, `topojson-client` (runtime); `vitest`, `@playwright/test`, `jsdom` (dev/test).
- **Storage keys:** existing `world-explorers-discoveries-*` kept; new: `-planets`, `world-explorers-stickers`, `world-explorers-languages`, `world-explorers-quiz`.
- **Performance targets:** globe ≥ 45fps on a 2020 mid-range Android; texture 3072×1536 canvas painted once + incremental repaints on discovery; total added JS ≤ ~700KB gzip.

## 12. Test plan (all automated)

1. **Unit (vitest):** data integrity — every country has a continent, valid details/flag/language ref; every language pack has 4 words with translit+meaning+ttsLang; planets well-formed; quiz pool/scoring logic; sticker unlock logic; discovery hook semantics.
2. **E2E (Playwright, bundled Chromium):** home renders Hebrew; navigate to each screen; 3D globe canvas gets WebGL context and paints; 2D map country click → bubble + counter increments + persists after reload; country card opens with words; solar-system planet tap → card; quiz round: correct answer scores; Israel city tap discovers; parental gate blocks reset; mute toggle persists.
3. **Build:** `tsc -b` clean, `vite build` clean, `eslint` clean, `cap sync android` clean, `gradlew assembleDebug` produces APK.
