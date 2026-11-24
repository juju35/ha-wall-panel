// Builds src/ into the single Marketplace file dist/ha-wall-panel.js, stamping the package version.
// Usage: node scripts/build.mjs  (dist/ is not committed: CI and the release workflow build it)
// Everything sits in one block, so nothing leaks into the page (ha-room-card's scene names included).
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { splitDist } from "./i18n-split.mjs";
import { sourceOf } from "./bundle.mjs";

export const PARTS = ["i18n", "core", "scene", "cover-scene", "detect", "tiles", "render", "popups", "edit", "styles", "card", "editor", "strategy"];
const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(`${root}package.json`, "utf8"));
const src = (name) => sourceOf(name).replaceAll("__VERSION__", pkg.version);

const out = [`/*! ha-wall-panel v${pkg.version} — https://github.com/juju35/ha-wall-panel */`, "{", ...PARTS.map((p) => `// ── ${p}.js ──\n${src(p)}`), "}", ""].join("\n");

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  mkdirSync(`${root}dist`, { recursive: true });
  writeFileSync(`${root}dist/ha-wall-panel.js`, out);
  console.log(`Built dist/ha-wall-panel.js (${(out.length / 1024).toFixed(1)} KB)`);
  // English stays in the bundle, each other language goes to dist/ha-wall-panel.i18n.<lang>.js, fetched when needed.
  splitDist(`${root}dist`, "ha-wall-panel.js", { version: pkg.version });
}
