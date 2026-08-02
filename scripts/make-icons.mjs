import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const svg = readFileSync(resolve("public/icons/icon.svg"));

const sizes = [180, 192, 512];

for (const size of sizes) {
  const name = size === 180 ? "apple-touch-icon" : `icon-${size}`;
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(resolve(`public/icons/${name}.png`));
  console.log(`public/icons/${name}.png (${size}x${size})`);
}

const MASKABLE_SAFE_RATIO = 0.8;
await sharp(svg, { density: 300 })
  .resize(512, 512)
  .extend({
    top: Math.round((512 * (1 - MASKABLE_SAFE_RATIO)) / 2),
    bottom: Math.round((512 * (1 - MASKABLE_SAFE_RATIO)) / 2),
    left: Math.round((512 * (1 - MASKABLE_SAFE_RATIO)) / 2),
    right: Math.round((512 * (1 - MASKABLE_SAFE_RATIO)) / 2),
    background: { r: 36, g: 48, b: 38, alpha: 1 },
  })
  .png()
  .toFile(resolve("public/icons/icon-512-maskable.png"));
console.log("public/icons/icon-512-maskable.png (512x512)");
