import assert from "node:assert/strict";
import { test } from "node:test";
import { load } from "./load.mjs";

const W = load();
const plain = (v) => JSON.parse(JSON.stringify(v));

test("size: large, hero, back to normal", () => {
  let r = W.wpApplyEdit({}, "living", "light.a", { size: "large" });
  assert.deepEqual(plain(r), { living: { large: ["light.a"] } });
  r = W.wpApplyEdit(r, "living", "light.a", { size: "hero" });
  assert.deepEqual(plain(r), { living: { hero: "light.a" } });
  r = W.wpApplyEdit(r, "living", "light.a", { size: "normal" });
  assert.deepEqual(plain(r), {});
});

test("pin and show", () => {
  let r = W.wpApplyEdit({}, "living", "light.a", { pin: true });
  assert.deepEqual(plain(r), { living: { pin: ["light.a"] } });
  r = W.wpApplyEdit(r, "living", "light.a", { show: false });
  assert.deepEqual(plain(r), { living: { pin: ["light.a"], hide: ["light.a"] } });
  r = W.wpApplyEdit(r, "living", "light.a", { show: true });
  r = W.wpApplyEdit(r, "living", "light.a", { pin: false });
  assert.deepEqual(plain(r), {});
});

test("move: hidden here when detected here, included there", () => {
  const r = W.wpApplyEdit({ living: { large: ["switch.p"] } }, "living", "switch.p", { move: "office" });
  assert.deepEqual(plain(r), { living: { hide: ["switch.p"] }, office: { include: ["switch.p"] } });
  // Moved back: no longer hidden at home, included elsewhere dropped (not detected there).
  const back = W.wpApplyEdit(r, "office", "switch.p", { move: "living" }, false);
  assert.deepEqual(plain(back), { living: { include: ["switch.p"] } });
});

test("group toggles a member; reset forgets the entity everywhere", () => {
  let r = W.wpApplyEdit({}, "living", "light.a", { group: "light.b" });
  assert.deepEqual(plain(r), { living: { group: { "light.a": ["light.b"] } } });
  r = W.wpApplyEdit(r, "living", "light.a", { group: "light.b" });
  assert.deepEqual(plain(r), {});
  r = { living: { hide: ["x.y"], pin: ["x.y", "z.z"], hero: "x.y" }, office: { include: ["x.y"] } };
  assert.deepEqual(plain(W.wpApplyEdit(r, "living", "x.y", { reset: true })), { living: { pin: ["z.z"] } });
});

test("the dashboard is patched where the options live", () => {
  const rooms = { living: { hide: ["a.b"] } };
  const strat = W.wpPatchLovelace({ strategy: { type: "custom:wall-panel", navigation: "left" } }, rooms);
  assert.deepEqual(plain(strat.strategy), { type: "custom:wall-panel", navigation: "left", rooms });
  const views = { views: [{ type: "panel", cards: [{ type: "entities" }, { type: "custom:wall-panel-card", kiosk: false }] }] };
  const card = W.wpPatchLovelace(views, rooms);
  assert.deepEqual(plain(card.views[0].cards[1]), { type: "custom:wall-panel-card", kiosk: false, rooms });
  assert.equal(views.views[0].cards[1].rooms, undefined, "the original is not changed");
  const sections = { views: [{ sections: [{ cards: [{ type: "custom:wall-panel-card" }] }] }] };
  assert.ok(W.wpPatchLovelace(sections, rooms).views[0].sections[0].cards[0].rooms);
  assert.equal(W.wpPatchLovelace({ views: [{ cards: [] }] }, rooms), null);
});

test("YAML for a dashboard the panel cannot save", () => {
  const yaml = W.wpYaml({ living_room: { hide: ["light.a"], hero: "fan.b", group: { "light.c": ["light.d"] } } });
  assert.equal(yaml, "rooms:\n  living_room:\n    hide: [light.a]\n    hero: fan.b\n    group:\n      light.c: [light.d]");
});

test("dashboard path from the address", () => {
  assert.equal(W.wpDashboardPath("/lovelace/0"), null);
  assert.equal(W.wpDashboardPath("/dashboard-wall/panel"), "dashboard-wall");
  assert.equal(W.wpDashboardPath("/"), null);
});
