// Shared by the screenshot scripts: theme variables, an <ha-icon> stand-in, the render loop and the pixel comparison.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as mdi from "@mdi/js";
import { chromium } from "playwright";

export const root = fileURLToPath(new URL("../..", import.meta.url));
let bundle;
const cardJs = () => (bundle ??= readFileSync(`${root}dist/ha-wall-panel.js`, "utf8"));

// Every mdi:* icon the card or the mock data can use, as SVG paths for the <ha-icon> stand-in.
export const iconsFor = (extra = []) => {
  const icons = {};
  for (const name of new Set([...cardJs().match(/mdi:[a-z0-9-]+/g), ...extra])) {
    const key = `mdi${name.slice(4).replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase())}`;
    if (mdi[key]) icons[name.slice(4)] = mdi[key];
  }
  return icons;
};

const THEMES = {
  light: { "--primary-background-color": "#eef0f3", "--card-background-color": "#ffffff", "--primary-text-color": "#1d2733" },
  dark: { "--primary-background-color": "#111418", "--card-background-color": "#1e2229", "--primary-text-color": "#eef1f5" },
};

const haIcon = (icons) => `
const ICONS = ${JSON.stringify(icons)};
customElements.define("ha-icon", class extends HTMLElement {
  static get observedAttributes() { return ["icon"]; }
  connectedCallback() { this._draw(); }
  attributeChangedCallback() { this._draw(); }
  _draw() {
    const path = ICONS[(this.getAttribute("icon") || "").replace("mdi:", "")] || "";
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = '<style>:host{display:inline-flex}</style><svg viewBox="0 0 24 24" style="width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);fill:currentColor"><path d="' + path + '"/></svg>';
  }
});`;

const pageHtml = (theme, w, h) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  :root { ${Object.entries({ ...THEMES[theme], "--primary-color": "#2f6fdc" }).map(([k, v]) => `${k}:${v};`).join("")} }
  body { margin: 0; background: var(--primary-background-color); font-family: Roboto, "Segoe UI", Helvetica, Arial, sans-serif; }
  #root { width: ${w}px; height: ${h}px; }
</style></head><body><div id="root"></div></body></html>`;

export const launch = () => chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

// A light shot and its dark twin.
export const pair = (file, extra = {}) => [
  { file, theme: "light", ...extra },
  { file: `${file}-dark`, theme: "dark", ...extra },
];

// Writes a PNG only when its decoded pixels differ from the file already there (PNG bytes vary between runs).
export const writeIfChanged = async (page, path, png) => {
  if (existsSync(path)) {
    const same = await page.evaluate(
      async ([a, b]) => {
        const pixels = async (b64) => {
          const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
          const bmp = await createImageBitmap(blob, { colorSpaceConversion: "none", premultiplyAlpha: "none" });
          const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext("2d");
          ctx.drawImage(bmp, 0, 0);
          return { w: bmp.width, h: bmp.height, d: ctx.getImageData(0, 0, bmp.width, bmp.height).data };
        };
        const [x, y] = await Promise.all([pixels(a), pixels(b)]);
        if (x.w !== y.w || x.h !== y.h) return false;
        for (let i = 0; i < x.d.length; i++) if (x.d[i] !== y.d[i]) return false;
        return true;
      },
      [readFileSync(path).toString("base64"), png.toString("base64")],
    );
    if (same) return false;
  }
  writeFileSync(path, png);
  return true;
};

// Opens a page holding the card in the state a shot describes ({ theme, w, h, config, room, popup }).
export const render = async (browser, s, hass, icons = iconsFor()) => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: s.w, height: s.h }, locale: "en-GB", timezoneId: "UTC" });
  const page = await context.newPage();
  // A fixed clock: the banner shows the time, and the comparison is exact.
  await page.clock.setFixedTime(new Date("2026-11-21T14:32:00Z"));
  page.on("pageerror", (err) => console.error(`pageerror (${s.file}): ${err.message}`));
  await page.setContent(pageHtml(s.theme, s.w, s.h));
  await page.addScriptTag({ content: haIcon(icons) });
  await page.addScriptTag({ content: cardJs() });
  await page.evaluate(
    ({ hass, s }) => {
      const el = document.createElement("wall-panel-card");
      el.setConfig({ type: "custom:wall-panel-card", kiosk: false, height: `${s.h}px`, idle_return: 0, ...s.config });
      const fmt = (v) => String(v).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
      el.hass = {
        ...hass,
        themes: { darkMode: s.theme === "dark" },
        formatEntityState: (st) => (st.attributes.unit_of_measurement ? `${st.state} ${st.attributes.unit_of_measurement}` : fmt(st.state)),
        formatEntityAttributeValue: (_st, _a, v) => fmt(v),
        callService: async () => {},
        callWS: async () => ({}),
      };
      document.getElementById("root").appendChild(el);
      el._room = s.room || "home";
      el._render(true);
      if (s.popup) el._openPopup(s.popup[0], s.popup[1]);
      if (s.saver) {
        el._saver = true;
        el._render();
      }
    },
    { hass, s },
  );
  await page.waitForTimeout(500);
  return { page, context };
};

// Renders each shot into screenshots/<file>.png.
export const shoot = async ({ shots, hass }) => {
  const icons = iconsFor();
  const browser = await launch();
  for (const s of shots) {
    const { page, context } = await render(browser, s, hass, icons);
    const out = `screenshots/${s.file}.png`;
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: s.w, height: s.h }, animations: "disabled" });
    console.log(`${out}${(await writeIfChanged(page, `${root}${out}`, png)) ? "" : " (unchanged)"}`);
    await context.close();
  }
  await browser.close();
};
