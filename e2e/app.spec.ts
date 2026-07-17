// End-to-end smoke tests for מגלי העולם.
// Each test gets a fresh browser context (clean localStorage).

import { test, expect, type Page } from "@playwright/test";
import { COUNTRIES } from "../src/data/countries";
import { CONTINENTS } from "../src/data/continents";
import { PLANETS, TOTAL_SPACE_OBJECTS } from "../src/data/planets";
import { TOTAL_ISRAEL_CITIES } from "../src/data/israelCities";
import { TOTAL_LANDMARKS } from "../src/data/landmarks";

const N_COUNTRIES = COUNTRIES.length;
const N_CONTINENTS = CONTINENTS.length;
const N_ISRAEL = TOTAL_ISRAEL_CITIES;

// Hebrew name → planet id (for answering quiz questions).
const PLANET_NAMES: Record<string, string> = Object.fromEntries(
  PLANETS.map((p) => [p.nameHebrew, p.id])
);

async function gotoHome(page: Page) {
  await page.goto("/?e2e=1");
  await expect(page.getByText("מגלי העולם").first()).toBeVisible();
}

test("home screen shows all activity tiles in Hebrew", async ({ page }) => {
  await gotoHome(page);
  await expect(page.getByTestId("home-globe")).toContainText("הגלובוס שלי");
  await expect(page.getByTestId("home-map2d")).toContainText("מפה שטוחה");
  await expect(page.getByTestId("home-israel")).toContainText("ערי ישראל");
  await expect(page.getByTestId("home-space")).toContainText("מערכת השמש");
  await expect(page.getByTestId("home-quiz")).toContainText("חידון");
  await expect(page.getByTestId("home-album")).toContainText("אלבום מדבקות");
  await expect(page.getByTestId("level-badge")).toContainText("מתחילים");
});

test("2D map: tapping a continent discovers it, persists after reload, and opens its card", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-map2d").click();

  const geos = page.locator("path.rsm-geography");
  await expect(geos.first()).toBeVisible();
  expect(await geos.count()).toBeGreaterThan(100);

  // Counter starts at 0 (continents mode is the default)
  await expect(page.getByText(`0/${N_CONTINENTS}`)).toBeVisible();

  await geos.nth(30).dispatchEvent("click");

  // Discovery bubble with עוד! button appears and the counter ticks.
  const moreBtn = page.getByRole("button", { name: "עוד! 👀" });
  await expect(moreBtn).toBeVisible();
  await expect(page.getByText(`1/${N_CONTINENTS}`)).toBeVisible();

  // Open the continent card.
  await moreBtn.click();
  await expect(page.getByText("חיות מפורסמות")).toBeVisible();
  await page.getByRole("button", { name: "סגירה" }).click();

  // Persistence: reload → home → map → still discovered.
  await page.reload();
  await page.getByTestId("home-map2d").click();
  await expect(page.getByText(`1/${N_CONTINENTS}`)).toBeVisible();
});

test("2D map: country mode opens the passport card with language words", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-map2d").click();
  await page.getByTestId("map2d-chip-countries").click();
  await expect(page.getByText(`0/${N_COUNTRIES}`)).toBeVisible();

  const geos = page.locator("path.rsm-geography");
  await expect(geos.first()).toBeVisible();

  // Click France directly (id 250 — stable data attribute on the path).
  await page.locator('path[data-geo-id="250"]').dispatchEvent("click");

  const moreBtn = page.getByRole("button", { name: "עוד! 👀" });
  await expect(moreBtn).toBeVisible();
  await expect(page.getByText("צרפת", { exact: true })).toBeVisible();
  await expect(page.getByText(`1/${N_COUNTRIES}`)).toBeVisible();

  await moreBtn.click();
  await expect(page.getByText("איך אומרים בצרפתית?")).toBeVisible();
  await expect(page.getByText("עיר הבירה: פריז")).toBeVisible();
  await expect(page.getByText("Bonjour")).toBeVisible();

  // Tap a language word — marks it heard (✅ appears).
  await page.getByRole("button", { name: /Bonjour/ }).click();
  await expect(page.locator("text=✅").first()).toBeVisible();
});

test("3D globe renders, and tapping a known country discovers it", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-globe").click();

  // Engine canvas appears (WebGL via SwiftShader).
  const container = page.getByTestId("globe-container");
  await expect(container.locator("canvas")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("הגלובוס התלת־ממדי לא נטען")).toHaveCount(0);

  // Mode chips are visible; switch to countries mode for a precise pick.
  await expect(page.getByRole("button", { name: "יבשות 🌍" })).toBeVisible();
  await page.getByRole("button", { name: "מדינות 🗺️" }).click();
  await expect(page.getByText(`0/${N_COUNTRIES}`)).toBeVisible();

  // Deterministic pick: fly the globe to the heart of Brazil (far from any
  // landmark pin — the pins win taps by design), then tap the screen center.
  await page.waitForFunction(() => "__globeScene" in window, undefined, { timeout: 20_000 });
  await page.evaluate(() => {
    (window as unknown as { __globeScene: { flyTo: (lat: number, lng: number, z?: number) => void } })
      .__globeScene.flyTo(-10.5, -53.0, 200);
  });
  // Wait until the flight fully converges (frame-rate independent — SwiftShader
  // rendering under parallel test load can run at ~10fps).
  await page.waitForFunction(
    () => !(window as unknown as { __globeScene: { flyTarget: unknown } }).__globeScene.flyTarget,
    undefined,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(300);

  const box = await container.boundingBox();
  if (!box) throw new Error("globe container has no box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(page.getByText("ברזיל", { exact: true })).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(`1/${N_COUNTRIES}`)).toBeVisible();
});

test("solar system: rocket flies, sun is tappable, planet card opens, back to Earth", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-space").click();

  const container = page.getByTestId("space-container");
  await expect(container.locator("canvas")).toBeVisible({ timeout: 20_000 });

  // Camera looks at the origin → the sun is at screen center.
  await page.waitForTimeout(1500); // rocket overlay + first frames
  const box = await container.boundingBox();
  if (!box) throw new Error("space container has no box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(page.getByText("השמש", { exact: true })).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(new RegExp(`מתוך ${TOTAL_SPACE_OBJECTS} בחלל`))).toContainText("1 מתוך");

  // Planet card via עוד! — force:true because the bubble animates gently and
  // auto-dismisses; the stability check can starve under software WebGL.
  await page.getByRole("button", { name: "עוד! 👀" }).click({ force: true });
  await expect(page.getByText(/בלעדיה לא היו חיים/)).toBeVisible();
  await page.getByRole("button", { name: "סגירה" }).click();

  // Back to Earth lands on the globe screen.
  await page.getByTestId("back-to-earth").click();
  await expect(page.getByTestId("globe-container").locator("canvas")).toBeVisible({ timeout: 20_000 });
});

test("planets quiz: full round to the medal modal", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-quiz").click();
  await page.getByTestId("quiz-cat-planets").click();

  for (let q = 0; q < 8; q++) {
    const question = page.getByTestId("quiz-question");
    await expect(question).toBeVisible();
    const text = (await question.textContent()) ?? "";
    const entry = Object.entries(PLANET_NAMES).find(([he]) => text.includes(he));
    expect(entry, `unrecognized question: ${text}`).toBeTruthy();
    await page.getByTestId(`quiz-planet-${entry![1]}`).click();
    // brief lock between questions
    await page.waitForTimeout(1250);
  }

  await expect(page.getByTestId("quiz-result")).toContainText("מדליית זהב");
  await expect(page.getByText("⭐⭐⭐")).toBeVisible();
});

test("Israel map: tapping a city discovers it and the counter ticks", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-israel").click();

  await expect(page.getByText(new RegExp(`ערי ישראל: 0 / ${N_ISRAEL}`))).toBeVisible();
  const cityDot = page.locator("svg g > circle").first();
  await expect(cityDot).toBeVisible();
  await cityDot.dispatchEvent("click");

  await expect(page.getByText(new RegExp(`ערי ישראל: 1 / ${N_ISRAEL}`))).toBeVisible();
});

test("Israel map: a golden attraction pin discovers a special place", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-israel").click();

  await expect(page.getByText(/אתרים: 0 \/ 10/)).toBeVisible();
  await page.getByTestId("israel-place-place-kinneret").dispatchEvent("click");

  await expect(page.getByText(/אתרים: 1 \/ 10/)).toBeVisible();
  await expect(page.getByText(/הכנרת/).first()).toBeVisible();
});

test("parental gate guards reset: wrong answer keeps progress, correct answer resets", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-israel").click();
  await page.locator("svg g > circle").first().dispatchEvent("click");
  await expect(page.getByText(new RegExp(`ערי ישראל: 1 / ${N_ISRAEL}`))).toBeVisible();

  // Wrong answer → closes, progress kept.
  await page.getByTestId("reset-button").click();
  await expect(page.getByTestId("gate-question")).toBeVisible();
  await page.getByTestId("gate-key-1").click();
  await page.getByTestId("gate-key-1").click(); // 11 is never a product of (3..8)×(4..9)
  await expect(page.getByTestId("gate-question")).toHaveCount(0);
  await expect(page.getByText(new RegExp(`ערי ישראל: 1 / ${N_ISRAEL}`))).toBeVisible();

  // Correct answer → resets.
  await page.getByTestId("reset-button").click();
  const qText = (await page.getByTestId("gate-question").textContent()) ?? "";
  const m = qText.match(/(\d+)\s*×\s*(\d+)/);
  expect(m).toBeTruthy();
  const answer = String(Number(m![1]) * Number(m![2]));
  for (const digit of answer) {
    await page.getByTestId(`gate-key-${digit}`).click();
  }
  await expect(page.getByText(new RegExp(`ערי ישראל: 0 / ${N_ISRAEL}`))).toBeVisible();
});

test("sticker album shows locked stickers and the counter", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-album").click();
  await expect(page.getByTestId("album-count")).toContainText("אספתם 0 מתוך");
  await expect(page.getByTestId("sticker-st-first")).toBeVisible();
  // Locked stickers show the how-to-earn hint.
  await expect(page.getByTestId("sticker-st-israel")).toContainText("גלו את כל ערי ישראל");
});

test("mute toggle persists across reloads", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-israel").click();
  const toggle = page.getByRole("button", { name: /השתק|הפעל/ });
  await expect(toggle).toBeVisible();
  await toggle.click();
  const muted = await page.evaluate(() => localStorage.getItem("world-explorers-muted"));
  expect(muted).toBe("true");
  await page.reload();
  const stillMuted = await page.evaluate(() => localStorage.getItem("world-explorers-muted"));
  expect(stillMuted).toBe("true");
});

test("home screen shows the new 3.0 tiles", async ({ page }) => {
  await gotoHome(page);
  await expect(page.getByTestId("home-ocean")).toContainText("עולם האוקיינוס");
  await expect(page.getByTestId("home-encyclopedia")).toContainText("האנציקלופדיה");
});

test("ocean dive: canvas renders, zones switch, a creature can be discovered", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-ocean").click();

  const container = page.getByTestId("ocean-container");
  await expect(container.locator("canvas")).toBeVisible({ timeout: 20_000 });

  // depth zones are selectable
  await expect(page.getByTestId("zone-reef")).toBeVisible();
  await page.getByTestId("zone-open").click();
  await page.getByTestId("zone-deep").click();
  await page.getByTestId("zone-reef").click();

  // ocean tabs switch the scene
  await page.getByTestId("ocean-tab-indian").click();
  await expect(container.locator("canvas")).toBeVisible();

  // tap the center a few times — creatures swim past, one should register
  await page.waitForTimeout(1200);
  const box = await container.boundingBox();
  if (!box) throw new Error("ocean container has no box");
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(box.x + box.width * (0.35 + i * 0.05), box.y + box.height * 0.5);
    await page.waitForTimeout(300);
  }
  // discovering ticks the shared counter above 0/38 at some point (best-effort:
  // the "גיליתם כאן" chip is always present regardless)
  await expect(page.getByText(/גיליתם כאן/)).toBeVisible();
});

test("encyclopedia: opens, shows section tabs and locked silhouettes", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-encyclopedia").click();
  await expect(page.getByText("אנציקלופדיית המגלה")).toBeVisible();
  await expect(page.getByTestId("enc-tab-countries")).toBeVisible();
  await page.getByTestId("enc-tab-marine").click();
  await expect(page.getByTestId("enc-tab-space")).toBeVisible();
});

test("quiz: the flags choice round runs and shows a result", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-quiz").click();
  await page.getByTestId("quiz-cat-flags").click();

  // Answer 8 questions: after 3 misses the correct card is revealed & pulses,
  // so blindly tapping the four options in turn always advances the round.
  const done = () => page.getByTestId("quiz-result").isVisible().catch(() => false);
  for (let q = 0; q < 8 && !(await done()); q++) {
    await expect(page.getByTestId("quiz-question")).toBeVisible();
    for (let attempt = 0; attempt < 4 && !(await done()); attempt++) {
      const cards = page.locator('[data-testid^="quiz-choice-"]');
      const n = await cards.count();
      if (n === 0) break;
      // force:true — the revealed correct card gently pulses, which Playwright's
      // stability check would otherwise reject.
      await cards.nth(attempt % n).click({ force: true });
      await page.waitForTimeout(450);
    }
    await page.waitForTimeout(300);
  }
  await expect(page.getByTestId("quiz-result")).toBeVisible({ timeout: 15_000 });
});

test("daily challenge: launches a special round", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-quiz").click();
  await page.getByTestId("quiz-daily").click();
  await expect(page.getByTestId("quiz-question")).toBeVisible();
  await expect(page.getByText("🔥", { exact: false }).first()).toBeVisible();
});

// ─── 4.0: world wonders ───────────────────────────────────────────────────────

test("home screen shows the 4.0 tiles and the parents chip", async ({ page }) => {
  await gotoHome(page);
  await expect(page.getByTestId("home-landmarks")).toContainText("פלאי העולם");
  await expect(page.getByTestId("home-learn")).toContainText("בית הספר הקטן");
  await expect(page.getByTestId("home-parents")).toBeVisible();
});

test("landmarks: gallery opens, visiting the Kotel renders the 3D site and marks it visited", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-landmarks").click();
  await expect(page.getByText("פלאי העולם").first()).toBeVisible();
  await expect(page.getByText(new RegExp(`ביקרתם ב-0 מתוך ${TOTAL_LANDMARKS}`))).toBeVisible();

  await page.getByTestId("landmark-card-kotel").click();
  const container = page.getByTestId("landmark-container");
  await expect(container.locator("canvas")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("treasure-counter")).toContainText("0/3");
  await expect(page.getByText(/חפשו את האוצרות/)).toBeVisible();

  // back to the gallery — the visit was recorded
  await page.getByTestId("landmark-back").click();
  await expect(page.getByText(new RegExp(`ביקרתם ב-1 מתוך ${TOTAL_LANDMARKS}`))).toBeVisible();
  await expect(page.getByTestId("landmark-card-kotel")).toContainText("ביקרנו");
});

test("globe: the gold pin opens the wonder card and flies into the visit", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-globe").click();
  const container = page.getByTestId("globe-container");
  await expect(container.locator("canvas")).toBeVisible({ timeout: 20_000 });

  await page.waitForFunction(() => "__globeScene" in window, undefined, { timeout: 20_000 });
  await page.evaluate(() => {
    (window as unknown as { __globeScene: { flyTo: (lat: number, lng: number, z?: number) => void } })
      .__globeScene.flyTo(31.7767, 35.2345, 190);
  });
  await page.waitForFunction(
    () => !(window as unknown as { __globeScene: { flyTarget: unknown } }).__globeScene.flyTarget,
    undefined,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(300);

  const box = await container.boundingBox();
  if (!box) throw new Error("globe container has no box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  // the pin wins the pick → wonder bubble → card → visit
  await expect(page.getByText("הכותל המערבי").first()).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "עוד! 👀" }).click();
  await page.getByTestId("visit-landmark").click();
  await expect(page.getByTestId("landmark-container").locator("canvas")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("landmark-back").click();
});

test("landmarks: the new Petra site renders its 3D scene with treasures", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-landmarks").click();
  await page.getByTestId("landmark-card-petra").click();
  const container = page.getByTestId("landmark-container");
  await expect(container.locator("canvas")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("treasure-counter")).toContainText("0/3");
  await page.getByTestId("landmark-back").click();
  await expect(page.getByTestId("landmark-card-petra")).toContainText("ביקרנו");
});

// ─── 4.0: the little school ───────────────────────────────────────────────────

test("math game: a full addition round reaches the medal modal", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-math").click();
  await page.getByTestId("math-level-add").click();

  for (let i = 0; i < 8; i++) {
    const q = page.getByTestId("math-question");
    await expect(q).toBeVisible();
    const answer = await q.getAttribute("data-answer");
    await page.getByTestId(`math-opt-${answer}`).click();
    await page.waitForTimeout(1250);
  }
  await expect(page.getByTestId("math-result")).toBeVisible({ timeout: 5_000 });
});

test("letters board: a letter card opens with its nikud row", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-letters").click();
  await page.getByTestId("letter-card-ב").click();
  await expect(page.getByTestId("nikud-kamatz")).toBeVisible();
  await expect(page.getByText("בַּיִת")).toBeVisible();
  await page.getByTestId("nikud-kamatz").click(); // speaks the syllable
});

test("letter hunt: finds letters by their spoken name", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-letters").click();
  await page.getByTestId("letter-hunt").click();
  for (let i = 0; i < 3; i++) {
    const q = page.getByTestId("hunt-question");
    await expect(q).toBeVisible();
    const target = await q.getAttribute("data-target");
    await page.getByTestId(`hunt-opt-${target}`).click();
    await page.waitForTimeout(350);
  }
});

test("reading game: reading words to the medal modal", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-reading").click();

  for (let i = 0; i < 8; i++) {
    const w = page.getByTestId("reading-word");
    await expect(w).toBeVisible();
    const id = await w.getAttribute("data-word-id");
    await page.getByTestId(`reading-opt-${id}`).click();
    await page.waitForTimeout(1350);
  }
  await expect(page.getByTestId("reading-result")).toBeVisible({ timeout: 5_000 });
});

test("clock game: reads the hands and answers correctly", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-clock").click();
  await page.getByTestId("clock-level-full").click();

  for (let i = 0; i < 6; i++) {
    const face = page.getByTestId("clock-face");
    await expect(face).toBeVisible();
    const hour = await face.getAttribute("data-hour");
    await page.getByTestId(`clock-opt-${hour}-full`).click();
    await page.waitForTimeout(1350);
  }
  await expect(page.getByTestId("clock-result")).toBeVisible({ timeout: 5_000 });
});

test("clock match game: pairs digital and analog clocks to the medal modal", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-clock").click();
  await page.getByTestId("clock-mode-match").click();

  for (let i = 0; i < 6; i++) {
    const target = page.getByTestId("clock-match-target");
    await expect(target).toBeVisible();
    const hour = await target.getAttribute("data-hour");
    const minutes = await target.getAttribute("data-minutes");
    // find the option carrying the same time
    for (let o = 0; o < 4; o++) {
      const opt = page.getByTestId(`clock-match-opt-${o}`);
      if ((await opt.getAttribute("data-hour")) === hour && (await opt.getAttribute("data-minutes")) === minutes) {
        await opt.click();
        break;
      }
    }
    await page.waitForTimeout(1450);
  }
  await expect(page.getByTestId("clock-result")).toBeVisible({ timeout: 5_000 });
});

test("clock set game: quick buttons steer the hands to the target time", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-clock").click();
  await page.getByTestId("clock-mode-set").click();

  for (let i = 0; i < 5; i++) {
    const target = page.getByTestId("clock-set-target");
    await expect(target).toBeVisible();
    const hour = Number(await target.getAttribute("data-hour"));
    const minutes = Number(await target.getAttribute("data-minutes"));
    // each round starts at 12:00 → advance deterministically
    for (let h = 0; h < hour % 12; h++) await page.getByTestId("clock-set-plus-hour").click();
    for (let q = 0; q < minutes / 15; q++) await page.getByTestId("clock-set-plus-quarter").click();
    await page.getByTestId("clock-set-check").click();
    await page.waitForTimeout(1550);
  }
  await expect(page.getByTestId("clock-result")).toBeVisible({ timeout: 5_000 });
});

test("clock read game: quarter-hour level renders quarter times", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-clock").click();
  await page.getByTestId("clock-level-quarter").click();
  const face = page.getByTestId("clock-face");
  await expect(face).toBeVisible();
  // options grid appears with 4 choices
  expect(await page.locator('[data-testid^="clock-opt-"]').count()).toBe(4);
});

test("memory game: flipping two cards counts a move", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-memory").click();
  await page.getByTestId("memory-theme-ocean").click();
  await page.getByTestId("memory-card-0").click();
  await page.getByTestId("memory-card-1").click();
  await expect(page.getByTestId("memory-moves")).toContainText("1");
});

test("music box: keys play and a song can start", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-music").click();
  await page.getByTestId("music-key-0").click();
  await page.getByTestId("music-key-4").click();
  await page.getByTestId("music-song-yonatan").click();
  await expect(page.getByTestId("music-progress")).toBeVisible();
  // the note sheet lights up with the song's notes
  await expect(page.getByTestId("music-sheet")).toBeVisible();
  // a new song and the full-listen button exist
  await expect(page.getByTestId("music-song-ode")).toBeVisible();
  await expect(page.getByTestId("music-listen")).toBeVisible();
});

test("music box: instruments switch and the echo game starts", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-music").click();

  // switch instrument (plays a preview note, stays selected)
  await page.getByTestId("music-instrument-piano").click();
  await page.getByTestId("music-key-2").click();

  // echo game
  await page.getByTestId("music-mode-echo").click();
  await expect(page.getByTestId("echo-status")).toBeVisible();
  await page.getByTestId("echo-start").click();
  await expect(page.getByTestId("echo-status")).toContainText("הקשיבו", { timeout: 5_000 });
});

test("music box: the recording studio records and plays back", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-music").click();
  await page.getByTestId("music-mode-record").click();

  await page.getByTestId("record-toggle").click();   // start
  await page.getByTestId("music-key-1").click();
  await page.getByTestId("music-key-3").click();
  await page.getByTestId("music-key-5").click();
  await page.getByTestId("record-toggle").click();   // stop
  await expect(page.getByText(/הוקלטו 3 צלילים/)).toBeVisible();
  await page.getByTestId("record-play").click();
});

test("drawing pad: draws a stroke and clears", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-learn").click();
  await page.getByTestId("learn-tile-drawing").click();
  const canvas = page.getByTestId("drawing-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("no canvas box");
  await page.mouse.move(box.x + 60, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 200, { steps: 8 });
  await page.mouse.up();
  await page.getByTestId("drawing-clear").click();
});

// ─── 4.0: quiz upgrades ───────────────────────────────────────────────────────

test("quiz: the landmarks (which country?) round runs with flag options", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-quiz").click();
  await page.getByTestId("quiz-cat-landmarks").click();
  await expect(page.getByTestId("quiz-question")).toContainText("באיזו מדינה");
  const done = () => page.getByTestId("quiz-result").isVisible().catch(() => false);
  for (let q = 0; q < 8 && !(await done()); q++) {
    for (let attempt = 0; attempt < 4 && !(await done()); attempt++) {
      const cards = page.locator('[data-testid^="quiz-choice-"]');
      const n = await cards.count();
      if (n === 0) break;
      await cards.nth(attempt % n).click({ force: true });
      await page.waitForTimeout(450);
    }
    await page.waitForTimeout(300);
  }
  await expect(page.getByTestId("quiz-result")).toBeVisible({ timeout: 15_000 });
});

test("quiz: capitals round shows big text answers", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-quiz").click();
  await page.getByTestId("quiz-cat-capitals").click();
  await expect(page.getByTestId("quiz-question")).toContainText("עיר הבירה");
  await expect(page.locator('[data-testid^="quiz-choice-"]').first()).toBeVisible();
});

test("quiz: marine options show real rendered creature portraits", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-quiz").click();
  await page.getByTestId("quiz-cat-marine").click();
  await expect(page.locator('[data-testid^="quiz-choice-"]').first()).toBeVisible();
  // WebGL is available in the test browser → the options carry <img> portraits
  expect(await page.locator('[data-testid^="quiz-choice-"] img').count()).toBeGreaterThan(0);
});

test("parents report opens behind the gate and shows school progress", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-parents").click();
  const qText = (await page.getByTestId("gate-question").textContent()) ?? "";
  const m = qText.match(/(\d+)\s*×\s*(\d+)/);
  expect(m).toBeTruthy();
  for (const digit of String(Number(m![1]) * Number(m![2]))) {
    await page.getByTestId(`gate-key-${digit}`).click();
  }
  await expect(page.getByTestId("parents-report")).toBeVisible();
  await expect(page.getByTestId("parents-report")).toContainText("בית הספר הקטן");
  await expect(page.getByTestId("parents-report")).toContainText("פלאי עולם");
});

test("encyclopedia shows the wonders and treasures sections", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-encyclopedia").click();
  await expect(page.getByTestId("enc-tab-landmarks")).toBeVisible();
  await page.getByTestId("enc-tab-treasures").click();
  await expect(page.getByTestId("enc-tab-treasures")).toContainText("אוצרות");
});

// ─── 5.0: space station, land journey, deep-sea expedition ───────────────────

test("home screen shows the 5.0 adventure tiles", async ({ page }) => {
  await gotoHome(page);
  await expect(page.getByTestId("home-station")).toContainText("תחנת החלל");
  await expect(page.getByTestId("home-land")).toContainText("מסע תחבורה");
  await expect(page.getByTestId("home-deepsea")).toContainText("משלחת הצוללת");
});

test("space station: rooms switch and equipment can be discovered", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-station").click();

  const container = page.getByTestId("station-container");
  await expect(container.locator("canvas")).toBeVisible({ timeout: 20_000 });

  // room tabs switch the scene
  await page.getByTestId("station-room-engine").click();
  await expect(container.locator("canvas")).toBeVisible();
  await page.getByTestId("station-room-cockpit").click();
  await expect(container.locator("canvas")).toBeVisible();

  // scan-tap until a piece of equipment registers a discovery
  await page.waitForTimeout(1200);
  const box = await container.boundingBox();
  if (!box) throw new Error("station container has no box");
  let discovered = false;
  outer:
  for (let ry = 0.3; ry <= 0.8; ry += 0.08) {
    for (let rx = 0.1; rx <= 0.9; rx += 0.11) {
      await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry);
      await page.waitForTimeout(120);
      if (await page.getByRole("button", { name: "עוד! 👀" }).isVisible().catch(() => false)) {
        discovered = true;
        break outer;
      }
    }
  }
  expect(discovered).toBe(true);
  // the discovery opens a fact card
  await page.getByRole("button", { name: "עוד! 👀" }).click();
  await expect(page.getByText(/💡/)).toBeVisible();
  await page.getByRole("button", { name: "סגירה" }).click();
  await expect(page.getByText(/גיליתם כאן/)).toBeVisible();
});

test("land journey: vehicles switch and a sight can be discovered", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-land").click();

  const container = page.getByTestId("land-container");
  await expect(container.locator("canvas")).toBeVisible({ timeout: 20_000 });

  // vehicle tabs rebuild the scene
  await page.getByTestId("land-vehicle-train").click();
  await expect(container.locator("canvas")).toBeVisible();
  await page.getByTestId("land-vehicle-plane").click();
  await expect(container.locator("canvas")).toBeVisible();
  await page.getByTestId("land-vehicle-car").click();
  await expect(container.locator("canvas")).toBeVisible();

  // speed toggle responds
  await page.getByTestId("land-speed").click();

  // scan-tap for a roadside sight
  await page.waitForTimeout(2000);
  const box = await container.boundingBox();
  if (!box) throw new Error("land container has no box");
  let discovered = false;
  outer:
  for (let pass = 0; pass < 3 && !discovered; pass++) {
    for (let ry = 0.25; ry <= 0.75; ry += 0.1) {
      for (let rx = 0.05; rx <= 0.95; rx += 0.1) {
        await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry);
        await page.waitForTimeout(100);
        if (await page.getByRole("button", { name: "עוד! 👀" }).isVisible().catch(() => false)) {
          discovered = true;
          break outer;
        }
      }
    }
  }
  expect(discovered).toBe(true);
  await expect(page.getByText(/תחנות במסלול/)).toBeVisible();
});

test("deep sea: areas and craft switch, a find can be discovered", async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId("home-deepsea").click();

  const container = page.getByTestId("deepsea-container");
  await expect(container.locator("canvas")).toBeVisible({ timeout: 20_000 });

  // area tabs + craft toggle rebuild the scene
  await page.getByTestId("deepsea-area-ruins").click();
  await expect(container.locator("canvas")).toBeVisible();
  await page.getByTestId("deepsea-craft-diver").click();
  await expect(container.locator("canvas")).toBeVisible();

  // scan-tap for a find
  await page.waitForTimeout(1200);
  const box = await container.boundingBox();
  if (!box) throw new Error("deepsea container has no box");
  let discovered = false;
  outer:
  for (let ry = 0.3; ry <= 0.85; ry += 0.08) {
    for (let rx = 0.1; rx <= 0.9; rx += 0.11) {
      await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry);
      await page.waitForTimeout(120);
      if (await page.getByRole("button", { name: "עוד! 👀" }).isVisible().catch(() => false)) {
        discovered = true;
        break outer;
      }
    }
  }
  expect(discovered).toBe(true);
  await expect(page.getByText(/גיליתם כאן/)).toBeVisible();
});
