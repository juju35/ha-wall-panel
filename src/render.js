// ── Rendering: banner, hero, tiles, room bar, home screen ────────────────────
// Plain HTML strings: the card writes each part only when it changed, which keeps the small panels' slow CPUs idle.

const wpIc = (icon) => `<ha-icon icon="${wpEsc(icon)}"></ha-icon>`;

// ── Banner (the illustrated header of the ha-* cards, 90 px, scene on the right, floor strip) ──
const wpSceneFor = (hass, lang, room, data, alerts) => {
  const tiles = data.tiles;
  const st = (id) => hass.states?.[id];
  const has = (k) => tiles.some((t) => t.kind === k);
  const env = data.env;
  const lights = tiles.filter((t) => t.kind === "light").slice(0, 3);
  const lamps = lights.map((t) => {
    const s = st(t.id);
    // Numbers only: the colour goes into the scene's SVG attributes.
    const rgb = s?.attributes?.rgb_color;
    const ok = Array.isArray(rgb) && rgb.length === 3 && rgb.every((v) => Number.isFinite(Number(v)));
    return { on: s?.state === "on", color: ok ? `rgb(${rgb.map((v) => Math.round(Number(v))).join(",")})` : undefined };
  });
  const contacts = tiles.filter((t) => t.kind === "contact");
  const openOf = (dc) => contacts.some((t) => st(t.id)?.state === "on" && (dc ? st(t.id)?.attributes?.device_class === dc : st(t.id)?.attributes?.device_class !== "window"));
  const motion = tiles.some((t) => t.kind === "motion" && st(t.id)?.state === "on");
  const plugs = tiles.filter((t) => t.kind === "plug" || t.kind === "switch");
  const humidHigh = env.humidity != null && env.humidity >= wpHumidHigh(room);
  const co2High = env.co2 != null && env.co2 >= 1000;
  const hasEnv = env.temperature != null || env.humidity != null || env.co2 != null;
  let theme;
  if ((room.type === "entry" || room.type === "hallway") && (contacts.length || has("motion"))) theme = "sensors";
  else if (hasEnv && (co2High || humidHigh || ["bathroom", "office", "bedroom", "toilets"].includes(room.type))) theme = "environment";
  else if (lights.length) theme = "lights";
  else if (plugs.length) theme = "plugs";
  else if (contacts.length || has("motion")) theme = "sensors";
  else theme = "environment";
  let state;
  if (theme === "lights") state = { lamps };
  else if (theme === "sensors") state = { door: openOf(null), window: openOf("window"), motion };
  else if (theme === "plugs") {
    const on = plugs.slice(0, 3).map((t) => st(t.id)?.state === "on");
    state = { on, total: plugs.filter((t) => st(t.id)?.state === "on").length, high: plugs.some((t) => (t.power ?? 0) >= 2000) };
  } else {
    const t = env.temperature;
    const tone = env.co2 >= 1400 ? "alert" : co2High || humidHigh ? "warn" : t != null && t < 17 ? "cold" : "ok";
    const fx = humidHigh ? "humid" : co2High ? "air" : t != null && t < 17 ? "cold" : t != null && t >= 27 ? "hot" : null;
    const top = co2High ? wpNum(lang, env.co2, 0) : humidHigh ? `${wpNum(lang, env.humidity, 0)} %` : t != null ? `${wpNum(lang, t)}°` : "—";
    const bottom = humidHigh ? (t != null ? `${wpNum(lang, t)}°` : "") : env.humidity != null ? `${wpNum(lang, env.humidity, 0)} %` : "";
    state = { tone, top, bottom, fx };
  }
  // The badge colour and the pill: the worst alert, else the lights on.
  const litAll = tiles.filter((t) => t.kind === "light" && st(t.id)?.state === "on").length;
  const tone = alerts[0]?.tone || (litAll ? "warm" : "ok");
  return { theme, state, tone, litAll };
};
const wpBanner = ({ type, theme, state, night, icon, title, sub, pill, tone }) => {
  const room = type === "home" ? "none" : type;
  const svg = `<svg class="rscene" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${
    type === "home" ? "" : rcGhost(room, night)
  }${RC_THEMES[theme](state, night)}</svg>`;
  const wall = (RC_WALLS[room] || RC_WALLS.none)[night ? 1 : 0];
  const floor = type === "home" ? "lawn" : rcFloorOf(room);
  return `<div class="banner${night ? " night" : ""}" style="background:${wall}">${svg}<div class="ground g-${floor}"></div>
<div class="head" style="--c:${WP_TONE_FILL[tone] || WP_TONE_FILL.ok}"><span class="badge">${wpIc(icon)}</span><div class="titles"><div class="trow"><span class="title">${wpEsc(title)}</span>${
    pill ? `<span class="pill">${wpEsc(pill)}</span>` : ""
  }</div><div class="bsub">${sub}</div></div></div></div>`;
};

const wpSub = (lang, env, extra = "", timeFormat = "language") => {
  const parts = [`<b>${wpEsc(wpTime(lang, new Date(), timeFormat))}</b>`];
  if (env.temperature != null) parts.push(`${wpNum(lang, env.temperature)}°`);
  if (env.humidity != null) parts.push(`${wpNum(lang, env.humidity, 0)} %`);
  if (env.co2 != null && env.co2 >= 800) parts.push(`CO₂ ${wpNum(lang, env.co2, 0)} ppm`);
  if (extra) parts.push(wpEsc(extra));
  return parts.join(" · ");
};

const wpAlertText = (lang, a) => wpT(lang, a.key);

// ── Tiles ──
const wpTileHtml = (hass, lang, t, { extra = "" } = {}) => {
  const v = wpTileView(hass, lang, t);
  const cls = ["tile", v.tone === "idle" ? "idle" : `t-${v.tone}`];
  if (t.large) cls.push("large");
  if (v.na) cls.push("na");
  if (extra) cls.push(extra);
  return `<button class="${cls.join(" ")}" data-id="${wpEsc(t.id)}" aria-label="${wpEsc(`${v.name}, ${v.state}`)}"><span class="ic">${wpIc(v.icon)}</span><span class="tx"><span class="nm">${wpEsc(v.name)}</span><span class="st">${wpEsc(
    v.state,
  )}</span></span><span class="dot"></span>${v.lvl != null ? `<span class="lvl"><i style="width:${Math.max(0, Math.min(100, v.lvl))}%"></i></span>` : ""}</button>`;
};

// ── Hero ──
const wpRing = (v) => {
  const c = 2 * Math.PI * 25;
  const f = Math.max(0, Math.min(1, v));
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" stroke-opacity=".14" stroke-width="6"></circle><circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 30 30)"></circle></svg>`;
};
const wpChip = (icon, text, tone) => `<span class="hc${tone ? ` t-${tone}` : ""}">${wpIc(icon)}${wpEsc(text)}</span>`;
const wpEnvChips = (lang, env, skip = []) => {
  const out = [];
  if (env.temperature != null && !skip.includes("temperature")) out.push(wpChip("mdi:thermometer", `${wpNum(lang, env.temperature)}°`));
  if (env.humidity != null && !skip.includes("humidity")) out.push(wpChip("mdi:water-percent", `${wpNum(lang, env.humidity, 0)} %`));
  if (env.co2 != null && !skip.includes("co2")) out.push(wpChip("mdi:molecule-co2", `${wpNum(lang, env.co2, 0)} ppm`, env.co2 >= 1000 ? "warm" : null));
  return out.slice(0, 2);
};

// { tone, icon, ring, value, unit, label, chips, action: [icon, text, act] , id }
const wpHeroView = (hass, lang, room, data, hero) => {
  const env = data.env;
  if (!hero) return null;
  switch (hero.type) {
    case "temperature": {
      const t = env.temperature;
      return {
        tone: t < 17 ? "cold" : t >= 26 ? "warm" : "ok",
        icon: "mdi:thermometer",
        ring: (t - 14) / 14,
        value: wpNum(lang, t),
        unit: "°",
        label: wpT(lang, "ambient"),
        chips: wpEnvChips(lang, env, ["temperature"]),
      };
    }
    case "co2":
      return {
        tone: env.co2 >= 1400 ? "alert" : "warm",
        icon: "mdi:molecule-co2",
        ring: env.co2 / 2000,
        value: wpNum(lang, env.co2, 0),
        unit: "ppm",
        label: wpT(lang, "co2_high"),
        chips: wpEnvChips(lang, env, ["co2"]),
      };
    case "humidity":
      return {
        tone: "warm",
        icon: "mdi:water-percent",
        ring: env.humidity / 100,
        value: wpNum(lang, env.humidity, 0),
        unit: "%",
        label: wpT(lang, "humid"),
        chips: wpEnvChips(lang, env, ["humidity"]),
      };
    case "leak":
      return { tone: "alert", icon: hero.key ? "mdi:smoke-detector-variant-alert" : "mdi:water-alert", value: wpT(lang, hero.key || "leak"), words: true, label: wpCleanName(wpName(hass, hero.id), room.name), id: hero.id, chips: [] };
    default:
      break;
  }
  const st = hass.states?.[hero.id];
  if (!st) return null;
  const t = data.tiles.find((x) => x.id === hero.id) || { id: hero.id, kind: wpKind(hass, hero.id) || "other", name: wpCleanName(wpName(hass, hero.id), room.name) };
  const v = wpTileView(hass, lang, t);
  const a = st.attributes || {};
  const base = { tone: v.tone, icon: v.icon, id: hero.id, label: v.name, chips: [] };
  if (t.kind === "climate" && a.current_temperature != null) {
    const action = a.hvac_action ? wpAttr(hass, st, "hvac_action", a.hvac_action) : wpState(hass, st);
    return {
      ...base,
      ring: (a.current_temperature - 14) / 14,
      value: wpNum(lang, a.current_temperature),
      unit: "°",
      label: a.temperature != null ? `${action} → ${wpNum(lang, a.temperature)}°` : action,
      chips: wpEnvChips(lang, { ...env, temperature: null, humidity: a.current_humidity ?? env.humidity }),
    };
  }
  if (t.kind === "lock") {
    const doorOpen = data.tiles.some((x) => x.kind === "contact" && hass.states[x.id]?.state === "on");
    return {
      ...base,
      value: wpState(hass, st),
      words: true,
      label: doorOpen ? wpT(lang, "door_open") : v.name,
      action: st.state === "locked" ? ["mdi:lock-open-variant-outline", wpT(lang, "unlock"), "unlock"] : ["mdi:lock-outline", wpT(lang, "lock"), "lock"],
    };
  }
  if (t.kind === "media_player") {
    const title = a.media_title || wpState(hass, st);
    return {
      ...base,
      value: title,
      words: true,
      label: [a.media_artist, a.app_name || a.source, v.name].filter(Boolean).slice(0, 2).join(" · "),
      action: [st.state === "playing" ? "mdi:pause" : "mdi:play", wpT(lang, "play_pause"), "play_pause"],
    };
  }
  return { ...base, value: v.state, words: true };
};

const wpHeroHtml = (h, tall = false) => {
  if (!h) return "";
  const ring = h.ring != null ? `<div class="ring">${wpRing(h.ring)}<span>${wpIc(h.icon)}</span></div>` : `<div class="ring solo"><span>${wpIc(h.icon)}</span></div>`;
  const words = h.words || String(h.value).length > 6;
  const chips = h.chips?.length ? `<div class="hchips">${h.chips.join("")}</div>` : "";
  const act = h.action ? `<button class="hact" data-hero-act="${h.action[2]}" aria-label="${wpEsc(h.action[1])}">${wpIc(h.action[0])}<span>${wpEsc(h.action[1])}</span></button>` : "";
  const value = `<div class="hv${words ? " words" : ""}">${wpEsc(h.value)}${h.unit ? `<span>${wpEsc(h.unit)}</span>` : ""}</div>`;
  return `<div class="hero t-${h.tone}${tall ? " tall" : ""}"${h.id ? ` data-hero="${wpEsc(h.id)}" role="button" tabindex="0"` : ""}>${ring}<div class="hx">${value}<div class="hl">${wpEsc(h.label || "")}</div>${tall ? chips : ""}</div>${tall ? act : chips + act}</div>`;
};

// ── Room bar ──
const wpNavHtml = (lang, rooms, active, where) => {
  const items = [{ id: "home", name: wpT(lang, "home"), icon: "mdi:home-outline" }, ...rooms];
  return `<nav class="nav ${where}" aria-label="${wpEsc(wpT(lang, "rooms"))}">${items
    .map(
      (r) =>
        `<button class="ni${r.id === active ? " on" : ""}" data-room="${wpEsc(r.id)}"${r.id === active ? ' aria-current="page"' : ""}>${wpIc(r.icon)}<span>${wpEsc(r.name)}</span></button>`,
    )
    .join("")}</nav>`;
};

// ── Home: the cutaway house, what needs a look, every room ──
const wpRoomSummary = (hass, lang, data, alerts) => {
  const lit = data.tiles.filter((t) => t.kind === "light" && hass.states[t.id]?.state === "on").length;
  if (alerts[0]) return { tone: alerts[0].tone, text: wpAlertText(lang, alerts[0]) };
  if (lit) return { tone: "warm", text: wpT(lang, "lights_on", { n: lit }) };
  if (data.env.temperature != null) return { tone: "idle", text: `${wpNum(lang, data.env.temperature)}°` };
  return { tone: "idle", text: wpT(lang, "all_quiet") };
};
