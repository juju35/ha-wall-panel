// Evaluates src/ in a sandbox (the order scripts/build.mjs concatenates it), with minimal DOM stand-ins, and returns
// the names the tests need. No dependency, no browser.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { PARTS } from "../scripts/build.mjs";
import { sources } from "./source.mjs";

const read = (name) => (sources[`${name}.js`] ?? readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8"));
const NAMES = [
  "WP_I18N", "wpLang", "wpT", "wpNum", "wpLayoutFor", "wpNavFor", "wpRooms", "wpRoomData", "wpKind", "wpCleanName", "wpRoomAlerts",
  "wpPickHero", "wpHeroView", "wpTileView", "wpTapAction", "wpApplyEdit", "wpPatchLovelace", "wpYaml", "wpDashboardPath", "wpSceneFor",
  "wpBanner", "wpTileHtml", "wpWatched", "wpAreaEntities", "wpSaverOn", "wpHeroHtml", "wpDetailHtml", "wpEditHtml", "wpNavHtml", "customElements",
];

export const load = () => {
  const registry = new Map();
  class HTMLElement {
    constructor() {
      this.style = { setProperty() {} };
    }
  }
  const sandbox = {
    HTMLElement,
    CustomEvent: class {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    console: { info() {}, warn() {} },
    customElements: { get: (t) => registry.get(t), define: (t, c) => registry.set(t, c) },
    document: { createElement: () => ({}) },
    Intl,
  };
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  const code = PARTS.map(read).join("\n");
  return vm.runInContext(`${code}\n({ ${NAMES.join(", ")} })`, ctx);
};
