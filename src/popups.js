// ── Popups, at the top of the screen (never centred), closed by a tap outside or by leaving the room ──
// Detail: the device's own controls, big enough for a finger, no slider (a horizontal swipe changes page on the Shelly
// launcher). Customize: size, room, pin, show, group, reset — saved to the dashboard's configuration.

const wpSvc = (svc, data = {}, label = "", icon = "", extra = "") =>
  `<button class="gbtn${extra ? ` ${extra}` : ""}" data-svc="${svc}" data-data='${wpEsc(JSON.stringify(data))}'${label ? ` aria-label="${wpEsc(label)}"` : ""}>${icon ? wpIc(icon) : ""}<span>${wpEsc(label)}</span></button>`;
const wpPreset = (svc, data, text, on) =>
  `<button class="pc${on ? " on" : ""}" data-svc="${svc}" data-data='${wpEsc(JSON.stringify(data))}'${on ? ' aria-pressed="true"' : ""}>${wpEsc(text)}</button>`;
const wpStepper = (lang, svc, key, value, step, unit, extra = {}) =>
  `<div class="stepper"><button class="round" data-svc="${svc}" data-data='${wpEsc(JSON.stringify({ ...extra, [key]: Math.round((value - step) * 10) / 10 }))}' aria-label="${wpEsc(wpT(lang, "lower"))}">${wpIc("mdi:minus")}</button><div class="big-val">${wpNum(lang, value)}<span>${wpEsc(unit)}</span></div><button class="round" data-svc="${svc}" data-data='${wpEsc(JSON.stringify({ ...extra, [key]: Math.round((value + step) * 10) / 10 }))}' aria-label="${wpEsc(wpT(lang, "raise"))}">${wpIc("mdi:plus")}</button></div>`;

const WP_COVER_SCENE = { shutter: "shutter", blind: "blind", curtain: "curtain", awning: "awning", garage: "garage", gate: "gate", shade: "blind", door: "garage", window: "shutter" };

const wpDetailBody = (hass, lang, t) => {
  const st = hass.states[t.id];
  const a = st.attributes || {};
  const s = st.state;
  const sf = a.supported_features || 0;
  const on = s === "on";
  switch (t.kind) {
    case "light": {
      const dim = (a.supported_color_modes || []).some((m) => m !== "onoff");
      const pct = a.brightness != null ? Math.round(a.brightness / 2.55) : null;
      return `<div class="btns">${wpSvc("light.turn_on", {}, wpT(lang, "turn_on"), "mdi:lightbulb-on-outline", on ? "on" : "")}${wpSvc("light.turn_off", {}, wpT(lang, "turn_off"), "mdi:lightbulb-off-outline", on ? "" : "on")}</div>${
        dim
          ? `<div class="field"><div class="flabel">${wpEsc(wpT(lang, "brightness"))}</div><div class="pcs">${[25, 50, 75, 100].map((p) => wpPreset("light.turn_on", { brightness_pct: p }, `${p} %`, on && pct != null && Math.abs(pct - p) < 5)).join("")}</div></div>`
          : ""
      }`;
    }
    case "cover": {
      const scene = WP_COVER_SCENE[a.device_class] || "shutter";
      const pos = a.current_position ?? (s === "closed" ? 0 : 100);
      const svg = coverSvg(scene).replace('class="scene ', `style="--p:${pos};--t:${a.current_tilt_position ?? 0}" class="scene `);
      const presets = sf & 4 ? `<div class="pcs">${[25, 50, 75].map((p) => wpPreset("cover.set_cover_position", { position: p }, `${p} %`, Math.abs(pos - p) < 3)).join("")}</div>` : "";
      return `<div class="cv"><div class="cvpic">${svg}</div><div class="cvx"><div class="big-val">${wpNum(lang, pos, 0)}<span>%</span></div><div class="meta">${wpEsc(wpState(hass, st))}</div>${presets}</div></div><div class="btns">${wpSvc(
        "cover.open_cover",
        {},
        wpT(lang, "open"),
        "mdi:arrow-up",
      )}${wpSvc("cover.stop_cover", {}, wpT(lang, "stop"), "mdi:stop")}${wpSvc("cover.close_cover", {}, wpT(lang, "close_cover"), "mdi:arrow-down")}</div>`;
    }
    case "climate": {
      const step = a.target_temp_step || (a.temperature_unit === "°F" ? 1 : 0.5);
      const target = a.temperature;
      const modes = (a.hvac_modes || []).map((m) => wpPreset("climate.set_hvac_mode", { hvac_mode: m }, wpAttr(hass, st, "hvac_mode", m), s === m)).join("");
      const presets = (a.preset_modes || []).map((m) => wpPreset("climate.set_preset_mode", { preset_mode: m }, wpAttr(hass, st, "preset_mode", m), a.preset_mode === m)).join("");
      return `${target != null ? `<div class="field col"><div class="flabel">${wpEsc(wpT(lang, "target"))}</div>${wpStepper(lang, "climate.set_temperature", "temperature", target, step, "°")}</div>` : ""}${
        a.current_temperature != null ? `<div class="meta">${wpEsc(wpT(lang, "ambient"))} · ${wpNum(lang, a.current_temperature)}°</div>` : ""
      }${modes ? `<div class="pcs wrap">${modes}</div>` : ""}${presets ? `<div class="pcs wrap">${presets}</div>` : ""}`;
    }
    case "water_heater": {
      const target = a.temperature;
      const modes = (a.operation_list || []).map((m) => wpPreset("water_heater.set_operation_mode", { operation_mode: m }, wpAttr(hass, st, "operation_mode", m), a.operation_mode === m)).join("");
      return `${target != null ? wpStepper(lang, "water_heater.set_temperature", "temperature", target, a.target_temp_step || 1, "°") : ""}${modes ? `<div class="pcs wrap">${modes}</div>` : ""}`;
    }
    case "humidifier":
      return `<div class="btns">${wpSvc("humidifier.turn_on", {}, wpT(lang, "turn_on"), "mdi:power", on ? "on" : "")}${wpSvc("humidifier.turn_off", {}, wpT(lang, "turn_off"), "mdi:power-off", on ? "" : "on")}</div>${
        a.humidity != null ? wpStepper(lang, "humidifier.set_humidity", "humidity", a.humidity, 5, "%") : ""
      }`;
    case "fan": {
      const pct = a.percentage;
      const presets = sf & 1 ? `<div class="pcs">${[33, 66, 100].map((p) => wpPreset("fan.set_percentage", { percentage: p }, `${p} %`, on && pct != null && Math.abs(pct - p) < 5)).join("")}</div>` : "";
      const modes = (a.preset_modes || []).map((m) => wpPreset("fan.set_preset_mode", { preset_mode: m }, wpAttr(hass, st, "preset_mode", m), a.preset_mode === m)).join("");
      return `<div class="btns">${wpSvc("fan.turn_on", {}, wpT(lang, "turn_on"), "mdi:fan", on ? "on" : "")}${wpSvc("fan.turn_off", {}, wpT(lang, "turn_off"), "mdi:fan-off", on ? "" : "on")}</div>${presets}${modes ? `<div class="pcs wrap">${modes}</div>` : ""}`;
    }
    case "media_player":
      return `${a.media_title ? `<div class="mt"><div class="mtt">${wpEsc(a.media_title)}</div><div class="meta">${wpEsc([a.media_artist, a.app_name || a.source].filter(Boolean).join(" · "))}</div></div>` : ""}<div class="btns">${wpSvc(
        "media_player.media_previous_track",
        {},
        wpT(lang, "previous"),
        "mdi:skip-previous",
      )}${wpSvc("media_player.media_play_pause", {}, wpT(lang, "play_pause"), s === "playing" ? "mdi:pause" : "mdi:play", "on")}${wpSvc("media_player.media_next_track", {}, wpT(lang, "next"), "mdi:skip-next")}</div><div class="btns">${wpSvc(
        "media_player.volume_down",
        {},
        wpT(lang, "volume_down"),
        "mdi:volume-minus",
      )}${wpSvc("media_player.volume_up", {}, wpT(lang, "volume_up"), "mdi:volume-plus")}</div>`;
    case "lock":
      return `<div class="btns">${wpSvc("lock.lock", {}, wpT(lang, "lock"), "mdi:lock-outline", s === "locked" ? "on" : "")}${wpSvc("lock.unlock", {}, wpT(lang, "unlock"), "mdi:lock-open-variant-outline", s === "unlocked" ? "on" : "")}</div>`;
    case "alarm_control_panel":
      if (a.code_format) return `<div class="meta">${wpEsc(wpState(hass, st))}</div>`;
      return `<div class="btns">${wpSvc("alarm_control_panel.alarm_arm_home", {}, wpT(lang, "arm_home"), "mdi:shield-home-outline", s === "armed_home" ? "on" : "")}${wpSvc(
        "alarm_control_panel.alarm_arm_away",
        {},
        wpT(lang, "arm_away"),
        "mdi:shield-lock-outline",
        s === "armed_away" ? "on" : "",
      )}${wpSvc("alarm_control_panel.alarm_disarm", {}, wpT(lang, "disarm"), "mdi:shield-off-outline", s === "disarmed" ? "on" : "")}</div>`;
    case "vacuum":
      return `<div class="btns">${wpSvc("vacuum.start", {}, wpT(lang, "start"), "mdi:play")}${wpSvc("vacuum.pause", {}, wpT(lang, "pause"), "mdi:pause")}${wpSvc("vacuum.return_to_base", {}, wpT(lang, "dock"), "mdi:home-import-outline")}</div>`;
    case "lawn_mower":
      return `<div class="btns">${wpSvc("lawn_mower.start_mowing", {}, wpT(lang, "start"), "mdi:play")}${wpSvc("lawn_mower.pause", {}, wpT(lang, "pause"), "mdi:pause")}${wpSvc("lawn_mower.dock", {}, wpT(lang, "dock"), "mdi:home-import-outline")}</div>`;
    case "plug":
    case "switch":
      return `<div class="btns">${wpSvc("homeassistant.turn_on", {}, wpT(lang, "turn_on"), "mdi:power", on ? "on" : "")}${wpSvc("homeassistant.turn_off", {}, wpT(lang, "turn_off"), "mdi:power-off", on ? "" : "on")}</div>`;
    default:
      return `<div class="big-val words">${wpEsc(wpState(hass, st))}</div>`;
  }
};

const wpDetailHtml = (hass, lang, t, room) => {
  const v = wpTileView(hass, lang, t);
  const members = t.group?.length ? `<div class="meta">${wpEsc(t.group.map((g) => wpCleanName(wpName(hass, g), room.name)).join(" · "))}</div>` : "";
  return `<div class="sheet" role="dialog" aria-modal="true" aria-label="${wpEsc(v.name)}">
<div class="shead"><span class="sbadge t-${v.tone}">${wpIc(v.icon)}</span><div class="stt"><div class="nm">${wpEsc(v.name)}</div><div class="sub">${wpEsc(room.name)} · ${wpEsc(v.state)}</div></div><button class="round" data-close aria-label="${wpEsc(wpT(lang, "close"))}">${wpIc("mdi:close")}</button></div>
${members}${v.na ? "" : wpDetailBody(hass, lang, t)}
<div class="efoot"><button class="link" data-more>${wpIc("mdi:information-outline")}${wpEsc(wpT(lang, "more_info"))}</button><span class="sp"></span><button class="link" data-edit>${wpIc("mdi:tune-variant")}${wpEsc(wpT(lang, "customize_btn"))}</button></div></div>`;
};

// The Customize popup. `ctx`: { rooms, room, data, canSave, yaml, status }.
const wpEditHtml = (hass, lang, t, ctx) => {
  const { rooms, room, data, config } = ctx;
  const o = config.rooms?.[room.id] || {};
  const heroId = typeof o.hero === "string" && o.hero.includes(".") ? o.hero : null;
  const size = heroId === t.id ? "hero" : t.large ? "large" : "normal";
  const seg = (k, icon) =>
    `<button role="radio" aria-checked="${size === k}" class="${size === k ? "on" : ""}" data-size="${k}">${wpIc(icon)}${wpEsc(wpT(lang, `size_${k}`))}</button>`;
  const chips = rooms
    .map((r) => `<button class="pc${r.id === room.id ? " on" : ""}" data-move="${wpEsc(r.id)}"${r.id === room.id ? ' aria-pressed="true"' : ""}>${r.id === room.id ? wpIc("mdi:check") : ""}${wpEsc(r.name)}</button>`)
    .join("");
  const others = data.tiles.filter((x) => x.id !== t.id);
  const inGroup = new Set(t.group || []);
  const groupChips = others
    .slice(0, 8)
    .map((x) => `<button class="pc${inGroup.has(x.id) ? " on" : ""}" data-group="${wpEsc(x.id)}"${inGroup.has(x.id) ? ' aria-pressed="true"' : ""}>${inGroup.has(x.id) ? wpIc("mdi:check") : ""}${wpEsc(x.name)}</button>`)
    .join("");
  const where = t.auto ? wpT(lang, "detected", { room: room.name }) : wpT(lang, "added", { room: room.name });
  const note = ctx.yaml
    ? `<div class="meta">${wpEsc(wpT(lang, ctx.canSave ? "save_failed" : "yaml_hint"))}</div><pre class="yaml">${wpEsc(ctx.yaml)}</pre>`
    : ctx.status
      ? `<div class="meta ok">${wpIc("mdi:check")} ${wpEsc(ctx.status)}</div>`
      : !ctx.canSave
        ? `<div class="meta">${wpEsc(wpT(lang, "admin_only"))}</div>`
        : "";
  return `<div class="sheet edit" role="dialog" aria-modal="true" aria-label="${wpEsc(wpT(lang, "customize"))}">
<div class="ehead"><div><div class="eti">${wpEsc(wpT(lang, "customize"))}</div><div class="sub">${wpIc(t.auto ? "mdi:auto-fix" : "mdi:playlist-plus")}${wpEsc(where)}</div></div><button class="round" data-close aria-label="${wpEsc(wpT(lang, "close"))}">${wpIc("mdi:close")}</button></div>
<div class="preview" aria-hidden="true">${wpTileHtml(hass, lang, { ...t, large: false })}</div>
<div class="field"><div class="flabel">${wpEsc(wpT(lang, "size"))}</div><div class="seg" role="radiogroup" aria-label="${wpEsc(wpT(lang, "size"))}">${seg("normal", "mdi:view-grid-outline")}${seg("large", "mdi:view-agenda-outline")}${seg("hero", "mdi:star-outline")}</div></div>
<div class="field"><div class="flabel">${wpEsc(wpT(lang, "room"))}</div><div class="pcs">${chips}</div></div>
<div class="sws">
<label class="swr">${wpIc("mdi:pin-outline")}<span>${wpEsc(wpT(lang, "pin"))}<small>${wpEsc(wpT(lang, "pin_help"))}</small></span><input type="checkbox" class="sw" role="switch" data-pin${t.pin ? " checked" : ""}></label>
<label class="swr">${wpIc("mdi:eye-outline")}<span>${wpEsc(wpT(lang, "show"))}<small>${wpEsc(wpT(lang, "show_help"))}</small></span><input type="checkbox" class="sw" role="switch" data-show checked></label>
<details class="swd"><summary class="swb">${wpIc("mdi:format-list-group")}<span>${wpEsc(wpT(lang, "group"))}<small>${wpEsc(wpT(lang, "group_help"))}</small></span><em>${wpEsc(
    t.group?.length ? t.group.map((g) => wpCleanName(wpName(hass, g), room.name)).join(", ") : wpT(lang, "none"),
  )}</em>${wpIc("mdi:chevron-down")}</summary><div class="pcs wrap">${groupChips}</div></details>
</div>
${note}
<div class="efoot"><span class="meta"><code>${wpEsc(t.id)}</code> · ${wpEsc(wpT(lang, "counts", { d: data.detected, h: data.hidden }))}</span><button class="link" data-reset>${wpIc("mdi:restore")}${wpEsc(wpT(lang, "reset"))}</button></div></div>`;
};
