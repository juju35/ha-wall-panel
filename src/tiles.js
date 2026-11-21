// ── Tiles: icon, state line and tone of each kind ────────────────────────────

const WP_COVER_ICONS = {
  shutter: ["mdi:window-shutter", "mdi:window-shutter-open"],
  blind: ["mdi:blinds", "mdi:blinds-open"],
  curtain: ["mdi:curtains-closed", "mdi:curtains"],
  shade: ["mdi:roller-shade-closed", "mdi:roller-shade"],
  awning: ["mdi:awning-outline", "mdi:awning"],
  garage: ["mdi:garage", "mdi:garage-open"],
  gate: ["mdi:gate", "mdi:gate-open"],
  door: ["mdi:door-closed", "mdi:door-open"],
  window: ["mdi:window-closed", "mdi:window-open"],
};
const WP_CONTACT_ICONS = {
  window: ["mdi:window-closed-variant", "mdi:window-open-variant"],
  garage_door: ["mdi:garage", "mdi:garage-open"],
  door: ["mdi:door-closed", "mdi:door-open"],
  opening: ["mdi:square-outline", "mdi:square-off-outline"],
};

const wpIcon = (hass, t, st) => {
  const own = st?.attributes?.icon || hass.entities?.[t.id]?.icon;
  if (own) return own;
  const on = st && !["off", "closed", "locked", "idle", "standby", "docked", "disarmed", "unavailable", "unknown"].includes(st.state);
  const dc = st?.attributes?.device_class;
  switch (t.kind) {
    case "light":
      return on ? "mdi:lightbulb-on" : "mdi:lightbulb-outline";
    case "cover": {
      const pair = WP_COVER_ICONS[dc] || WP_COVER_ICONS.shutter;
      return pair[st?.state === "closed" ? 0 : 1];
    }
    case "climate":
      return st?.attributes?.hvac_action === "cooling" || st?.state === "cool" ? "mdi:snowflake" : "mdi:radiator";
    case "fan":
      return on ? "mdi:fan" : "mdi:fan-off";
    case "media_player":
      return dc === "tv" ? "mdi:television" : dc === "speaker" ? "mdi:speaker" : "mdi:cast";
    case "lock":
      return st?.state === "locked" ? "mdi:lock-outline" : "mdi:lock-open-variant-outline";
    case "alarm_control_panel":
      return st?.state === "disarmed" ? "mdi:shield-off-outline" : "mdi:shield-home-outline";
    case "plug":
      return on ? "mdi:power-socket-eu" : "mdi:power-socket-eu";
    case "switch":
      return on ? "mdi:toggle-switch-variant" : "mdi:toggle-switch-variant-off";
    case "water_heater":
      return "mdi:water-boiler";
    case "humidifier":
      return "mdi:air-humidifier";
    case "vacuum":
      return "mdi:robot-vacuum";
    case "lawn_mower":
      return "mdi:robot-mower";
    case "camera":
      return "mdi:cctv";
    case "contact": {
      const pair = WP_CONTACT_ICONS[dc] || WP_CONTACT_ICONS.door;
      return pair[st?.state === "on" ? 1 : 0];
    }
    case "motion":
      return st?.state === "on" ? "mdi:motion-sensor" : "mdi:motion-sensor-off";
    case "leak":
      return st?.state === "on" ? "mdi:water-alert" : "mdi:water-check";
    case "scene":
      return "mdi:palette";
    case "appliance":
      return "mdi:washing-machine";
    default:
      return "mdi:eye-outline";
  }
};

const wpPct = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);

// { icon, name, state, tone, lvl (0–100 or null), na }
const wpTileView = (hass, lang, t) => {
  const st = hass.states?.[t.id];
  const view = { icon: wpIcon(hass, t, st), name: t.name, state: wpState(hass, st), tone: "idle", lvl: null, na: !wpAvailable(st) };
  if (!st || view.na) return view;
  const a = st.attributes || {};
  const s = st.state;
  const pct = (v) => `${view.state} · ${wpNum(lang, v, 0)} %`;
  switch (t.kind) {
    case "light":
      if (s === "on") {
        view.tone = "warm";
        if (a.brightness != null) {
          view.lvl = Math.round(a.brightness / 2.55);
          view.state = pct(view.lvl);
        }
      }
      break;
    case "cover":
      if (s !== "closed") view.tone = "open";
      if (a.current_position != null) {
        view.lvl = wpPct(a.current_position);
        if (s !== "closed") view.state = pct(view.lvl);
      }
      break;
    case "climate": {
      const action = a.hvac_action;
      if (action === "heating" || action === "preheating") view.tone = "warm";
      else if (action === "cooling") view.tone = "cold";
      else if (s !== "off") view.tone = "ok";
      const target = a.temperature;
      if (target != null && s !== "off") {
        const lead = action ? wpAttr(hass, st, "hvac_action", action) : view.state;
        view.state = `${lead} → ${wpNum(lang, target)}°`;
      }
      break;
    }
    case "fan":
    case "humidifier":
      if (s === "on") {
        view.tone = "open";
        if (a.percentage != null) {
          view.lvl = wpPct(a.percentage);
          view.state = pct(view.lvl);
        }
      }
      break;
    case "media_player":
      if (s === "playing") {
        view.tone = "media";
        if (a.media_title) view.state = a.media_artist ? `${a.media_title} · ${a.media_artist}` : a.media_title;
      }
      break;
    case "lock":
      view.tone = s === "locked" ? "ok" : s === "jammed" ? "alert" : "warm";
      break;
    case "alarm_control_panel":
      view.tone = s === "triggered" ? "alert" : s === "disarmed" ? "idle" : s.startsWith("arm") ? "ok" : "warm";
      break;
    case "plug":
    case "switch":
      if (s === "on") {
        view.tone = "warm";
        if (t.power != null) view.state = `${view.state} · ${wpNum(lang, t.power, t.power < 10 ? 1 : 0)} W`;
      }
      break;
    case "water_heater":
      if (s !== "off") view.tone = "ok";
      if (a.temperature != null && s !== "off") view.state = `${view.state} · ${wpNum(lang, a.temperature)}°`;
      break;
    case "vacuum":
    case "lawn_mower":
      view.tone = s === "error" ? "alert" : ["cleaning", "mowing", "returning"].includes(s) ? "open" : "idle";
      break;
    case "contact":
      view.tone = s === "on" ? "open" : "ok";
      break;
    case "motion":
      view.tone = s === "on" ? "ok" : "idle";
      break;
    case "leak":
      view.tone = s === "on" ? "alert" : "ok";
      break;
    case "appliance":
      view.tone = /^(off|inactive|ready|idle|finished|standby)$/i.test(s) ? "idle" : "warm";
      break;
    default:
      break;
  }
  if (t.group?.length) view.state = `${view.state} · +${t.group.length}`;
  return view;
};

// The tap: a toggle for what simply switches, the detail popup for the rest (null), a scene runs.
const WP_TOGGLE = new Set(["light", "plug", "switch", "fan"]);
const wpTapAction = (t) => (t.kind === "scene" ? "scene" : WP_TOGGLE.has(t.kind) ? "toggle" : "detail");
