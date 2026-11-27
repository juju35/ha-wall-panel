// ── The wall panel card ──────────────────────────────────────────────────────
// One card for the whole screen: the home screen and every room, switched in place (no view navigation, nothing
// reloaded, which keeps the panels' small CPUs and old WebViews quick). Each part (banner, body, bar, popup) is
// written only when its HTML changed.

// The room scenes' animations, from ha-room-card's banner styles (scene.js), on this card's class names.
const WP_SCENE_ANIM = RC_BANNER_STYLES.split("\n")
  .filter((l) => /^\s*(\.rc-scene \.sc|@keyframes|@media \(prefers-reduced)/.test(l))
  .join("\n")
  .replaceAll(".rc-scene", ".rscene");

const WP_HOLD_MS = 500;
const WP_SHIFTS = [
  [0, 0],
  [2, 0],
  [2, 2],
  [0, 2],
  [-2, 2],
  [-2, 0],
  [-2, -2],
  [0, -2],
  [2, -2],
];

// ── In-place patching ──
// A part whose HTML changed is patched into the nodes already on screen, not rewritten: a tile pressed while a power
// reading updates stays the same button (the tap is not lost), icons and the header's scene are kept (its animations do
// not restart), the grid keeps its scroll. Children are matched by data-id / data-room / data-hero, else by position.
// (The approach of ha-flight-board-card's DOM morph, copied: the repos stay independent.)
const wpKeyOf = (n) => (n.nodeType === 1 ? (n.getAttribute("data-id") ?? n.getAttribute("data-room") ?? n.getAttribute("data-hero")) : null);
const wpPatchAttrs = (cur, next) => {
  for (const { name } of [...cur.attributes]) {
    // A <details> the user opened stays open.
    if (!next.hasAttribute(name) && !(name === "open" && cur.localName === "details")) cur.removeAttribute(name);
  }
  for (const { name, value } of next.attributes) if (cur.getAttribute(name) !== value) cur.setAttribute(name, value);
  // A switch's state is its property once touched: follow the configuration.
  if (cur.localName === "input" && cur.checked !== next.hasAttribute("checked")) cur.checked = next.hasAttribute("checked");
};
const wpPatchChildren = (cur, next) => {
  const old = [...cur.childNodes];
  const fresh = [...next.childNodes];
  const byKey = new Map();
  for (const o of old) {
    const k = wpKeyOf(o);
    if (k !== null && !byKey.has(k)) byKey.set(k, o);
  }
  const used = new Set();
  fresh.forEach((n, i) => {
    const k = wpKeyOf(n);
    let o = k !== null ? byKey.get(k) : old[i];
    if (!o || o.nodeType !== n.nodeType || o.nodeName !== n.nodeName || used.has(o) || (k === null && wpKeyOf(o) !== null)) o = null;
    const ref = cur.childNodes[i] ?? null;
    if (!o) {
      cur.insertBefore(n, ref);
      return;
    }
    used.add(o);
    if (o !== ref) cur.insertBefore(o, ref);
    if (n.nodeType === 1) {
      wpPatchAttrs(o, n);
      wpPatchChildren(o, n);
    } else if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
  });
  while (cur.childNodes.length > fresh.length) cur.removeChild(cur.lastChild);
};
const wpMorph = (el, html) => {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  wpPatchChildren(el, tpl.content);
};
// Brings an item into view inside its own bar (never scrolls the page or Home Assistant's view, as scrollIntoView can).
const wpReveal = (el) => {
  const bar = el?.parentElement;
  if (!bar?.getBoundingClientRect) return;
  const r = el.getBoundingClientRect();
  const b = bar.getBoundingClientRect();
  if (bar.scrollWidth > bar.clientWidth) bar.scrollLeft += r.left + r.width / 2 - (b.left + b.width / 2);
  if (bar.scrollHeight > bar.clientHeight) bar.scrollTop += r.top + r.height / 2 - (b.top + b.height / 2);
};
const WP_DEFAULTS = {
  start_room: "home",
  navigation: "auto",
  device: "auto",
  idle_return: 120,
  kiosk: true,
  hero: "auto",
  text_size: "normal",
  animations: true,
  pixel_shift: true,
  screensaver: "night",
  show_empty_areas: false,
};
// A large landscape screen (the X2i at 1× density, 1440 × 720 CSS px): four columns and bigger tiles.
const WP_WIDE_MIN = 1000;
// Whether the night screensaver shows: `screensaver` night (with Home Assistant's dark theme) | always | false.
const wpSaverOn = (mode, dark) => mode === "always" || ((mode ?? "night") === "night" && !!dark);

class WallPanelCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement(`${WP_TAG}-editor`);
  }

  static getStubConfig() {
    return { type: `custom:${WP_TAG}` };
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("wall-panel-card: invalid configuration");
    this._config = { ...WP_DEFAULTS, ...config, rooms: config.rooms || {} };
    this._rooms = this._config.rooms;
    this._parts = {};
    if (this.shadowRoot) this._render(true);
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._config) return;
    if (this._room === undefined) this._room = this._startRoom();
    // Home Assistant sends a new hass on every state change of the install: only the ones this panel shows redraw.
    if (prev && this._drawn && !this._relevant(prev, hass)) return;
    this._render();
  }

  // Whether an update touches what the panel shows: the registries, the theme, the language, or a watched entity.
  _relevant(a, b) {
    if (a.entities !== b.entities || a.devices !== b.devices || a.areas !== b.areas || a.floors !== b.floors) return true;
    if (!!a.themes?.darkMode !== !!b.themes?.darkMode || a.locale !== b.locale || a.language !== b.language || a.user !== b.user) return true;
    if (a.config?.location_name !== b.config?.location_name) return true;
    if (a.states === b.states) return false;
    for (const id of this._watchedFor(b)) if (a.states?.[id] !== b.states?.[id]) return true;
    return false;
  }
  _watchedFor(hass) {
    const w = this._watch;
    if (w && w.entities === hass.entities && w.devices === hass.devices && w.areas === hass.areas && w.rooms === this._rooms && w.config === this._config) return w.set;
    const set = wpWatched(hass, this._roomList(), this._cfg());
    this._watch = { entities: hass.entities, devices: hass.devices, areas: hass.areas, rooms: this._rooms, config: this._config, set };
    return set;
  }

  getCardSize() {
    return 12;
  }

  // In a sections view: the whole width (the card is made for a panel view, where it fills the screen).
  getGridOptions() {
    return { columns: "full" };
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `<style>${WP_STYLES}${WP_SCENE_ANIM}${SCENE_STYLE}</style><div class="scr"><div class="slot-nav"></div><div class="main"><div class="slot-banner"></div><div class="body"></div></div><div class="slot-bnav"></div><div class="veil" hidden></div><div class="slot-sheet"></div><div class="slot-saver"></div></div>`;
      this._wire(root);
    }
    // A new shape (the X2i turned to portrait, the first layout once the card has a size) redraws; else the rows refit.
    this._ro = new ResizeObserver(() => {
      if (this._hass && this._config && wpLayoutFor(this._config.device, this.clientWidth, this.clientHeight) !== this._layout) this._render();
      else this._fit();
    });
    this._ro.observe(this);
    this._tick();
    this._applyKiosk(true);
    this._resetIdle();
    if (this._hass) this._render(true);
  }

  disconnectedCallback() {
    this._ro?.disconnect();
    clearTimeout(this._clock);
    clearTimeout(this._idle);
    clearTimeout(this._saveT);
    clearTimeout(this._hold);
    if (this._escKey) globalThis.removeEventListener?.("keydown", this._escKey);
    this._escKey = null;
    this._applyKiosk(false);
    // Leaving the page closes any popup, running nothing.
    this._popup = null;
  }

  // The clock in the header, redrawn on each new minute (not every 30 s, up to 30 s late).
  _tick() {
    clearTimeout(this._clock);
    this._clock = setTimeout(
      () => {
        this._render();
        this._shift();
        this._tick();
      },
      60000 - (Date.now() % 60000) + 50,
    );
  }
  // Burn-in protection for screens that never sleep: every 5 minutes the whole screen moves by a pixel or two,
  // around a small square (pixel_shift: false keeps it still).
  _shift() {
    const scr = this.shadowRoot?.querySelector(".scr");
    if (!scr) return;
    const on = this._config?.pixel_shift !== false;
    const step = on ? Math.floor(Date.now() / 300000) % WP_SHIFTS.length : 0;
    const [x, y] = WP_SHIFTS[step];
    const tf = x || y ? `translate(${x}px, ${y}px)` : "";
    if (scr.style.transform !== tf) scr.style.transform = tf;
  }

  // ── State ──
  _lang() {
    return wpLang(this._hass, this._config);
  }
  _cfg() {
    return { ...this._config, rooms: this._rooms };
  }
  _roomList() {
    return wpRooms(this._hass, this._cfg());
  }
  _startRoom() {
    const rooms = this._roomList();
    let want = this._config.start_room;
    try {
      want = new URLSearchParams(globalThis.location?.search || "").get("room") || want;
    } catch {}
    if (!want || want === "home") return "home";
    const w = String(want).toLowerCase();
    return rooms.find((r) => r.id === want || r.name.toLowerCase() === w)?.id || "home";
  }
  _resetIdle() {
    clearTimeout(this._idle);
    const s = Number(this._config?.idle_return);
    if (!s || s <= 0) return;
    this._idle = setTimeout(() => {
      const start = this._startRoom();
      const saver = wpSaverOn(this._config.screensaver, this._hass?.themes?.darkMode);
      if (this._room !== start || this._popup || saver) {
        this._room = start;
        this._popup = null;
        this._saver = saver;
        this._render();
      }
    }, s * 1000);
  }

  // ── Render ──
  _put(slot, html) {
    if (this._parts[slot] === html) return false;
    this._parts[slot] = html;
    wpMorph(this.shadowRoot.querySelector(`.${slot}`), html);
    return true;
  }

  _render(force = false) {
    const root = this.shadowRoot;
    const hass = this._hass;
    if (!root || !hass || !this._config) return;
    if (force) this._parts = {};
    const lang = this._lang();
    const cfg = this._cfg();
    const rooms = this._roomList();
    if (this._room !== "home" && !rooms.some((r) => r.id === this._room)) this._room = "home";
    const night = this._config.illustration_theme === "night" || (this._config.illustration_theme !== "day" && !!hass.themes?.darkMode);
    const scr = root.querySelector(".scr");
    const layout = wpLayoutFor(this._config.device, this.clientWidth, this.clientHeight);
    const nav = wpNavFor(this._config.navigation, layout);
    const wide = layout === "landscape" && this.clientWidth >= WP_WIDE_MIN;
    this._wide = wide;
    const cls = `scr ${layout}${wide ? " wide" : ""}${night ? " dark" : ""}${this._config.text_size === "large" ? " lg" : ""}${this._config.animations === false ? " still" : ""}`;
    if (scr.className !== cls) scr.className = cls;
    this._layout = layout;
    this._drawn = true;
    const setWall = (v) => {
      if (scr.style.getPropertyValue("--wall") !== v) scr.style.setProperty("--wall", v);
    };

    // A room screen reads its own room only; the home screen every room.
    const shown = this._room === "home" ? rooms : rooms.filter((r) => r.id === this._room);
    const datas = new Map(shown.map((r) => [r.id, wpRoomData(hass, r, cfg)]));
    const alertsOf = new Map(shown.map((r) => [r.id, wpRoomAlerts(hass, r, datas.get(r.id))]));
    const navHtml = nav === "hidden" ? "" : wpNavHtml(lang, rooms, this._room, nav);
    const navMoved = this._put("slot-nav", nav === "left" ? navHtml : "") | this._put("slot-bnav", nav === "bottom" ? navHtml : "");
    // The current room stays in view in the bar.
    if (navMoved) wpReveal(root.querySelector(".ni.on"));
    // The home button when the bar is hidden: tapping the banner goes home.
    this._navHidden = nav === "hidden";

    let banner;
    let body;
    if (this._room === "home") {
      setWall(RC_WALLS.none[night ? 1 : 0]);
      const all = rooms.flatMap((r) => alertsOf.get(r.id).map((a) => ({ ...a, room: r })));
      const lit = rooms.reduce((n, r) => n + datas.get(r.id).tiles.filter((t) => t.kind === "light" && hass.states[t.id]?.state === "on").length, 0);
      const slots = rooms.slice(0, 4).map((r) => {
        const d = datas.get(r.id);
        return {
          presence: d.tiles.some((t) => t.kind === "motion" && hass.states[t.id]?.state === "on"),
          light: d.tiles.some((t) => t.kind === "light" && hass.states[t.id]?.state === "on"),
          warn: alertsOf.get(r.id).length > 0,
        };
      });
      banner = wpBanner({
        type: "home",
        theme: "overview",
        state: { slots },
        night,
        icon: "mdi:home-outline",
        title: this._config.title || hass.config?.location_name || wpT(lang, "home"),
        sub: wpSub(lang, {}, lit ? wpT(lang, "lights_on", { n: lit }) : "", hass.locale?.time_format),
        pill: all.length ? wpT(lang, "to_check_n", { n: all.length }) : wpT(lang, "all_quiet"),
        tone: all[0]?.tone || "ok",
      });
      // What needs a look: one row of chips (a tap opens the room); every room below, one line each, sized by _fit to
      // fit the screen.
      const check = all
        .map(
          (a) =>
            `<button class="chip t-${a.tone}" data-room="${wpEsc(a.room.id)}" aria-label="${wpEsc(`${a.room.name} · ${wpAlertText(lang, a)}${a.name ? ` · ${a.name}` : ""}`)}"><span class="ic">${wpIc(a.room.icon)}</span><span class="nm">${wpEsc(`${a.room.name} · ${wpAlertText(lang, a)}`)}</span></button>`,
        )
        .join("");
      const roomTiles = rooms
        .map((r) => {
          const s = wpRoomSummary(hass, lang, datas.get(r.id), alertsOf.get(r.id));
          return `<button class="tile room ${s.tone === "idle" ? "idle" : `t-${s.tone}`}" data-room="${wpEsc(r.id)}" aria-label="${wpEsc(`${r.name}, ${s.text}`)}"><span class="ic">${wpIc(r.icon)}</span><span class="tx"><span class="nm">${wpEsc(r.name)}</span><span class="st">${wpEsc(s.text)}</span></span></button>`;
        })
        .join("");
      body = `${check ? `<div class="chips" role="group" aria-label="${wpEsc(wpT(lang, "to_check"))}">${check}</div>` : ""}<div class="sect">${wpEsc(wpT(lang, "rooms"))}</div><div class="grid rooms">${roomTiles}</div>`;
    } else {
      const room = rooms.find((r) => r.id === this._room);
      const data = datas.get(room.id);
      const alerts = alertsOf.get(room.id);
      setWall((RC_WALLS[room.type] || RC_WALLS.none)[night ? 1 : 0]);
      const sc = wpSceneFor(hass, lang, room, data, alerts);
      banner = wpBanner({
        type: room.type,
        theme: sc.theme,
        state: sc.state,
        night,
        icon: room.icon,
        title: room.name,
        sub: wpSub(lang, data.env, "", hass.locale?.time_format),
        pill: alerts[0] ? wpAlertText(lang, alerts[0]) : sc.litAll ? wpT(lang, "lights_on", { n: sc.litAll }) : "",
        tone: sc.tone,
      });
      const hero = wpPickHero(hass, room, data, cfg);
      const heroView = wpHeroView(hass, lang, room, data, hero);
      const tiles = data.tiles.filter((t) => !(hero?.id && t.id === hero.id && hero.type === "entity"));
      const tall = layout === "landscape";
      const cols = wide ? 4 : layout === "landscape" ? 3 : 2;
      body = tiles.length || heroView
        ? `<div class="grid c${cols}">${wpHeroHtml(heroView, tall)}${tiles.map((t) => wpTileHtml(hass, lang, t)).join("")}</div>`
        : `<div class="empty">${wpEsc(wpT(lang, "no_devices"))}</div>`;
      this._ctx = { room, data, rooms };
    }
    const changedBanner = this._put("slot-banner", banner);
    const bodyEl = root.querySelector(".body");
    if (this._parts.body !== body) {
      this._parts.body = body;
      wpMorph(bodyEl, body);
      this._fit();
    }
    if (changedBanner) this._fitPill();
    this._renderPopup();
    this._renderSaver(hass, lang, rooms, datas);
  }

  // ── Night screensaver: a dim clock, the temperature and only what needs a look, on near-black; a tap wakes ──
  _renderSaver(hass, lang, rooms, datas) {
    const root = this.shadowRoot;
    const on = !!this._saver && wpSaverOn(this._config.screensaver, hass.themes?.darkMode);
    if (!on) this._saver = false;
    let html = "";
    if (on) {
      // The start screen's room, else every room: its temperature, and every alert of the home.
      const list = this._room === "home" ? rooms : rooms.filter((r) => r.id === this._room);
      const data = list.map((r) => datas.get(r.id) || wpRoomData(hass, r, this._cfg()));
      const temps = data.map((d) => d.env.temperature).filter((v) => v != null);
      const hums = data.map((d) => d.env.humidity).filter((v) => v != null);
      const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
      const t = avg(temps);
      const h = avg(hums);
      const alerts = rooms.flatMap((r) => wpRoomAlerts(hass, r, datas.get(r.id) || wpRoomData(hass, r, this._cfg())).map((a) => ({ ...a, room: r })));
      let date = "";
      try {
        date = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" }).format(new Date());
      } catch {}
      html = `<div class="saver" role="button" tabindex="0" aria-label="${wpEsc(wpT(lang, "tap_wake"))}"><div class="sv-clock">${wpEsc(wpTime(lang, new Date(), hass.locale?.time_format))}</div><div class="sv-date">${wpEsc(date)}</div>${
        t != null || h != null ? `<div class="sv-env">${t != null ? `<span>${wpNum(lang, t)}°</span>` : ""}${h != null ? `<span>${wpNum(lang, h, 0)} %</span>` : ""}</div>` : ""
      }${
        alerts.length
          ? `<div class="sv-chips">${alerts
              .slice(0, 4)
              .map((a) => `<span class="sv-chip t-${a.tone}">${wpEsc(`${a.room.name} · ${wpAlertText(lang, a)}`)}</span>`)
              .join("")}</div>`
          : ""
      }<div class="sv-tap">${wpEsc(wpT(lang, "tap_wake"))}</div></div>`;
    }
    this._put("slot-saver", html);
    root.querySelector(".scr").toggleAttribute("data-saver", on);
  }
  _wake() {
    if (!this._saver) return false;
    this._saver = false;
    this._resetIdle();
    this._render();
    return true;
  }

  // Tile rows: as tall as the screen allows when everything fits (64–96 px), else 64 px and the grid scrolls.
  _fit() {
    const body = this.shadowRoot?.querySelector(".body");
    if (!body) return;
    const lg = this._config.text_size === "large";
    const set = (el, prop, v) => {
      if (el.style.getPropertyValue(prop) !== v) el.style.setProperty(prop, v);
    };
    if (this._room === "home") {
      // Every room in view: the fewest columns whose rows (64–72 px, 112 on a large landscape) fit; else scroll.
      const grid = body.querySelector(".grid.rooms");
      if (!grid) return;
      const n = grid.children.length;
      const base = this._wide ? 4 : this._layout === "landscape" ? 3 : 2;
      const max = this._wide ? 112 : 72;
      const min = lg ? 72 : 64;
      const cs = getComputedStyle(grid);
      const gap = Number.parseFloat(cs.rowGap) || 8;
      const avail = body.clientHeight - (grid.offsetTop - body.offsetTop) - (Number.parseFloat(cs.paddingTop) || 0) - (Number.parseFloat(cs.paddingBottom) || 0);
      let cols = base;
      let row = min;
      for (const c of [base, base + 1]) {
        const rows = Math.ceil(n / c);
        const fill = Math.floor((avail - (rows - 1) * gap) / rows);
        cols = c;
        row = Math.max(min, Math.min(max, fill));
        if (fill >= min) break;
        if (c === base + 1) {
          cols = base;
          row = min;
        }
      }
      set(grid, "grid-template-columns", `repeat(${cols}, minmax(0, 1fr))`);
      // Narrow tiles (an extra column to keep every room in view): a smaller icon, more room for the words.
      grid.classList.toggle("dense", !this._wide && grid.clientWidth / cols < 190);
      set(grid, "--row", `${row}px`);
      return;
    }
    // Tile rows: as tall as the screen allows when everything fits (64–96 px, 128 on a large landscape), else 64 px
    // and the grid scrolls.
    const grid = body.querySelector(".grid.c2, .grid.c3, .grid.c4");
    if (!grid) return;
    const cols = grid.classList.contains("c4") ? 4 : grid.classList.contains("c3") ? 3 : 2;
    let units = 0;
    let heroRows = 0;
    for (const el of grid.children) {
      if (el.classList.contains("hero")) heroRows = el.classList.contains("tall") ? 0 : 1;
      else units += el.classList.contains("large") ? 2 : 1;
    }
    const tileCols = cols >= 3 && grid.querySelector(".hero.tall") ? cols - 1 : cols;
    const rows = Math.ceil(units / tileCols) + heroRows;
    const gap = cols === 4 ? 12 : 8;
    const avail = body.clientHeight - (cols === 4 ? 28 : 24);
    const fill = rows ? (avail - (rows - 1) * gap) / rows : 64;
    const min = lg ? 72 : 64;
    set(grid, "--row", `${Math.round(Math.max(min, Math.min(cols === 4 ? 128 : 96, fill)))}px`);
  }

  // The status pill on its own line when the title and it do not fit on one.
  _fitPill() {
    const b = this.shadowRoot.querySelector(".banner");
    const title = b?.querySelector(".title");
    if (!title || !b.querySelector(".pill")) return;
    b.removeAttribute("data-wrap");
    // The title gives way first (min-width 0): it is cut when the pill does not fit beside it.
    if (title.scrollWidth > title.clientWidth + 1) b.setAttribute("data-wrap", "");
  }

  // ── Popups ──
  _renderPopup() {
    const root = this.shadowRoot;
    const veil = root.querySelector(".veil");
    const p = this._popup;
    const ctx = this._ctx;
    let html = "";
    if (p && this._room !== "home" && ctx) {
      const t = ctx.data.tiles.find((x) => x.id === p.id) || this._tileFor(p.id, ctx);
      if (!t || !this._hass.states[p.id]) this._popup = null;
      else if (p.kind === "detail") html = wpDetailHtml(this._hass, this._lang(), t, ctx.room);
      else
        html = wpEditHtml(this._hass, this._lang(), t, {
          ...ctx,
          config: this._cfg(),
          canSave: !!this._hass.user?.is_admin,
          yaml: p.yaml,
          status: p.status,
        });
    } else this._popup = null;
    veil.hidden = !this._popup;
    if (this._put("slot-sheet", html) && html) {
      if (!this._escKey) {
        this._escKey = (e) => e.key === "Escape" && this._closePopup();
        globalThis.addEventListener?.("keydown", this._escKey);
      }
    }
    if (!html && this._escKey) {
      globalThis.removeEventListener?.("keydown", this._escKey);
      this._escKey = null;
    }
  }
  _tileFor(id, ctx) {
    if (!this._hass.states[id]) return null;
    return { id, kind: wpKind(this._hass, id) || "other", name: wpCleanName(wpName(this._hass, id), ctx.room.name), group: [], auto: false };
  }
  _openPopup(kind, id) {
    this._popup = { kind, id };
    this._renderPopup();
    wpReveal(this.shadowRoot.querySelector(".slot-sheet .pc.on"));
  }
  _closePopup() {
    this._popup = null;
    this._renderPopup();
  }

  // ── Actions ──
  _call(svc, data = {}) {
    const [domain, service] = svc.split(".");
    return this._hass.callService(domain, service, data);
  }
  _tap(id) {
    const ctx = this._ctx;
    const t = ctx?.data.tiles.find((x) => x.id === id);
    if (!t) return;
    const act = wpTapAction(t);
    const ids = [t.id, ...(t.group || [])];
    if (act === "toggle") this._call("homeassistant.toggle", { entity_id: ids.length > 1 ? ids : t.id });
    else if (act === "scene") this._call("scene.turn_on", { entity_id: t.id });
    else this._openPopup("detail", t.id);
  }
  _moreInfo(id) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: id }, bubbles: true, composed: true }));
  }
  async _edit(edit) {
    const p = this._popup;
    const ctx = this._ctx;
    if (!p || !ctx) return;
    const t = ctx.data.tiles.find((x) => x.id === p.id) || this._tileFor(p.id, ctx);
    const rooms = wpApplyEdit(this._rooms, ctx.room.id, p.id, edit, !!t?.auto);
    this._rooms = rooms;
    const moved = edit.move && edit.move !== ctx.room.id;
    if (moved || edit.show === false) {
      // The tile left this screen: the popup stays on its customization in the other room, or closes.
      this._popup = moved ? { kind: "edit", id: p.id } : null;
      if (moved) this._room = edit.move;
    }
    this._render();
    await this._save(rooms);
  }
  // Saves `rooms` to the dashboard (admins), else shows them as YAML to copy.
  async _save(rooms) {
    const hass = this._hass;
    const p = this._popup;
    const lang = this._lang();
    const show = (patch) => {
      if (this._popup && p && this._popup.id === p.id) {
        Object.assign(this._popup, { yaml: null, status: null }, patch);
        this._renderPopup();
      }
    };
    if (!hass.user?.is_admin) return show({ yaml: wpYaml(rooms) });
    clearTimeout(this._saveT);
    this._saveT = setTimeout(async () => {
      try {
        const url_path = wpDashboardPath();
        const current = await hass.callWS({ type: "lovelace/config", url_path });
        const next = wpPatchLovelace(current, rooms);
        if (!next) return show({ yaml: wpYaml(rooms) });
        await hass.callWS({ type: "lovelace/config/save", url_path, config: next });
        show({ status: wpT(lang, "saved") });
      } catch (err) {
        console.warn("wall-panel-card: save failed", err);
        show({ yaml: wpYaml(rooms) });
      }
    }, 500);
  }

  // ── Events (delegated) ──
  _wire(root) {
    let held = false;
    const target = (e) => e.target.closest?.("[data-id], [data-hero]");
    let woke = false;
    root.addEventListener("pointerdown", (e) => {
      // The screensaver's tap only wakes the screen: nothing under it runs (its click, if the browser still sends one
      // once the screensaver is gone, is dropped; a new press starts afresh).
      woke = false;
      if (this._wake()) {
        woke = true;
        e.preventDefault();
        return;
      }
      this._resetIdle();
      const el = target(e);
      held = false;
      clearTimeout(this._hold);
      if (!el || el.closest(".sheet")) return;
      this._hold = setTimeout(() => {
        held = true;
        this._openPopup("detail", el.dataset.id || el.dataset.hero);
      }, WP_HOLD_MS);
    });
    const cancel = () => clearTimeout(this._hold);
    root.addEventListener("pointerup", cancel);
    root.addEventListener("pointercancel", cancel);
    root.addEventListener("pointerleave", cancel, true);
    root.addEventListener("contextmenu", (e) => {
      const el = target(e);
      if (!el || el.closest(".sheet")) return;
      e.preventDefault();
      clearTimeout(this._hold);
      held = true;
      this._openPopup("detail", el.dataset.id || el.dataset.hero);
    });
    root.addEventListener("keydown", (e) => {
      if (this._saver && (e.key === "Enter" || e.key === " " || e.key === "Escape")) {
        e.preventDefault();
        this._wake();
        return;
      }
      const hero = e.target.closest?.(".hero[data-hero]");
      if (hero && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        this._openPopup("detail", hero.dataset.hero);
      }
    });
    root.addEventListener("click", (e) => {
      const el = e.target;
      if (woke || el.closest?.(".saver")) {
        woke = false;
        if (el.closest?.(".saver")) this._wake();
        return;
      }
      if (held) {
        held = false;
        if (!el.closest(".sheet")) return;
      }
      if (el.closest(".veil")) return this._closePopup();
      const sheet = el.closest(".sheet");
      if (sheet) return this._sheetClick(el);
      const nav = el.closest("[data-room]");
      if (nav) {
        this._room = nav.dataset.room;
        this._popup = null;
        this.shadowRoot.querySelector(".body").scrollTop = 0;
        return this._render();
      }
      const heroAct = el.closest("[data-hero-act]");
      if (heroAct) {
        const id = el.closest("[data-hero]")?.dataset.hero;
        const act = heroAct.dataset.heroAct;
        if (act === "lock") this._call("lock.lock", { entity_id: id });
        else if (act === "unlock") this._openPopup("detail", id);
        else if (act === "play_pause") this._call("media_player.media_play_pause", { entity_id: id });
        return;
      }
      const tile = el.closest("[data-id]");
      if (tile) return this._tap(tile.dataset.id);
      const hero = el.closest("[data-hero]");
      if (hero) return this._openPopup("detail", hero.dataset.hero);
      if (this._navHidden && el.closest(".banner") && this._room !== "home") {
        this._room = "home";
        this._render();
      }
    });
    root.addEventListener("change", (e) => {
      const el = e.target;
      if (el.matches?.("[data-pin]")) this._edit({ pin: el.checked });
      else if (el.matches?.("[data-show]")) this._edit({ show: el.checked });
    });
  }

  _sheetClick(el) {
    const p = this._popup;
    if (!p) return;
    if (el.closest("[data-close]")) return this._closePopup();
    const svc = el.closest("[data-svc]");
    if (svc) {
      const t = this._ctx.data.tiles.find((x) => x.id === p.id);
      const ids = [p.id, ...(t?.group || [])];
      let data = {};
      try {
        data = JSON.parse(svc.dataset.data || "{}");
      } catch {}
      return this._call(svc.dataset.svc, { entity_id: ids.length > 1 ? ids : p.id, ...data });
    }
    if (el.closest("[data-more]")) {
      const id = p.id;
      this._closePopup();
      return this._moreInfo(id);
    }
    if (el.closest("[data-edit]")) return this._openPopup("edit", p.id);
    const size = el.closest("[data-size]");
    if (size) return this._edit({ size: size.dataset.size });
    const move = el.closest("[data-move]");
    if (move) return this._edit({ move: move.dataset.move });
    const group = el.closest("[data-group]");
    if (group) return this._edit({ group: group.dataset.group });
    if (el.closest("[data-reset]")) return this._edit({ reset: true });
  }

  // ── Kiosk: Home Assistant's toolbar and sidebar out of the way (not in edit mode, not with ?kiosk=0) ──
  _applyKiosk(on) {
    let off = false;
    try {
      off = new URLSearchParams(globalThis.location?.search || "").get("kiosk") === "0";
    } catch {}
    const enable = on && this._config?.kiosk !== false && !off;
    const roots = [];
    let node = this;
    for (let i = 0; i < 12 && node; i++) {
      const host = node.getRootNode?.()?.host;
      if (!host) break;
      if (host.localName === "hui-root" || host.localName === "home-assistant-main") roots.push(host);
      node = host;
    }
    const edit = roots.some((h) => h.localName === "hui-root" && h.lovelace?.editMode);
    for (const host of roots) {
      const sr = host.shadowRoot;
      if (!sr) continue;
      let st = sr.getElementById?.("wp-kiosk");
      if (enable && !edit) {
        if (!st) {
          st = document.createElement("style");
          st.id = "wp-kiosk";
          sr.appendChild(st);
        }
        st.textContent =
          host.localName === "hui-root"
            ? ".header, .toolbar, app-header, ha-top-app-bar-fixed { display: none !important; } #view { padding-top: 0 !important; min-height: 100vh !important; }"
            : "ha-sidebar { display: none !important; } ha-drawer { --mdc-drawer-width: 0px !important; }";
      } else st?.remove();
    }
    const kiosk = enable && !edit && roots.length > 0;
    this.style.setProperty("--wp-h", this._config?.height || (kiosk ? "100vh" : "calc(100vh - var(--header-height, 56px))"));
  }
}

if (!customElements.get(WP_TAG)) customElements.define(WP_TAG, WallPanelCard);
globalThis.customCards = globalThis.customCards || [];
if (!globalThis.customCards.some((c) => c.type === WP_TAG)) globalThis.customCards.push({
  type: WP_TAG,
  name: "Wall Panel",
  description: "A whole screen for small wall panels (Sonoff NSPanel Pro, Shelly Wall Display): every room, detected automatically.",
  preview: false,
  documentationURL: "https://github.com/juju35/ha-wall-panel",
});
console.info(`%c WALL-PANEL %c v${WP_VERSION} `, "background:#2f6fdc;color:#fff;font-weight:700", "");
