import assert from "node:assert/strict";
import { test } from "node:test";
import { makeHass } from "./hass.mjs";
import { load } from "./load.mjs";

const W = load();
const plain = (v) => JSON.parse(JSON.stringify(v));
const roomOf = (hass, id, config = {}) => W.wpRooms(hass, config).find((r) => r.id === id);
const ids = (data) => data.tiles.map((t) => t.id);

test("every area is a room, its type guessed from its name", () => {
  const hass = makeHass();
  const rooms = W.wpRooms(hass);
  assert.deepEqual(plain(rooms.map((r) => r.id).sort()), ["bathroom", "entrance", "living_room"]);
  assert.equal(roomOf(hass, "living_room").type, "living");
  assert.equal(roomOf(hass, "bathroom").type, "bathroom");
  assert.equal(roomOf(hass, "entrance").icon, "mdi:door");
});

test("areas: order and choice; exclude_areas", () => {
  const hass = makeHass();
  assert.deepEqual(plain(W.wpRooms(hass, { areas: ["entrance", "living_room"] }).map((r) => r.id)), ["entrance", "living_room"]);
  assert.ok(!W.wpRooms(hass, { exclude_areas: ["bathroom"] }).some((r) => r.id === "bathroom"));
});

test("detection: device area, config/hidden/mobile app left out, a rich device's plain switch left out", () => {
  const hass = makeHass();
  const data = W.wpRoomData(hass, roomOf(hass, "living_room"));
  const got = ids(data);
  for (const id of ["light.living_room_ceiling", "light.lamp", "cover.living_room_shutter", "fan.purifier", "switch.tv_plug", "media_player.living_room_tv"]) assert.ok(got.includes(id), id);
  for (const id of ["switch.purifier_led", "switch.purifier_child_lock", "sensor.phone_battery", "binary_sensor.living_room_hidden"]) assert.ok(!got.includes(id), id);
  assert.equal(data.tiles.find((t) => t.id === "switch.tv_plug").kind, "plug");
  assert.equal(data.tiles.find((t) => t.id === "switch.tv_plug").power, 42);
});

test("tiles in kind order, names without the room", () => {
  const hass = makeHass();
  const data = W.wpRoomData(hass, roomOf(hass, "living_room"));
  assert.deepEqual(
    plain(data.tiles.map((t) => t.kind)),
    ["light", "light", "cover", "fan", "media_player", "plug"],
  );
  assert.equal(data.tiles.find((t) => t.id === "light.living_room_ceiling").name, "Ceiling");
});

test("ambient readings averaged, an appliance's sensor ignored", () => {
  const hass = makeHass();
  const bath = W.wpRoomData(hass, roomOf(hass, "bathroom"));
  assert.equal(bath.env.temperature, 23.8, "the water heater's 62° is not the room's air");
  assert.equal(bath.env.humidity, 74);
  const living = W.wpRoomData(hass, roomOf(hass, "living_room"));
  assert.equal(living.env.temperature, 21.4);
});

test("rooms options: hide, pin, include, large, group, order", () => {
  const hass = makeHass();
  const config = {
    rooms: {
      living_room: {
        hide: ["light.lamp"],
        pin: ["switch.tv_plug"],
        include: ["water_heater.boiler"],
        large: ["cover.living_room_shutter"],
        group: { "light.living_room_ceiling": ["fan.purifier"] },
      },
    },
  };
  const data = W.wpRoomData(hass, roomOf(hass, "living_room", config), config);
  const got = ids(data);
  assert.equal(got[0], "switch.tv_plug", "pinned first");
  assert.ok(!got.includes("light.lamp"), "hidden");
  assert.ok(got.includes("water_heater.boiler"), "included from another room");
  assert.ok(!got.includes("fan.purifier"), "grouped into the ceiling light");
  assert.deepEqual(plain(data.tiles.find((t) => t.id === "light.living_room_ceiling").group), ["fan.purifier"]);
  assert.equal(data.tiles.find((t) => t.id === "cover.living_room_shutter").large, true);
  assert.equal(data.hidden, 1);
  const ordered = W.wpRoomData(hass, roomOf(hass, "living_room"), { rooms: { living_room: { order: ["media_player", "cover"] } } });
  assert.deepEqual(plain(ordered.tiles.slice(0, 2).map((t) => t.kind)), ["media_player", "cover"]);
});

test("alerts and hero: the unlocked door, the humid bathroom, the temperature", () => {
  const hass = makeHass();
  const entry = roomOf(hass, "entrance");
  const entryData = W.wpRoomData(hass, entry);
  assert.deepEqual(plain(W.wpRoomAlerts(hass, entry, entryData).map((a) => a.key).sort()), ["door_open", "unlocked"]);
  assert.deepEqual(plain(W.wpPickHero(hass, entry, entryData)), { type: "entity", id: "lock.front_door" });
  const bath = roomOf(hass, "bathroom");
  assert.deepEqual(plain(W.wpPickHero(hass, bath, W.wpRoomData(hass, bath))), { type: "humidity" });
  const living = roomOf(hass, "living_room");
  assert.deepEqual(plain(W.wpPickHero(hass, living, W.wpRoomData(hass, living))), { type: "temperature" });
  assert.equal(W.wpPickHero(hass, living, W.wpRoomData(hass, living), { hero: false }), null);
  assert.deepEqual(plain(W.wpPickHero(hass, living, W.wpRoomData(hass, living), { rooms: { living_room: { hero: "fan.purifier" } } })), { type: "entity", id: "fan.purifier" });
});

test("tile views: tone, level, state line", () => {
  const hass = makeHass();
  const data = W.wpRoomData(hass, roomOf(hass, "living_room"));
  const v = (id) => W.wpTileView(hass, "en", data.tiles.find((t) => t.id === id));
  assert.equal(v("light.living_room_ceiling").tone, "warm");
  assert.equal(v("light.living_room_ceiling").lvl, 80);
  assert.equal(v("light.lamp").tone, "idle");
  assert.equal(v("cover.living_room_shutter").tone, "open");
  assert.equal(v("cover.living_room_shutter").lvl, 40);
  assert.match(v("switch.tv_plug").state, /42 W/);
  assert.equal(W.wpTapAction({ kind: "light" }), "toggle");
  assert.equal(W.wpTapAction({ kind: "cover" }), "detail");
  assert.equal(W.wpTapAction({ kind: "scene" }), "scene");
});

test("layout and navigation", () => {
  assert.equal(W.wpLayoutFor("auto", 480, 480), "square");
  assert.equal(W.wpLayoutFor("auto", 720, 360), "landscape");
  assert.equal(W.wpLayoutFor("auto", 375, 667), "portrait");
  assert.equal(W.wpLayoutFor("x2i", 480, 480), "landscape");
  assert.equal(W.wpLayoutFor("nspanel-86", 720, 360), "square");
  assert.equal(W.wpNavFor("auto", "landscape"), "left");
  assert.equal(W.wpNavFor("auto", "square"), "bottom");
  assert.equal(W.wpNavFor("auto", "portrait"), "bottom");
  assert.equal(W.wpNavFor("left", "square"), "left");
  assert.equal(W.wpNavFor({ landscape: "bottom" }, "landscape"), "bottom");
  assert.equal(W.wpNavFor({ landscape: "bottom" }, "square"), "bottom");
  assert.equal(W.wpNavFor("hidden", "portrait"), "hidden");
});

test("smoke, gas and CO detectors: a tile, an alert and the hero when they trip", () => {
  const hass = makeHass();
  hass.entities["binary_sensor.kitchen_smoke"] = { area_id: "living_room" };
  hass.states["binary_sensor.kitchen_smoke"] = { entity_id: "binary_sensor.kitchen_smoke", state: "on", attributes: { friendly_name: "Smoke", device_class: "smoke" } };
  const room = roomOf(hass, "living_room");
  const data = W.wpRoomData(hass, room);
  assert.equal(data.tiles.find((t) => t.id === "binary_sensor.kitchen_smoke").kind, "safety");
  assert.equal(W.wpRoomAlerts(hass, room, data)[0].key, "smoke");
  assert.equal(W.wpPickHero(hass, room, data).key, "smoke");
});

test("one appliance tile per device: the operation state, not the programme selectors or the progress", () => {
  const hass = makeHass();
  const add = (id, state, attributes = {}) => {
    hass.entities[id] = { device_id: "dishwasher" };
    hass.states[id] = { entity_id: id, state, attributes };
  };
  hass.devices.dishwasher = { area_id: "living_room" };
  add("select.dishwasher_selected_program", "eco_50");
  add("select.dishwasher_active_program", "eco_50");
  add("sensor.dishwasher_operation_state", "run", { device_class: "enum" });
  add("sensor.dishwasher_program_progress", "40", { unit_of_measurement: "%" });
  add("sensor.dishwasher_program_finish_time", "2026-01-01T12:00:00Z", { device_class: "timestamp" });
  const apps = W.wpRoomData(hass, roomOf(hass, "living_room")).tiles.filter((t) => t.kind === "appliance");
  assert.deepEqual(plain(apps.map((t) => t.id)), ["sensor.dishwasher_operation_state"]);
});

test("updates: the watched set holds the rooms' entities, a plug's power sensor through its device, and the overrides", () => {
  const hass = makeHass();
  const config = { rooms: { living_room: { include: ["sensor.elsewhere"], group: { "light.lamp": ["light.far"] } } } };
  const w = W.wpWatched(hass, W.wpRooms(hass, config), config);
  for (const id of ["light.lamp", "sensor.tv_plug_power", "sensor.bathroom_humidity", "sensor.elsewhere", "light.far"]) assert.ok(w.has(id), id);
  assert.ok(!w.has("sensor.not_there"));
  // Built once per registry.
  assert.equal(W.wpAreaEntities(hass), W.wpAreaEntities(hass));
});
