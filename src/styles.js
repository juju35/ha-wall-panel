// ── Styles ───────────────────────────────────────────────────────────────────
// Neutral, calm tiles (the "B" look of the ha-* cards), the 90 px illustrated banner, a floating room dock.
// Light text shades and the dark theme's are both chosen for 4.5:1 on the tiles. No filled button anywhere.

const WP_STYLES = `
:host { display: block; overflow: hidden; height: var(--wp-h, 100vh); --mdc-icon-size: 24px; }
* { box-sizing: border-box; }
ha-icon { display: inline-flex; }
.scr { position: relative; height: 100%; overflow: hidden; display: grid; grid-template: "nav main" 1fr "bnav bnav" auto / auto 1fr;
  font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, system-ui, sans-serif));
  --bg: var(--primary-background-color, #f2f3f5); --card: var(--card-background-color, #fff); --tx: var(--primary-text-color, #1d2733);
  --sub: #566170; --line: color-mix(in srgb, var(--tx) 11%, transparent); --acc: var(--primary-color, #2f6fdc);
  --ok: #2e7d32; --warm: #9a5800; --open: #1565c0; --cold: #00707c; --media: #6a3fc0; --alert: #c62828; --idle: #566170;
  background: color-mix(in srgb, var(--wall, var(--bg)) 38%, var(--bg)); color: var(--tx); }
.scr.dark { --sub: #aab3c0; --ok: #7fd68c; --warm: #ffc266; --open: #8ab8ff; --cold: #6fd3dd; --media: #c4a8ff; --alert: #ff8a80; --idle: #aab3c0;
  background: color-mix(in srgb, var(--wall, var(--bg)) 45%, var(--bg)); }
.scr.lg { --fs-n: 18px; --fs-s: 16px; --row-min: 72px; }
.slot-nav, .slot-bnav, .slot-sheet { display: contents; }
.main { grid-area: main; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none;
  -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 14px), transparent); mask-image: linear-gradient(180deg, #000 calc(100% - 14px), transparent); }
.body::-webkit-scrollbar { display: none; }

/* Banner */
.banner { position: relative; height: 90px; flex: none; overflow: hidden; container-type: inline-size; color: #1d2733; --bsub: #46566a; box-shadow: 0 1px 0 rgba(0,0,0,.06); }
.banner.night { color: #fff; --bsub: rgba(255,255,255,.8); }
.rscene { position: absolute; right: 0; bottom: 10px; height: 80px; width: min(200px, 46%); }
.ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; }
.g-parquet { background: repeating-linear-gradient(90deg, #c99a6b 0 38px, #b98a5c 38px 40px); box-shadow: inset 0 2px 0 #a97c50; }
.night .g-parquet { background: repeating-linear-gradient(90deg, #4a3a2c 0 38px, #3e3024 38px 40px); box-shadow: inset 0 2px 0 #5c4836; }
.g-tiles { background: repeating-linear-gradient(90deg, #d9dfe3 0 18px, #c6cdd2 18px 19px); box-shadow: inset 0 2px 0 #b8c0c6; }
.night .g-tiles { background: repeating-linear-gradient(90deg, #3a4250 0 18px, #2e3542 18px 19px); box-shadow: inset 0 2px 0 #4a5262; }
.g-concrete { background: #9aa1a9; box-shadow: inset 0 2px 0 #b5bbc2; }
.night .g-concrete { background: #2c323b; box-shadow: inset 0 2px 0 #3a414c; }
.g-lawn { background: repeating-linear-gradient(90deg, #5aa83d 0 22px, #6cbb4c 22px 44px); }
.night .g-lawn { background: repeating-linear-gradient(90deg, #1f4a2a 0 22px, #245433 22px 44px); }
.head { position: absolute; left: 0; top: 0; bottom: 10px; right: min(200px, 46%); display: flex; align-items: center; gap: 10px; padding: 0 6px 0 14px; min-width: 0; }
.badge { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.66); color: var(--c);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 26%, transparent); }
.night .badge { background: rgba(255,255,255,.12); color: color-mix(in srgb, var(--c) 70%, #fff); }
.titles { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
.title { font-size: 20px; font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; min-width: 0; }
.banner[data-wrap] .title { max-width: 100%; }
.bsub { font-size: 14px; line-height: 18px; color: var(--bsub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bsub b { font-weight: 600; }
.pill { flex: none; display: inline-flex; align-items: center; gap: 5px; padding: 1px 9px; border-radius: 12px; font-size: 12px; font-weight: 500; line-height: 18px; white-space: nowrap;
  background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.8)); color: color-mix(in srgb, var(--c) 50%, #0d2a45); }
.night .pill { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #fff); }
.pill::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--c); }
/* The pill does not fit beside the title: on its own line under the subtitle. */
.banner[data-wrap] .trow { display: contents; }
.banner[data-wrap] .pill { order: 9; align-self: flex-start; }
.banner[data-wrap] .titles { flex-wrap: nowrap; }
@container (max-width: 300px) { .rscene { display: none; } .head { right: 0; } }

/* Grid and tiles */
.grid { display: grid; gap: 8px; padding: 10px 12px 14px; grid-auto-rows: var(--row, 64px); grid-auto-flow: row dense; }
.grid.c2 { grid-template-columns: 1fr 1fr; }
.grid.c3 { grid-template-columns: 1.1fr 1fr 1fr; }
.tile { all: unset; box-sizing: border-box; position: relative; display: flex; align-items: center; gap: 10px; padding: 0 12px; min-height: var(--row-min, 64px); border-radius: 16px;
  background: var(--card); color: var(--tx); box-shadow: 0 1px 2px rgba(16,24,40,.06), 0 0 0 1px var(--line); cursor: pointer; min-width: 0; overflow: hidden;
  -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; transition: transform .15s; }
.dark .tile { box-shadow: 0 0 0 1px var(--line); }
.tile:active { transform: scale(.98); }
.tile:focus-visible, .hero:focus-visible, .ni:focus-visible, .gbtn:focus-visible, .pc:focus-visible, .round:focus-visible, .link:focus-visible, .hact:focus-visible, .seg button:focus-visible, .sw:focus-visible, .swb:focus-visible {
  outline: 2px solid var(--acc); outline-offset: 2px; }
.tile.large { grid-column: span 2; }
.tile .ic { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--t); background: color-mix(in srgb, var(--t) 15%, transparent); }
.tile:not(.idle) .ic { box-shadow: 0 0 0 4px color-mix(in srgb, var(--t) 7%, transparent); }
.tile.t-warm .ic { background: color-mix(in srgb, var(--t) 20%, transparent); box-shadow: 0 0 16px color-mix(in srgb, #ffb300 40%, transparent), 0 0 0 4px color-mix(in srgb, var(--t) 8%, transparent); }
.tile.idle .ic { color: var(--sub); background: color-mix(in srgb, var(--idle) 13%, transparent); }
.tile .tx { display: flex; flex-direction: column; gap: 1px; min-width: 0; padding-right: 10px; }
.tile .nm { font-size: var(--fs-n, 16px); font-weight: 600; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile .st { font-size: var(--fs-s, 14px); font-weight: 500; line-height: 1.3; color: var(--t); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile.idle .st { color: var(--sub); }
.tile .dot { position: absolute; top: 10px; right: 10px; width: 8px; height: 8px; border-radius: 50%; background: var(--t); box-shadow: 0 0 0 2px var(--card); }
.tile.idle .dot { background: color-mix(in srgb, var(--idle) 55%, transparent); }
.tile .lvl { position: absolute; left: 12px; right: 12px; bottom: 6px; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--idle) 16%, transparent); }
.tile .lvl i { display: block; height: 100%; border-radius: 2px; background: var(--t); }
.tile.na { opacity: .6; }
.tile.t-alert { box-shadow: 0 0 0 1px color-mix(in srgb, var(--alert) 45%, transparent); }
.tile.room { flex-direction: column; align-items: flex-start; justify-content: center; gap: 6px; padding: 10px 12px; }
.tile.room .ic { width: 34px; height: 34px; --mdc-icon-size: 20px; }
.t-ok { --t: var(--ok); } .t-warm { --t: var(--warm); } .t-open { --t: var(--open); } .t-cold { --t: var(--cold); } .t-media { --t: var(--media); } .t-alert { --t: var(--alert); } .idle { --t: var(--idle); }
.empty { padding: 28px 16px; text-align: center; color: var(--sub); font-size: 15px; }
.sect { font-size: 13px; font-weight: 600; letter-spacing: .02em; text-transform: uppercase; color: var(--sub); padding: 12px 14px 0; }

/* Hero */
.hero { grid-column: 1 / -1; position: relative; display: flex; align-items: center; gap: 14px; padding: 0 14px; border-radius: 18px; color: var(--tx); min-width: 0; overflow: hidden;
  background: linear-gradient(135deg, color-mix(in srgb, var(--t) 11%, var(--card)), var(--card) 70%); box-shadow: 0 1px 2px rgba(16,24,40,.06), 0 0 0 1px color-mix(in srgb, var(--t) 22%, var(--line)); }
.hero[data-hero] { cursor: pointer; }
.ring { position: relative; flex: none; width: 56px; height: 56px; color: var(--t); }
.ring svg { width: 56px; height: 56px; display: block; }
.ring span { position: absolute; inset: 0; display: grid; place-items: center; }
.ring.solo span { border-radius: 50%; background: color-mix(in srgb, var(--t) 16%, transparent); }
.hx { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.hv { font-size: 32px; font-weight: 700; line-height: 1.05; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hv span { font-size: 16px; font-weight: 600; margin-left: 3px; color: var(--sub); letter-spacing: 0; }
.hv.words { font-size: 22px; letter-spacing: -.01em; }
.hl { font-size: 14px; font-weight: 500; color: var(--t); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hchips { display: flex; flex-direction: column; gap: 5px; align-items: flex-end; flex: none; }
.hc { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px 2px 7px; border-radius: 12px; font-size: 13px; font-weight: 500; line-height: 18px; color: var(--sub);
  background: color-mix(in srgb, var(--idle) 10%, transparent); --t: var(--idle); --mdc-icon-size: 15px; }
.hc ha-icon { color: var(--t); }
.hc.t-warm, .hc.t-ok, .hc.t-open { color: var(--t); background: color-mix(in srgb, var(--t) 12%, transparent); }
.hact { all: unset; box-sizing: border-box; flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px; border-radius: 22px; font-size: 15px; font-weight: 600;
  cursor: pointer; color: var(--acc); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--acc) 55%, transparent); background: color-mix(in srgb, var(--acc) 6%, transparent); --mdc-icon-size: 20px; }
.hero.tall { grid-column: 1; grid-row: span 3; flex-direction: column; align-items: flex-start; justify-content: center; gap: 10px; padding: 14px; }
.hero.tall .hchips { flex-direction: row; flex-wrap: wrap; align-items: flex-start; margin-top: 6px; }
.hero.tall .hv { font-size: 38px; white-space: normal; }
.hero.tall .hv.words { font-size: 22px; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.hero.tall .hl { white-space: normal; }

/* Room dock (bottom) and rail (left) */
.nav { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; background: var(--card); }
.nav::-webkit-scrollbar { display: none; }
.nav.bottom { grid-area: bnav; margin: 0 8px 8px; padding: 4px; border-radius: 26px; box-shadow: 0 6px 18px rgba(16,24,40,.10), 0 0 0 1px var(--line); }
.dark .nav.bottom { box-shadow: 0 6px 18px rgba(0,0,0,.35), 0 0 0 1px var(--line); }
.ni { all: unset; flex: none; display: flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 12px; border-radius: 22px; font-size: 14px; font-weight: 500; color: var(--sub); cursor: pointer; --mdc-icon-size: 20px; }
.ni.on { color: var(--acc); font-weight: 600; background: color-mix(in srgb, var(--acc) 14%, transparent); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--acc) 40%, transparent); }
.nav.left { grid-area: nav; flex-direction: column; align-items: center; width: 76px; padding: 8px 0; overflow-x: hidden; overflow-y: auto; border-right: 1px solid var(--line); }
.nav.left .ni { width: 64px; min-height: 50px; flex-direction: column; justify-content: center; gap: 2px; padding: 4px 2px; border-radius: 14px; font-size: 11px; --mdc-icon-size: 22px; }
.nav.left .ni span { max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Popups */
.veil { position: absolute; inset: 0; z-index: 5; background: rgba(15,20,28,.42); }
.veil[hidden] { display: none; }
.sheet { position: absolute; left: 10px; right: 10px; top: 10px; z-index: 6; max-height: calc(100% - 20px); overflow-y: auto; scrollbar-width: none; background: var(--card); color: var(--tx);
  border-radius: 22px; box-shadow: 0 18px 40px rgba(10,16,28,.30), 0 0 0 1px var(--line); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.scr.landscape .sheet { left: 50%; right: auto; width: min(480px, calc(100% - 20px)); transform: translateX(-50%); }
.shead { display: flex; align-items: center; gap: 10px; }
.sbadge { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--t); background: color-mix(in srgb, var(--t) 15%, transparent); }
.stt { flex: 1; min-width: 0; }
.stt .nm { font-size: 18px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub { font-size: 13px; color: var(--sub); }
.round { all: unset; box-sizing: border-box; flex: none; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; color: var(--sub); box-shadow: inset 0 0 0 1px var(--line); cursor: pointer; }
.btns { display: flex; gap: 8px; }
.gbtn { all: unset; box-sizing: border-box; flex: 1; min-height: 56px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  font-size: 13px; font-weight: 500; cursor: pointer; color: var(--tx); box-shadow: inset 0 0 0 1px var(--line); background: color-mix(in srgb, var(--idle) 6%, transparent); }
.gbtn ha-icon { color: var(--acc); }
.gbtn.on { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--acc) 60%, transparent); color: var(--acc); }
.stepper { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.big-val { font-size: 40px; font-weight: 700; line-height: 1; letter-spacing: -.02em; }
.big-val span { font-size: 20px; font-weight: 600; color: var(--sub); margin-left: 2px; }
.big-val.words { font-size: 26px; }
.cv { display: flex; gap: 16px; align-items: center; }
.cvpic { width: 96px; height: 116px; flex: none; --cc-accent: var(--acc); }
.cvx { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }
.mt .mtt { font-size: 18px; font-weight: 600; }
.meta { font-size: 12px; color: var(--sub); line-height: 16px; }
.meta code, .yaml { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11.5px; }
.meta.ok { color: var(--ok); display: flex; align-items: center; gap: 4px; --mdc-icon-size: 16px; }
.yaml { margin: 0; padding: 8px 10px; border-radius: 10px; background: color-mix(in srgb, var(--idle) 10%, transparent); white-space: pre-wrap; user-select: all; }
.field { display: flex; align-items: center; gap: 10px; }
.field.col { flex-direction: column; align-items: stretch; }
.field > .seg, .field > .pcs { flex: 1; min-width: 0; }
.flabel { flex: none; width: 52px; font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--sub); }
.field.col .flabel { width: auto; }
.pcs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.pcs.wrap { flex-wrap: wrap; overflow: visible; }
.pc { all: unset; box-sizing: border-box; flex: none; display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 0 14px; border-radius: 22px; font-size: 14px; font-weight: 500;
  color: var(--tx); box-shadow: inset 0 0 0 1px var(--line); cursor: pointer; --mdc-icon-size: 16px; }
.pc.on { color: var(--acc); font-weight: 600; background: color-mix(in srgb, var(--acc) 10%, transparent); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--acc) 50%, transparent); }
.sheet.edit { gap: 8px; padding: 14px 14px 10px; }
.ehead { display: flex; align-items: flex-start; gap: 10px; }
.ehead > div { flex: 1; min-width: 0; }
.eti { font-size: 18px; font-weight: 600; line-height: 24px; }
.ehead .sub { display: flex; align-items: center; gap: 5px; margin-top: 1px; --mdc-icon-size: 15px; }
.ehead .sub ha-icon { color: var(--acc); }
.ehead .round { margin: -6px -6px 0 0; }
.preview { padding: 6px; border-radius: 18px; background: repeating-linear-gradient(45deg, color-mix(in srgb, var(--idle) 6%, transparent) 0 8px, transparent 8px 16px); box-shadow: inset 0 0 0 1px var(--line); }
.preview .tile { width: 100%; pointer-events: none; }
.seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; border-radius: 14px; background: color-mix(in srgb, var(--idle) 9%, transparent); }
.seg button { all: unset; box-sizing: border-box; min-height: 44px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 11px; font-size: 14px; font-weight: 500; color: var(--sub); cursor: pointer; --mdc-icon-size: 18px; }
.seg button.on { background: var(--card); color: var(--acc); font-weight: 600; box-shadow: 0 1px 3px rgba(16,24,40,.12), inset 0 0 0 1px color-mix(in srgb, var(--acc) 35%, transparent); }
.sws { border-radius: 14px; box-shadow: inset 0 0 0 1px var(--line); overflow: hidden; }
.swr, .swb { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 0 12px; cursor: pointer; color: var(--tx); }
.swr + .swr, .swd { border-top: 1px solid var(--line); }
.swr > ha-icon, .swb > ha-icon:first-child { color: var(--sub); flex: none; }
.swr > span, .swb > span { flex: 1; display: flex; flex-direction: column; font-size: 15px; font-weight: 500; line-height: 19px; }
.swr small, .swb small { font-size: 12px; font-weight: 400; color: var(--sub); }
.swb { list-style: none; padding-right: 8px; }
.swb::-webkit-details-marker { display: none; }
.swb em { font-style: normal; font-size: 14px; font-weight: 500; color: var(--acc); max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.swd .pcs { padding: 0 12px 10px; }
.sw { appearance: none; -webkit-appearance: none; margin: 0; flex: none; width: 44px; height: 26px; border-radius: 13px; position: relative; cursor: pointer; background: color-mix(in srgb, var(--idle) 30%, transparent); transition: background .2s; }
.sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform .2s; }
.sw:checked { background: var(--acc); }
.sw:checked::after { transform: translateX(18px); }
.efoot { display: flex; align-items: center; gap: 8px; }
.efoot .meta { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.efoot .sp { flex: 1; }
.link { all: unset; display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 0 6px; font-size: 14px; font-weight: 600; color: var(--acc); cursor: pointer; --mdc-icon-size: 18px; }
/* animations: false — the header scenes stand still (always-on panels: no repaint every frame). */
.still .rscene * { animation: none !important; }
@media (prefers-reduced-motion: reduce) { .tile, .sw, .sw::after { transition: none; } .tile:active { transform: none; } }
`;
