# Changelog

## 1.1.0 - 2026-11-21

### Features
- Smoke, gas and carbon monoxide detectors (`binary_sensor` of class `smoke`, `gas`, `carbon_monoxide`) are detected: a `safety` tile, an alert on the home screen and the room's hero when they trip.
- `pixel_shift` (on by default): burn-in protection, the whole screen moves by 2 px every 5 minutes.
- `animations: false`: the header scenes stand still.
- Visual editor: `animations`, `pixel_shift`, `language` and `height` fields.

### Fixes
- A tap is no longer lost when an update lands between the press and the release: the screen is patched in place (tiles, icons and the header scene are kept) instead of rewritten.
- One appliance tile per device: its operation state, not its programme selectors, progress or finish time.
- The layout follows a resize (Shelly X2i turned to portrait) without waiting for a state change.
- The room bar and the popup chips scroll themselves instead of calling `scrollIntoView` (which could scroll Home Assistant's view).
- Touch targets of the popups (chips, segments, links, close button) reach 44 px; the "Needs a look" rows match the 64 px tiles.
- The header clock changes on the minute; timers and the Escape listener are cleared when the panel leaves the page.
- Light colours are checked before they go into the header picture; the banner's narrow-width rule now applies.

### Performance
- Only the updates of the entities on screen redraw anything; a room screen computes its own room only, from an area index built once per registry (2,000-entity install, 6× CPU throttle: 76 ms → 1.4 ms per unrelated update, 76 ms → 16 ms per relevant one).
- No backdrop blur behind the popups (costly on the panels' GPUs).

### Maintenance
- `scripts/screenshots/stability.mjs`, run with the screenshots: no DOM change on unrelated updates, in-place patches, steady height, taps kept across an update. New capture at the Shelly X2i portrait size (360 × 720).

## 1.0.0 - 2026-11-21

### Features
- First release: a whole dashboard for small wall panels (Sonoff NSPanel Pro 86 / 120, Shelly Wall Display X1i / X2i), as a dashboard strategy (`custom:wall-panel`), a view strategy and a card (`custom:wall-panel-card`).
- One screen per Home Assistant area, devices detected automatically; a home screen with what needs a look and every room.
- Illustrated headers (room scenes of ha-room-card) following each room's state; a hero tile with what matters most right now.
- Square, landscape and portrait layouts from the screen's shape; room bar at the bottom or on the left (`navigation`), configurable per layout.
- Tap to toggle, press and hold for the device's controls and **Customize** (size, room, pin, show, group, reset), saved to the dashboard or shown as YAML.
- Kiosk mode, return to the start screen after a while, `?room=` per panel, light and dark, 22 languages.
- Visual editor for the simple options (per-room settings stay in YAML); animated header GIFs in the README.
