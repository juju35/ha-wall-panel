// ── Automatic detection, room by room ────────────────────────────────────────
// Every Home Assistant area is a room. An entity belongs to the area set on it, else to its device's area. What makes
// a tile: lights, covers, climate, fans, media players, locks, alarm panels, plugs and switches, water heaters,
// humidifiers, vacuums and mowers, cameras, door / window / motion / leak sensors and scenes. Left out: config and
// diagnostic entities, hidden ones, the mobile app's, and a switch that is only a setting of a richer device (the LED
// or child lock of a purifier). Ambient readings (temperature, humidity, CO₂, PM2.5) feed the header and the hero,
// never a tile; an appliance's own sensors (oven cavity, fridge, water heater…) are not taken for the room's air
// (the rule of ha-room-card, issue #89).
// Everything is then adjusted by the card's `rooms` options: hide, pin, include, large, hero, group, order.

const WP_KIND_ORDER = [
  "light",
  "cover",
  "climate",
  "fan",
  "media_player",
  "lock",
  "alarm_control_panel",
  "appliance",
  "plug",
  "switch",
  "water_heater",
  "humidifier",
  "vacuum",
  "lawn_mower",
  "camera",
  "contact",
  "motion",
  "leak",
  "safety",
  "scene",
  "other",
];
// A device holding one of these is "rich": its plain switches are its settings, not tiles.
const WP_PRIMARY = new Set(["light", "fan", "climate", "humidifier", "media_player", "vacuum", "lawn_mower", "cover", "lock", "water_heater"]);
const WP_PLUG_RE = /\b(prise|plug|socket|outlet|steckdose|enchufe|presa|stopcontact|gniazd)/i;
const WP_CONTACT_DC = new Set(["door", "window", "garage_door", "opening"]);
const WP_MOTION_DC = new Set(["motion", "occupancy", "presence"]);
// Smoke, gas and carbon monoxide detectors: a tile, and an alert when they trip.
const WP_SAFETY_DC = { smoke: "smoke", gas: "gas", carbon_monoxide: "co_alarm" };
const WP_ENV_DC = { temperature: "temperature", humidity: "humidity", carbon_dioxide: "co2", pm25: "pm25" };
const WP_APPLIANCE_STATE = /\b(program|programme|operation|op state)\b/;

// Appliance sensors (copied from ha-room-card, room-environment-card.js — the repos stay independent).
const WP_APPLIANCE_WORDS =
  /\b(oven|four|cavity|cavite|meat probe|food probe|sonde a viande|sonde à viande|fridge|refrigerator|refrigerateur|réfrigérateur|frigo|freezer|congelateur|congélateur|dishwasher|lave vaisselle|washer|washing|lave linge|dryer|seche linge|sèche linge|boiler|water heater|chauffe eau|ballon|cumulus|tank|aquarium|pool|piscine|spa|wine|cave a vin|cave à vin|cellar|kettle|bouilloire|flow|return|depart|départ|retour)\b/;
const WP_APPLIANCE_DOMAINS = new Set(["climate", "water_heater", "humidifier", "number"]);
const WP_SENSOR_SETTING =
  /\b(source|external|externe|exterieure|extérieure|remote|distant|distante|display|affichage|calibration|calibrage|etalonnage|étalonnage|offset|decalage|décalage|correction|comfort|confort|min|max|minimum|maximum|lower|upper|low|high|threshold|seuil|alarm|alarme|alert|alerte|limit|limite|report|reporting|interval|intervalle|sensitivity|sensibilite|sensibilité|hysteresis|hystérésis|precision|précision|delta|change|led|brightness|luminosite|luminosité)\b/;

const wpAreaOf = (hass, id) => {
  const e = hass.entities?.[id];
  if (!e) return null;
  return e.area_id || hass.devices?.[e.device_id]?.area_id || null;
};
const wpName = (hass, id) => hass.states?.[id]?.attributes?.friendly_name || hass.entities?.[id]?.name || id;

// The entity's name without its room ("Salon Plafonnier" → "Plafonnier"), first letter upper case.
const wpCleanName = (name, room) => {
  let n = String(name || "").trim();
  if (room) {
    const r = room.trim().toLowerCase();
    if (n.toLowerCase().startsWith(`${r} `)) n = n.slice(r.length).trim();
    else if (n.toLowerCase().endsWith(` ${r}`)) n = n.slice(0, -r.length).trim();
  }
  n = n.replace(/^[-–·:]\s*/, "");
  return n ? n[0].toUpperCase() + n.slice(1) : String(name || "");
};

// The tile kind of an entity, or null when it makes no tile.
const wpKind = (hass, id) => {
  const st = hass.states?.[id];
  if (!st) return null;
  const d = wpDomain(id);
  const dc = st.attributes?.device_class;
  switch (d) {
    case "light":
    case "cover":
    case "climate":
    case "fan":
    case "media_player":
    case "lock":
    case "alarm_control_panel":
    case "water_heater":
    case "humidifier":
    case "vacuum":
    case "lawn_mower":
    case "camera":
    case "scene":
      return d;
    case "switch":
      return dc === "outlet" || WP_PLUG_RE.test(`${id} ${st.attributes?.friendly_name || ""}`) ? "plug" : "switch";
    case "input_boolean":
      return "switch";
    case "binary_sensor":
      if (WP_CONTACT_DC.has(dc)) return "contact";
      if (WP_MOTION_DC.has(dc)) return "motion";
      if (dc === "moisture") return "leak";
      if (WP_SAFETY_DC[dc]) return "safety";
      return null;
    case "sensor":
    case "select":
      // An appliance's state or programme (text), not its progress, remaining time or start time.
      if (!WP_APPLIANCE_STATE.test(wpNorm(id))) return null;
      if (st.attributes?.unit_of_measurement || ["timestamp", "duration"].includes(dc)) return null;
      return d === "sensor" && st.state !== "" && Number.isFinite(Number(st.state)) ? null : "appliance";
    default:
      return null;
  }
};

// device_id → its entity ids, built once per hass object.
let wpDevCache = { hass: null, map: null };
const wpDeviceEntities = (hass) => {
  if (wpDevCache.hass === hass.entities && wpDevCache.map) return wpDevCache.map;
  const map = {};
  for (const [id, e] of Object.entries(hass.entities || {})) if (e.device_id) (map[e.device_id] ||= []).push(id);
  wpDevCache = { hass: hass.entities, map };
  return map;
};

const wpIsApplianceSensor = (hass, id, devEnts) => {
  const name = hass.states?.[id]?.attributes?.friendly_name;
  if (WP_APPLIANCE_WORDS.test(wpNorm(id)) || WP_APPLIANCE_WORDS.test(wpNorm(name))) return true;
  const dev = hass.entities?.[id]?.device_id;
  if (!dev) return false;
  for (const sib of devEnts[dev] || []) {
    if (sib === id) continue;
    const dom = wpDomain(sib);
    const cat = hass.entities?.[sib]?.entity_category;
    const setting = WP_SENSOR_SETTING.test(wpNorm(sib)) || WP_SENSOR_SETTING.test(wpNorm(hass.states?.[sib]?.attributes?.friendly_name));
    if (WP_APPLIANCE_DOMAINS.has(dom) && (dom !== "number" || (!cat && !setting))) return true;
    if ((dom === "select" || dom === "sensor") && !cat && WP_APPLIANCE_STATE.test(wpNorm(sib))) return true;
  }
  return false;
};

// Excluded from automatic detection (an explicit `include` still adds it).
const wpSkip = (hass, id, devEnts) => {
  const e = hass.entities?.[id];
  if (!e) return true;
  if (e.entity_category || e.hidden || e.hidden_by || e.platform === "mobile_app") return true;
  const d = wpDomain(id);
  // A plain switch of a rich device (purifier LED, child lock, a light's "do not disturb")…
  if ((d === "switch" || d === "input_boolean") && e.device_id) {
    for (const sib of devEnts[e.device_id] || []) if (sib !== id && WP_PRIMARY.has(wpDomain(sib)) && !hass.entities?.[sib]?.entity_category) return true;
  }
  return false;
};

// The power reading (W) of a plug: a power sensor on the same device.
const wpPowerOf = (hass, id, devEnts) => {
  const dev = hass.entities?.[id]?.device_id;
  if (!dev) return null;
  for (const sib of devEnts[dev] || []) {
    const st = hass.states?.[sib];
    if (sib.startsWith("sensor.") && st?.attributes?.device_class === "power" && wpAvailable(st)) {
      const v = Number(st.state);
      if (Number.isFinite(v)) return st.attributes.unit_of_measurement === "kW" ? v * 1000 : v;
    }
  }
  return null;
};

// area_id → its entity ids (the entity's area, else its device's), built once per registry: the room screens and the
// update filter read only their own entities instead of scanning every state of the install on each update.
let wpAreaCache = { entities: null, devices: null, map: null };
const wpAreaEntities = (hass) => {
  const c = wpAreaCache;
  if (c.map && c.entities === hass.entities && c.devices === hass.devices) return c.map;
  const map = {};
  for (const id of Object.keys(hass.entities || {})) {
    const a = wpAreaOf(hass, id);
    if (a) (map[a] ||= []).push(id);
  }
  wpAreaCache = { entities: hass.entities, devices: hass.devices, map };
  return map;
};

// Every entity a screen can show or read, for the listed rooms: their entities (power sensors of plugs included,
// through their device), what `include`, `group` and `hero` add. An update that changes none of them is skipped.
const wpWatched = (hass, rooms, config = {}) => {
  const byArea = wpAreaEntities(hass);
  const out = new Set();
  for (const r of rooms) {
    for (const id of byArea[r.id] || []) out.add(id);
    const o = config.rooms?.[r.id] || {};
    for (const id of o.include || []) out.add(id);
    for (const m of Object.values(o.group || {})) for (const id of m || []) out.add(id);
    if (typeof o.hero === "string") out.add(o.hero);
  }
  if (typeof config.hero === "string") out.add(config.hero);
  return out;
};

// The ordered list of rooms: `areas` (order and choice) when set, else every area by floor level then name.
const wpRooms = (hass, config = {}) => {
  const areas = hass.areas || {};
  const exclude = new Set(config.exclude_areas || []);
  let ids;
  if (Array.isArray(config.areas) && config.areas.length) ids = config.areas.filter((a) => areas[a]);
  else {
    const level = (a) => hass.floors?.[areas[a].floor_id]?.level ?? 0;
    ids = Object.keys(areas).sort((a, b) => level(a) - level(b) || (areas[a].name || a).localeCompare(areas[b].name || b));
  }
  return ids
    .filter((a) => !exclude.has(a))
    .map((a) => {
      const o = config.rooms?.[a] || {};
      const area = areas[a];
      const type = o.room_type && o.room_type !== "auto" ? o.room_type : rcGuessRoomType(area);
      return { id: a, name: o.name || area.name || a, icon: o.icon || area.icon || WP_ROOM_ICONS[type] || "mdi:texture-box", type, area };
    });
};
const WP_ROOM_ICONS = {
  living: "mdi:sofa-outline",
  bedroom: "mdi:bed-outline",
  kids: "mdi:teddy-bear",
  kitchen: "mdi:stove",
  dining: "mdi:table-chair",
  bathroom: "mdi:shower",
  toilets: "mdi:toilet",
  hallway: "mdi:shoe-print",
  entry: "mdi:door",
  office: "mdi:desk",
  laundry: "mdi:washing-machine",
  garage: "mdi:garage",
  none: "mdi:texture-box",
};

// Everything the room screen needs: { tiles, env, detected, hidden }.
// A tile: { id, kind, name, large, pin, group: [ids], auto }.
const wpRoomData = (hass, room, config = {}) => {
  const o = config.rooms?.[room.id] || {};
  const devEnts = wpDeviceEntities(hass);
  const hide = new Set(o.hide || []);
  const pins = o.pin || [];
  const large = new Set(o.large || []);
  const grouped = new Set(Object.values(o.group || {}).flat());
  const env = { temperature: [], humidity: [], co2: [], pm25: [] };
  const found = [];
  for (const id of wpAreaEntities(hass)[room.id] || []) {
    const st = hass.states?.[id];
    if (!st) continue;
    const dc = st.attributes?.device_class;
    if (id.startsWith("sensor.") && WP_ENV_DC[dc] && !hass.entities?.[id]?.entity_category) {
      if (wpAvailable(st) && !wpIsApplianceSensor(hass, id, devEnts)) {
        const v = Number(st.state);
        if (Number.isFinite(v)) env[WP_ENV_DC[dc]].push(v);
      }
      continue;
    }
    const kind = wpKind(hass, id);
    if (!kind || wpSkip(hass, id, devEnts)) continue;
    found.push(id);
  }
  // One appliance tile per device: its operation state rather than its programme selectors.
  const applianceOf = new Map();
  const appRank = (id) => (id.startsWith("sensor.") ? (/\b(operation|op) state\b/.test(wpNorm(id)) ? 0 : 1) : 2);
  for (const id of found) {
    const dev = hass.entities?.[id]?.device_id;
    if (!dev || wpKind(hass, id) !== "appliance") continue;
    const best = applianceOf.get(dev);
    if (!best || appRank(id) < appRank(best)) applianceOf.set(dev, id);
  }
  for (let i = found.length - 1; i >= 0; i--) {
    const dev = hass.entities?.[found[i]]?.device_id;
    if (dev && applianceOf.has(dev) && applianceOf.get(dev) !== found[i] && wpKind(hass, found[i]) === "appliance") found.splice(i, 1);
  }
  const included = (o.include || []).filter((id) => hass.states?.[id] && !found.includes(id));
  const all = [...found, ...included];
  const detected = found.length;
  const hidden = all.filter((id) => hide.has(id)).length;
  const order = o.order || [];
  const rank = (t) => {
    const p = pins.indexOf(t.id);
    if (p >= 0) return p - 1000;
    const byId = order.indexOf(t.id);
    if (byId >= 0) return byId - 500;
    const byKind = order.indexOf(t.kind);
    return byKind >= 0 ? byKind : 100 + WP_KIND_ORDER.indexOf(t.kind);
  };
  const tiles = all
    .filter((id) => !hide.has(id) && !grouped.has(id))
    .map((id) => ({
      id,
      kind: wpKind(hass, id) || "other",
      name: wpCleanName(wpName(hass, id), room.name),
      large: large.has(id),
      pin: pins.includes(id),
      group: (o.group?.[id] || []).filter((g) => hass.states?.[g]),
      auto: found.includes(id),
      power: wpPowerOf(hass, id, devEnts),
    }))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  const avg = (list) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : null);
  return {
    tiles,
    env: { temperature: avg(env.temperature), humidity: avg(env.humidity), co2: avg(env.co2), pm25: avg(env.pm25) },
    detected,
    hidden,
  };
};

// Wet rooms live with more humidity (70 % there, 65 % elsewhere).
const wpHumidHigh = (room) => (["bathroom", "laundry", "toilets"].includes(room.type) ? 70 : 65);

// What needs a look in a room, worst first: [{ tone, label, detail, id }].
const wpRoomAlerts = (hass, room, data) => {
  const out = [];
  const on = (id) => hass.states?.[id]?.state === "on";
  for (const t of data.tiles) {
    const st = hass.states[t.id];
    if (t.kind === "leak" && on(t.id)) out.push({ tone: "alert", key: "leak", id: t.id, name: t.name });
    if (t.kind === "safety" && on(t.id)) out.push({ tone: "alert", key: WP_SAFETY_DC[st.attributes?.device_class] || "smoke", id: t.id, name: t.name });
    if (t.kind === "contact" && on(t.id)) {
      const dc = st.attributes?.device_class;
      out.push({ tone: "open", key: dc === "window" ? "window_open" : "door_open", id: t.id, name: t.name });
    }
    if (t.kind === "lock" && st.state === "unlocked") out.push({ tone: "warm", key: "unlocked", id: t.id, name: t.name });
  }
  if (data.env.co2 != null && data.env.co2 >= 1000) out.push({ tone: data.env.co2 >= 1400 ? "alert" : "warm", key: "co2_high", value: data.env.co2 });
  if (data.env.humidity != null && data.env.humidity >= wpHumidHigh(room)) out.push({ tone: "warm", key: "humid", value: data.env.humidity });
  const w = { alert: 0, warm: 1, open: 2 };
  return out.sort((a, b) => w[a.tone] - w[b.tone]);
};

// The hero of a room: `hero: false` none, `hero: <entity>` that entity, else (auto) what matters most right now:
// a leak, stale air, an unlocked door, high humidity, a player playing, the heating, else the temperature.
// Returns { type, id?, … } or null.
const wpPickHero = (hass, room, data, config = {}) => {
  const o = config.rooms?.[room.id] || {};
  const setting = o.hero ?? config.hero ?? "auto";
  if (setting === false || setting === "none") return null;
  const st = (id) => hass.states?.[id];
  if (typeof setting === "string" && setting.includes(".")) return st(setting) ? { type: "entity", id: setting } : null;
  const first = (kind, test = () => true) => data.tiles.find((t) => t.kind === kind && test(st(t.id)));
  const alarm = first("safety", (s) => s.state === "on");
  if (alarm) return { type: "leak", id: alarm.id, key: WP_SAFETY_DC[st(alarm.id).attributes?.device_class] || "smoke" };
  const leak = first("leak", (s) => s.state === "on");
  if (leak) return { type: "leak", id: leak.id };
  if (data.env.co2 != null && data.env.co2 >= 1000) return { type: "co2" };
  const lock = first("lock", (s) => s.state !== "locked");
  if (lock) return { type: "entity", id: lock.id };
  if (data.env.humidity != null && data.env.humidity >= wpHumidHigh(room)) return { type: "humidity" };
  const media = first("media_player", (s) => s.state === "playing");
  if (media) return { type: "entity", id: media.id };
  const climate = first("climate", (s) => wpAvailable(s));
  if (climate) return { type: "entity", id: climate.id };
  if (data.env.temperature != null) return { type: "temperature" };
  return null;
};
