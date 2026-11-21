// Records the animated room headers into screenshots/*.gif (needs ffmpeg): one GIF per distinct scene, light and dark.
// Usage: npm install && npm run build && node scripts/screenshots/animations.mjs
// The CSS animations are paused and stepped frame by frame — each by a fraction of its own cycle — so every GIF loops
// cleanly whatever the machine's speed, and the same frames come out on every run.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { iconsFor, launch, render, root } from "./harness.mjs";
import { hass } from "./rooms.mjs";

const FPS = 20;
const SECONDS = 2;
const W = 480;
const BANNER = 90;

// Every decoded frame (RGBA) as ffmpeg's per-frame MD5 list: equal lists, same animation.
const decodedFrames = (file) =>
  execFileSync("ffmpeg", ["-loglevel", "error", "-i", file, "-pix_fmt", "rgba", "-f", "framemd5", "-"], { encoding: "utf8" })
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .join("\n");

// A deterministic GIF (palette from these frames only, ordered dithering, bit-exact muxing), replaced only when its
// decoded frames differ.
const encode = (dir, out) => {
  const gif = join(dir, "out.gif");
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(dir, "f%03d.png"),
    "-vf", `scale=${W}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
    "-fflags", "+bitexact", "-flags", "+bitexact", "-loop", "0", gif,
  ]);
  const target = `${root}${out}`;
  const same = existsSync(target) && decodedFrames(target) === decodedFrames(gif);
  if (!same) copyFileSync(gif, target);
  console.log(`${out}${same ? " (unchanged)" : ""}`);
};

// Steps every CSS animation (shadow roots included) to `frac` of its own cycle.
const step = (page, frac) =>
  page.evaluate((f) => {
    const walk = (node, out) => {
      for (const el of node.querySelectorAll("*")) {
        out.push(...el.getAnimations());
        if (el.shadowRoot) walk(el.shadowRoot, out);
      }
      return out;
    };
    for (const a of walk(document, [])) {
      a.pause();
      const d = a.effect.getComputedTiming().duration;
      if (Number.isFinite(d) && d > 0) a.currentTime = (3 + f) * d;
    }
  }, frac);

// The headers worth a GIF: each room scene the card draws, in the state that animates it.
export const ANIMATIONS = [
  ["banner-home", "home"], // the cutaway house, rooms lit and flagged
  ["banner-lights", "living_room"], // lamps glowing
  ["banner-sensors", "entrance"], // door left open, motion detected
  ["banner-humid", "bathroom"], // humidity above the threshold
  ["banner-air", "office"], // stale air (CO₂)
];

const direct = import.meta.url === `file://${process.argv[1]}`;
if (direct) {
  const icons = iconsFor();
  const browser = await launch();
  for (const theme of ["light", "dark"]) {
    for (const [name, room] of ANIMATIONS) {
      const file = `${name}${theme === "dark" ? "-dark" : ""}`;
      const { page, context } = await render(browser, { file, theme, w: W, h: 480, room }, hass, icons);
      const dir = mkdtempSync(join(tmpdir(), "wp-frames-"));
      const frames = FPS * SECONDS;
      for (let i = 0; i < frames; i++) {
        await step(page, i / frames);
        await page.screenshot({ path: join(dir, `f${String(i).padStart(3, "0")}.png`), clip: { x: 0, y: 0, width: W, height: BANNER } });
      }
      encode(dir, `screenshots/${file}.gif`);
      rmSync(dir, { recursive: true });
      await context.close();
    }
  }
  await browser.close();
}
