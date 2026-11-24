import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { load } from "./load.mjs";
import { sources } from "./source.mjs";

const W = load();
const LANGS = ["en", "fr", "de", "es", "it", "nl", "pt", "pl", "sr", "sr-Latn", "ro", "da", "sv", "bg", "ru", "uk", "hu", "sk", "cs", "sl", "lv", "el"];

test("every language, every key, the same placeholders", () => {
  assert.deepEqual([...Object.keys(W.WP_I18N)].sort(), [...LANGS].sort());
  const en = W.WP_I18N.en;
  for (const lang of LANGS) {
    const t = W.WP_I18N[lang];
    assert.deepEqual(Object.keys(t).sort(), Object.keys(en).sort(), lang);
    for (const [k, v] of Object.entries(en)) {
      const ph = (s) => (s.match(/\{\w+\}/g) || []).sort();
      assert.deepEqual(ph(t[k]), ph(v), `${lang}.${k}`);
      assert.ok(t[k].trim(), `${lang}.${k} empty`);
    }
  }
});

test("every key the code uses exists", () => {
  const src = readdirSync(new URL("../src/", import.meta.url))
    .filter((f) => f.endsWith(".js"))
    .map((f) => (sources[f] ?? readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8")))
    .join("\n");
  const used = new Set([...src.matchAll(/wpT\(lang, "([a-z0-9_]+)"/g)].map((m) => m[1]));
  for (const k of ["size_normal", "size_large", "size_hero", "save_failed", "yaml_hint", "leak", "door_open", "window_open", "unlocked", "co2_high", "humid"]) used.add(k);
  for (const k of used) assert.ok(k in W.WP_I18N.en, k);
});

test("language: full tag, base, English", () => {
  assert.equal(W.wpLang({ locale: { language: "sr-Latn" } }), "sr-Latn");
  assert.equal(W.wpLang({ locale: { language: "fr-CA" } }), "fr");
  assert.equal(W.wpLang({ locale: { language: "ja" } }), "en");
  assert.equal(W.wpT("fr", "lights_on", { n: 2 }), "Allumées : 2");
});
