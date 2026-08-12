import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const assets = join(root, "assets");

cpSync(join(dist, "index.html"), join(root, "index.html"));
rmSync(assets, { recursive: true, force: true });
mkdirSync(assets, { recursive: true });
cpSync(join(dist, "assets"), assets, { recursive: true });
writeFileSync(join(root, ".nojekyll"), "");

for (const name of readdirSync(dist)) {
  if (name === "assets" || name === "index.html") continue;
  cpSync(join(dist, name), join(root, name), { recursive: true });
}

console.log("Published static site to repo root for GitHub Pages (legacy branch deploy).");
