// ── Visual editor: the simple options only ───────────────────────────────────
// Home Assistant's own form (ha-form). `rooms`, `areas` and `exclude_areas` are lists and objects: YAML only (README),
// kept untouched when the form changes the rest.

const WP_EDIT_DEVICES = ["auto", "nspanel-86", "x1i", "x2i", "x2i-portrait", "nspanel-120"];
const WP_DEVICE_LABELS = { "nspanel-86": "NSPanel Pro 86", x1i: "Shelly Wall Display X1i", x2i: "Shelly Wall Display X2i", "x2i-portrait": "Shelly Wall Display X2i (portrait)", "nspanel-120": "NSPanel Pro 120" };

class WallPanelCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._draw();
  }
  set hass(hass) {
    this._hass = hass;
    this._draw();
  }
  _schema() {
    const lang = wpLang(this._hass, this._config);
    const t = (k) => wpT(lang, k);
    const opts = (list) => ({ select: { mode: "dropdown", options: list.map(([value, label]) => ({ value, label })) } });
    const rooms = this._hass ? wpRooms(this._hass, this._config) : [];
    return [
      { name: "title", selector: { text: {} } },
      { name: "start_room", selector: opts([["home", t("home")], ...rooms.map((r) => [r.id, r.name])]) },
      { name: "navigation", selector: opts(["auto", "bottom", "left", "hidden"].map((v) => [v, t(v)])) },
      { name: "device", selector: opts(WP_EDIT_DEVICES.map((v) => [v, v === "auto" ? t("auto") : WP_DEVICE_LABELS[v]])) },
      { name: "hero", selector: opts([["auto", t("auto")], ["none", t("none")]]) },
      { name: "text_size", selector: opts([["normal", t("size_normal")], ["large", t("size_large")]]) },
      { name: "illustration_theme", selector: opts([["auto", t("follow_theme")], ["day", t("day")], ["night", t("night")]]) },
      { name: "idle_return", selector: { number: { min: 0, max: 3600, step: 10, mode: "box", unit_of_measurement: "s" } } },
      { name: "language", selector: opts([["auto", t("auto")], ...Object.keys(WP_I18N).map((l) => [l, l])]) },
      { name: "height", selector: { text: {} } },
      { name: "screensaver", selector: opts([["night", t("saver_night")], ["always", t("saver_always")], ["off", t("saver_off")]]) },
      { name: "show_empty_areas", selector: { boolean: {} } },
      { name: "kiosk", selector: { boolean: {} } },
      { name: "animations", selector: { boolean: {} } },
      { name: "pixel_shift", selector: { boolean: {} } },
    ];
  }
  _draw() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (e) => this._changed(e.detail.value));
      this.appendChild(this._form);
    }
    const lang = wpLang(this._hass, this._config);
    const nav = this._config.navigation;
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    this._form.computeLabel = (s) => wpT(lang, `ed_${s.name}`);
    this._form.data = {
      ...WP_DEFAULTS,
      ...this._config,
      navigation: typeof nav === "string" ? nav : "auto",
      hero: this._config.hero === false || this._config.hero === "none" ? "none" : "auto",
      illustration_theme: this._config.illustration_theme || "auto",
      language: this._config.language || "auto",
      screensaver: this._config.screensaver === false ? "off" : this._config.screensaver || "night",
    };
  }
  _changed(value) {
    const next = { ...this._config };
    for (const [k, v] of Object.entries(value)) {
      if (!this._schema().some((s) => s.name === k)) continue;
      if (k === "navigation" && typeof this._config.navigation === "object" && v === "auto") continue;
      if (k === "hero") next.hero = v === "none" ? false : "auto";
      else if (k === "screensaver") next.screensaver = v === "off" ? false : v;
      else if ((k === "illustration_theme" || k === "language") && v === "auto") delete next[k];
      else if (v === "" || v == null) delete next[k];
      else next[k] = v;
    }
    // Defaults stay out of the YAML.
    for (const [k, v] of Object.entries(WP_DEFAULTS)) if (next[k] === v) delete next[k];
    this._config = next;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: next }, bubbles: true, composed: true }));
  }
}
if (!customElements.get(`${WP_TAG}-editor`)) customElements.define(`${WP_TAG}-editor`, WallPanelCardEditor);
