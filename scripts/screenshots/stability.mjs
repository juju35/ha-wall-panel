// Regression check, run with the screenshots (it needs the browser): a hass update that changes nothing shown makes
// no DOM change, one that changes a tile patches it in place (no node replaced, the screen keeps its height), and a
// tap whose press and release straddle an update still toggles. Exits 1 on failure.
// Usage: npm run build && node scripts/screenshots/stability.mjs
import { launch, render } from "./harness.mjs";
import { hass } from "./rooms.mjs";

const browser = await launch();
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok" : "FAIL"} — ${what}`);
  if (!ok) failures.push(what);
};

for (const [label, room, w, h] of [
  ["square, living room", "living_room", 480, 480],
  ["landscape, office", "office", 720, 360],
  ["square, home", "home", 480, 480],
]) {
  const { page, context } = await render(browser, { file: label, theme: "light", w, h, room }, hass);
  const r = await page.evaluate(async () => {
    const el = document.querySelector("wall-panel-card");
    const sr = el.shadowRoot;
    const tiles = [...sr.querySelectorAll(".body [data-id], .body [data-room]")];
    let mutations = 0;
    let removed = 0;
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        mutations++;
        for (const n of m.removedNodes) if (n.nodeType === 1) removed++;
      }
    });
    mo.observe(sr, { subtree: true, childList: true, attributes: true, characterData: true });
    const heights = new Set();
    let run = true;
    const frame = () => {
      heights.add(el.getBoundingClientRect().height);
      if (run) requestAnimationFrame(frame);
    };
    frame();
    const settle = () => new Promise((res) => setTimeout(res, 50));
    const update = (patch) => {
      const h = el._hass;
      el.hass = { ...h, states: { ...h.states, ...patch(h.states) } };
    };
    for (let i = 0; i < 10; i++) {
      update(() => ({ "sensor.outside_world": { entity_id: "sensor.outside_world", state: String(i), attributes: {} } }));
      await settle();
    }
    const unrelated = mutations;
    for (let i = 0; i < 10; i++) {
      update((s) => ({
        "light.living_room_ceiling": { ...s["light.living_room_ceiling"], attributes: { ...s["light.living_room_ceiling"].attributes, brightness: 100 + i * 10 } },
        "sensor.office_pc_plug_power": { ...s["sensor.office_pc_plug_power"], state: String(140 + i) },
        "light.office_desk_lamp": { ...s["light.office_desk_lamp"], state: i % 2 ? "on" : "off" },
      }));
      await settle();
    }
    run = false;
    mo.disconnect();
    const same = tiles.every((t) => t.isConnected);
    return { unrelated, relevant: mutations - unrelated, removed, same, heights: [...heights] };
  });
  check(r.unrelated === 0, `${label}: unrelated updates change nothing (${r.unrelated} mutations)`);
  check(r.removed === 0 && r.same, `${label}: relevant updates patch in place (${r.removed} nodes removed)`);
  check(r.heights.length === 1, `${label}: steady height (${r.heights.join(", ")})`);
  await context.close();
}

{
  const { page, context } = await render(browser, { file: "tap", theme: "light", w: 480, h: 480, room: "office" }, hass);
  const at = await page.evaluate(() => {
    const el = document.querySelector("wall-panel-card");
    el._calls = [];
    el._hass = { ...el._hass, callService: async (d, s) => el._calls.push(`${d}.${s}`) };
    const r = el.shadowRoot.querySelector('[data-id="switch.office_pc_plug"]').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.evaluate(() => {
    const el = document.querySelector("wall-panel-card");
    const h = el._hass;
    el.hass = { ...h, states: { ...h.states, "sensor.office_pc_plug_power": { ...h.states["sensor.office_pc_plug_power"], state: "151" } } };
  });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const calls = await page.evaluate(() => document.querySelector("wall-panel-card")._calls);
  check(calls.includes("homeassistant.toggle"), "a tap across an update still toggles");
  await context.close();
}

// Every room in view on the home screen (7 rooms; a 360 × 360 screen scrolls, 64 px tiles do not fit 4 rows there); four columns and 128 px rows on a large landscape.
for (const [label, w, h] of [
  ["square 480", 480, 480],
  ["landscape 720 × 360", 720, 360],
  ["portrait 360 × 720", 360, 720],
  ["large landscape 1440 × 720", 1440, 720],
]) {
  const { page, context } = await render(browser, { file: label, theme: "light", w, h, room: "home" }, hass);
  const r = await page.evaluate(() => {
    const sr = document.querySelector("wall-panel-card").shadowRoot;
    const body = sr.querySelector(".body").getBoundingClientRect();
    const tiles = [...sr.querySelectorAll(".tile.room")].map((t) => t.getBoundingClientRect());
    const chips = [...sr.querySelectorAll(".chip")].map((c) => c.getBoundingClientRect().height);
    return { hidden: tiles.filter((t) => t.bottom > body.bottom + 0.5).length, n: tiles.length, minH: Math.min(...tiles.map((t) => t.height)), chips };
  });
  check(r.hidden === 0 && r.minH >= 64, `${label}: all ${r.n} rooms in view on the home screen (${r.hidden} below the fold, rows ${Math.round(r.minH)} px)`);
  check(r.chips.length > 0 && r.chips.every((c) => c >= 48), `${label}: alerts as chips of 48 px or more`);
  await context.close();
}
{
  const { page, context } = await render(browser, { file: "wide", theme: "light", w: 1440, h: 720, room: "living_room" }, hass);
  const r = await page.evaluate(() => {
    const sr = document.querySelector("wall-panel-card").shadowRoot;
    const g = sr.querySelector(".body .grid");
    return { c4: g.classList.contains("c4"), row: g.style.getPropertyValue("--row"), wide: sr.querySelector(".scr").classList.contains("wide") };
  });
  check(r.c4 && r.wide && r.row === "128px", `large landscape: 4 columns, 128 px rows (${r.row})`);
  await context.close();
}

// Night screensaver: shows after the idle delay with the dark theme, not with the light one; a tap wakes it and runs
// nothing underneath; then the panel works as before.
for (const theme of ["dark", "light"]) {
  const { page, context } = await render(browser, { file: `saver-${theme}`, theme, w: 480, h: 480, room: "office", config: { idle_return: 1, start_room: "office" } }, hass);
  await page.evaluate(() => {
    const el = document.querySelector("wall-panel-card");
    el._calls = [];
    el._hass = { ...el._hass, callService: async (d, s) => el._calls.push(`${d}.${s}`) };
    el._resetIdle();
  });
  await page.waitForTimeout(1400);
  const shown = await page.evaluate(() => !!document.querySelector("wall-panel-card").shadowRoot.querySelector(".saver"));
  if (theme === "light") {
    check(!shown, "screensaver: none with the light theme");
    await context.close();
    continue;
  }
  check(shown, "screensaver: shown after the idle delay with the dark theme");
  const at = await page.evaluate(() => {
    const r = document.querySelector("wall-panel-card").shadowRoot.querySelector('[data-id="switch.office_pc_plug"]').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => {
    const el = document.querySelector("wall-panel-card");
    return { saver: !!el.shadowRoot.querySelector(".saver"), calls: [...el._calls] };
  });
  check(!after.saver && after.calls.length === 0, `screensaver: a tap wakes it and runs nothing (${after.calls.join(", ") || "no call"})`);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(100);
  const calls = await page.evaluate(() => document.querySelector("wall-panel-card")._calls);
  check(calls.includes("homeassistant.toggle"), "screensaver: the next tap works as usual");
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error(`${failures.length} stability check(s) failed`);
  process.exit(1);
}
