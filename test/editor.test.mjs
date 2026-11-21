import assert from "node:assert/strict";
import { test } from "node:test";
import { load } from "./load.mjs";

const W = load();
const Editor = W.customElements.get("wall-panel-card-editor");

const changed = (config, value) => {
  const ed = new Editor();
  ed._config = { ...config };
  let out;
  ed.dispatchEvent = (e) => {
    out = e.detail.config;
  };
  ed._changed(value);
  return JSON.parse(JSON.stringify(out));
};

test("the form keeps the YAML-only options and leaves defaults out", () => {
  const rooms = { living_room: { hide: ["light.a"] } };
  const out = changed(
    { type: "custom:wall-panel-card", rooms, areas: ["living_room"] },
    { navigation: "left", kiosk: true, idle_return: 120, hero: "none", illustration_theme: "auto", text_size: "large" },
  );
  assert.deepEqual(out, { type: "custom:wall-panel-card", rooms, areas: ["living_room"], navigation: "left", hero: false, text_size: "large" });
});

test("a per-layout navigation is not flattened by the form", () => {
  const nav = { landscape: "bottom" };
  assert.deepEqual(changed({ navigation: nav }, { navigation: "auto" }).navigation, nav);
  assert.equal(changed({ navigation: nav }, { navigation: "left" }).navigation, "left");
});

test("animations and pixel_shift: in the form, written only when turned off", () => {
  assert.deepEqual(changed({}, { animations: false, pixel_shift: true }), { animations: false });
  assert.deepEqual(changed({ animations: false }, { animations: true }), {});
});

test("language and height: in the form; auto and empty leave them out", () => {
  assert.deepEqual(changed({ language: "fr" }, { language: "auto", height: "" }), {});
  assert.deepEqual(changed({}, { language: "de", height: "600px" }), { language: "de", height: "600px" });
});

test("screensaver and show_empty_areas: off is false, defaults stay out", () => {
  assert.deepEqual(changed({}, { screensaver: "off", show_empty_areas: false }), { screensaver: false });
  assert.deepEqual(changed({ screensaver: false }, { screensaver: "night", show_empty_areas: true }), { show_empty_areas: true });
});
