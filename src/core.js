// ── Core helpers ─────────────────────────────────────────────────────────────
// Escaping, translations, number formatting and the small tables every other file uses.

const WP_VERSION = "__VERSION__";
const WP_TAG = "wall-panel-card";
const WP_STRATEGY = "custom:wall-panel";

// The scenes (scene.js) expect rcEsc, as in ha-room-card.
const rcEsc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const wpEsc = rcEsc;

// The language: the card's `language`, else Home Assistant's; its full tag when translated (sr-Latn), else its base
// language, else English.
const wpLang = (hass, config) => {
  const l = config?.language || hass?.locale?.language || hass?.language || "en";
  const base = l.split("-")[0];
  return WP_I18N[l] ? l : WP_I18N[base] ? base : "en";
};
const wpT = (lang, key, vars = {}) => {
  const s = WP_I18N[lang]?.[key] ?? WP_I18N.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
};

// Numbers in the user's language: one decimal at most (21,4 in French, 21.4 in English).
const wpNum = (lang, v, digits = 1) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(n);
  } catch {
    return String(Math.round(n * 10 ** digits) / 10 ** digits);
  }
};
// The time as Home Assistant's profile wants it (12 / 24 h, else the language's way).
const wpTime = (lang, d = new Date(), format = "language") => {
  try {
    const cycle = format === "24" ? { hourCycle: "h23" } : format === "12" ? { hourCycle: "h12" } : {};
    return new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit", ...cycle }).format(d);
  } catch {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
};

const wpDomain = (id) => id.slice(0, id.indexOf("."));
const wpNorm = (s) => (s || "").toString().toLowerCase().replace(/[._-]+/g, " ");
const WP_OFF = new Set(["unavailable", "unknown"]);
const wpAvailable = (st) => !!st && !WP_OFF.has(st.state);

// The state as Home Assistant words it, in the user's language (HA 2023.11+), else the raw state.
const wpState = (hass, st) => {
  if (!st) return "—";
  try {
    return hass.formatEntityState ? hass.formatEntityState(st) : st.state;
  } catch {
    return st.state;
  }
};
const wpAttr = (hass, st, attr, value) => {
  try {
    return hass.formatEntityAttributeValue ? hass.formatEntityAttributeValue(st, attr, value) : String(value);
  } catch {
    return String(value);
  }
};

// Status tones: the charter's colours (green OK, amber active/heat, blue open/flow, cyan cold, violet media, red alert,
// grey at rest). Text shades pass 4.5:1 on the card in both themes.
const WP_TONES = ["ok", "warm", "open", "cold", "media", "alert", "idle"];
const WP_TONE_FILL = { ok: "#2e9d5a", warm: "#e69500", open: "#2f80ed", cold: "#00a3b4", media: "#7c4dff", alert: "#e5484d", idle: "#8a94a3" };

// The screen layouts and the devices they fit (CSS viewport sizes, see the README).
const WP_DEVICES = {
  "nspanel-86": "square",
  x1i: "square",
  "shelly-x1i": "square",
  x2i: "landscape",
  "shelly-x2i": "landscape",
  "x2i-portrait": "portrait",
  "nspanel-120": "portrait",
  square: "square",
  landscape: "landscape",
  portrait: "portrait",
};
const wpLayoutFor = (device, w, h) => {
  if (device && device !== "auto" && WP_DEVICES[device]) return WP_DEVICES[device];
  if (!w || !h) return "square";
  const r = w / h;
  return r > 1.3 ? "landscape" : r < 0.8 ? "portrait" : "square";
};
// Where the room bar goes: `navigation` is auto | bottom | left | hidden, or one of those per layout.
const wpNavFor = (navigation, layout) => {
  const v = navigation && typeof navigation === "object" ? (navigation[layout] ?? "auto") : (navigation ?? "auto");
  if (v === "bottom" || v === "left" || v === "hidden") return v;
  return layout === "landscape" ? "left" : "bottom";
};
