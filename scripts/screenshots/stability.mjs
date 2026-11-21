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

await browser.close();
if (failures.length) {
  console.error(`${failures.length} stability check(s) failed`);
  process.exit(1);
}
