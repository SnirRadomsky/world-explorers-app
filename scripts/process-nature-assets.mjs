/**
 * Process generated nature images into public/assets/nature.
 * Sources: Cursor project assets folder (AI-generated PNGs).
 * Outputs: JPEG grounds + chroma-keyed PNG sprites.
 *
 * Run: npm run process:nature
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
const texOut = path.join(root, "public/assets/nature/textures");
const sprOut = path.join(root, "public/assets/nature/sprites");
fs.mkdirSync(texOut, { recursive: true });
fs.mkdirSync(sprOut, { recursive: true });

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  execSync("npm install --save-dev sharp", { cwd: root, stdio: "inherit" });
  sharp = require("sharp");
}

async function chromaKey(inputPath, outputPath, { keyWhite = false } = {}) {
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
    let kill = magenta || nearMag;
    if (keyWhite) {
      const white = r > 235 && g > 235 && b > 235;
      const nearWhite =
        r > 220 && g > 215 && b > 210 && Math.abs(r - g) < 20 && Math.abs(g - b) < 25;
      kill = kill || white || nearWhite;
    }
    if (kill) data[i + 3] = 0;
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outputPath);
}

async function copyTex(name, destName) {
  const src = path.join(srcDir, name);
  const dest = path.join(texOut, destName);
  if (!fs.existsSync(src)) {
    console.warn("missing texture", name);
    return;
  }
  await sharp(src).resize(512, 512, { fit: "cover" }).jpeg({ quality: 78, mozjpeg: true }).toFile(dest);
  console.log("texture", destName, fs.statSync(dest).size);
}

async function copySprite(name, destName, keyWhite = false) {
  const input = path.join(srcDir, name);
  if (!fs.existsSync(input)) {
    console.warn("missing sprite", name);
    return;
  }
  const out = path.join(sprOut, destName);
  const tmp = out + ".raw.png";
  await chromaKey(input, tmp, { keyWhite });
  await sharp(tmp)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 80 })
    .toFile(out);
  fs.unlinkSync(tmp);
  console.log("sprite", destName, fs.statSync(out).size);
}

// Geography-specific gens (Cursor assets/). Shared packs already live in public/
// from the tanach bootstrap; this script only refreshes newly generated files.
const textures = [
  ["ground-snow.png", "ground-snow.jpg"],
  ["ground-savanna.png", "ground-savanna.jpg"],
  ["ground-reef.png", "ground-reef.jpg"],
];

const sprites = [
  ["tree-acacia.png", "tree-acacia.png", false],
  ["tree-cherry.png", "tree-cherry.png", false],
  ["tree-cypress.png", "tree-cypress.png", false],
  ["cactus.png", "cactus.png", false],
  ["coral-cluster.png", "coral-cluster.png", false],
  ["kelp-seaweed.png", "kelp-seaweed.png", false],
  ["ice-rock.png", "ice-rock.png", false],
];

for (const [src, dest] of textures) await copyTex(src, dest);
for (const [src, dest, keyWhite] of sprites) await copySprite(src, dest, keyWhite);

console.log("Done → public/assets/nature/{textures,sprites}");
