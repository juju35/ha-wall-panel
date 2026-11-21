// Every file in screenshots/ is one the screenshot script renders: orphans are reported (a capture listed but not
// yet on disk is fine — the Screenshots workflow renders it on the pull request).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

test("no orphan screenshot", () => {
  const script = readFileSync(new URL("../scripts/screenshots/rooms.mjs", import.meta.url), "utf8");
  const listed = new Set();
  for (const m of script.matchAll(/pair\(\s*[`"]([^`"]+)[`"]/g)) listed.add(m[1]);
  for (const r of ["living_room", "kitchen", "bedroom", "kids_room", "bathroom", "entrance", "office"]) listed.add(`square-${r.replace("_room", "").replace("_", "-")}`);
  for (const n of ["banner-home", "banner-lights", "banner-sensors", "banner-humid", "banner-air"]) listed.add(n);
  const files = readdirSync(new URL("../screenshots/", import.meta.url)).filter((f) => f.endsWith(".png") || f.endsWith(".gif"));
  const orphans = files.filter((f) => !listed.has(f.replace(/(-dark)?\.(png|gif)$/, "")));
  assert.deepEqual(orphans, []);
});
