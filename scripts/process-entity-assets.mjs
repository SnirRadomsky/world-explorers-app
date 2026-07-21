/**
 * Process generated entity images into public/assets/entities.
 * Sources: Cursor project assets folder (AI-generated PNGs with magenta bg).
 * Outputs: chroma-keyed PNG sprites (512, palette).
 *
 * Run: npm run process:entities
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcDir = path.resolve(
  process.env.HOME,
  ".cursor/projects/Users-snirradomsky-workspace-world-explorers-app/assets"
);
const sprOut = path.join(root, "public/assets/entities/sprites");
fs.mkdirSync(sprOut, { recursive: true });

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  execSync(
    "npm install --no-save --legacy-peer-deps --registry=https://registry.npmjs.org sharp@0.35.3",
    { cwd: root, stdio: "inherit" }
  );
  sharp = require("sharp");
}

async function chromaKey(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const magenta = r > 180 && b > 180 && g < 120 && r + b > g * 2.4;
    const nearMag = r > 140 && b > 140 && g < 160 && r - g > 40 && b - g > 40;
    if (magenta || nearMag) data[i + 3] = 0;
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outputPath);
}

async function copySprite(name, destName) {
  const input = path.join(srcDir, name);
  if (!fs.existsSync(input)) {
    console.warn("missing sprite", name);
    return;
  }
  const out = path.join(sprOut, destName);
  const tmp = out + ".raw.png";
  await chromaKey(input, tmp);
  await sharp(tmp)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 80 })
    .toFile(out);
  fs.unlinkSync(tmp);
  console.log("sprite", destName, fs.statSync(out).size);
}

const sprites = [
  // animals
  ["animal-camel.png", "animal-camel.png"],
  ["animal-kangaroo.png", "animal-kangaroo.png"],
  ["animal-panda.png", "animal-panda.png"],
  ["animal-lion.png", "animal-lion.png"],
  ["animal-elephant.png", "animal-elephant.png"],
  ["animal-bear.png", "animal-bear.png"],
  ["animal-llama.png", "animal-llama.png"],
  ["animal-toucan.png", "animal-toucan.png"],
  ["animal-eagle.png", "animal-eagle.png"],
  ["animal-rooster.png", "animal-rooster.png"],
  ["animal-ibex.png", "animal-ibex.png"],
  ["animal-wolf.png", "animal-wolf.png"],
  ["animal-sheep.png", "animal-sheep.png"],
  ["animal-cow.png", "animal-cow.png"],
  ["animal-crane.png", "animal-crane.png"],
  ["animal-giraffe.png", "animal-giraffe.png"],
  ["animal-deer.png", "animal-deer.png"],
  ["animal-penguin.png", "animal-penguin.png"],
  // landmarks
  ["landmark-liberty.png", "landmark-liberty.png"],
  ["landmark-christ-redeemer.png", "landmark-christ-redeemer.png"],
  ["landmark-moai.png", "landmark-moai.png"],
  ["landmark-kotel.png", "landmark-kotel.png"],
  ["landmark-eiffel.png", "landmark-eiffel.png"],
  ["landmark-pyramid.png", "landmark-pyramid.png"],
  ["landmark-colosseum.png", "landmark-colosseum.png"],
  ["landmark-bigben.png", "landmark-bigben.png"],
  ["landmark-tajmahal.png", "landmark-tajmahal.png"],
  ["landmark-opera.png", "landmark-opera.png"],
  ["landmark-greatwall.png", "landmark-greatwall.png"],
  ["landmark-windmill.png", "landmark-windmill.png"],
  ["landmark-torii.png", "landmark-torii.png"],
  ["landmark-pisa.png", "landmark-pisa.png"],
  ["landmark-kremlin.png", "landmark-kremlin.png"],
  ["landmark-machu.png", "landmark-machu.png"],
  ["landmark-azrieli.png", "landmark-azrieli.png"],
  ["landmark-burj.png", "landmark-burj.png"],
  ["landmark-petra.png", "landmark-petra.png"],
  ["landmark-neuschwanstein.png", "landmark-neuschwanstein.png"],
  ["landmark-niagara.png", "landmark-niagara.png"],
  ["landmark-fuji.png", "landmark-fuji.png"],
  // land sights
  ["sight-deer.png", "sight-deer.png"],
  ["sight-castle.png", "sight-castle.png"],
  ["sight-windmill.png", "sight-windmill.png"],
  ["sight-waterfall.png", "sight-waterfall.png"],
  ["sight-volcano.png", "sight-volcano.png"],
  ["sight-balloons.png", "sight-balloons.png"],
  ["sight-sheep.png", "sight-sheep.png"],
  ["sight-snowman.png", "sight-snowman.png"],
  ["sight-farm.png", "sight-farm.png"],
  ["sight-ruins.png", "sight-ruins.png"],
  ["sight-tunnel.png", "sight-tunnel.png"],
  ["sight-train-station.png", "sight-train-station.png"],
  ["sight-city.png", "sight-city.png"],
  ["sight-island.png", "sight-island.png"],
  ["sight-cloud-castle.png", "sight-cloud-castle.png"],
];

for (const [src, dest] of sprites) await copySprite(src, dest);
console.log("Done → public/assets/entities/sprites");
