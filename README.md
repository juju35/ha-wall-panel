# ha-wall-panel

[![Marketplace](https://img.shields.io/badge/Marketplace-Custom-41BDF5.svg)](https://www.home-assistant.io/integrations/marketplace/)
[![HACS Validation](https://github.com/juju35/ha-wall-panel/actions/workflows/hacs.yml/badge.svg)](https://github.com/juju35/ha-wall-panel/actions/workflows/hacs.yml)
[![Validate](https://github.com/juju35/ha-wall-panel/actions/workflows/validate.yml/badge.svg)](https://github.com/juju35/ha-wall-panel/actions/workflows/validate.yml)
[![Lint](https://github.com/juju35/ha-wall-panel/actions/workflows/lint.yml/badge.svg)](https://github.com/juju35/ha-wall-panel/actions/workflows/lint.yml)
[![Release](https://img.shields.io/github/v/release/juju35/ha-wall-panel)](https://github.com/juju35/ha-wall-panel/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/juju35/ha-wall-panel/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/julienstep9)

<p align="center"><img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/images/icon.svg" alt="Wall Panel" width="120"></p>

A whole Home Assistant dashboard for **small wall panels** — Sonoff NSPanel Pro, Shelly Wall Display X1i / X2i and the like. Every room gets its own screen, its devices **detected automatically**, with the illustrated headers of the ha-* cards, big tiles you can hit with a finger and text you can read from across the room. Everything the detection decides can be changed, from the panel itself or in YAML.

[![Open your Home Assistant instance and open a repository inside the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-wall-panel&category=plugin)

| Home | Living room | Entrance | Bathroom |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/square-home.png" alt="Home screen" width="220"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/square-living.png" alt="Living room" width="220"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/square-entrance.png" alt="Entrance" width="220"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/square-bathroom.png" alt="Bathroom" width="220"> |

## Features

- **One screen per room**, built from your Home Assistant areas: lights, covers, climate, fans, media players, locks, alarm panels, plugs and switches, appliances, water heaters, humidifiers, vacuums and mowers, cameras, door / window / motion / leak sensors, smoke / gas / CO detectors and scenes.
- **A home screen**: the cutaway house of ha-room-card lit room by room, what needs a look as one row of chips (an open door, an unlocked lock, stale air, a humid bathroom, a water leak, a smoke, gas or CO alarm — a tap opens the room) and every room on one line (icon, name, state), sized so that they all fit on the screen.
- **Illustrated headers** (90 px, as on every ha-* card): the room's wall colour, furniture and floor, and a scene that follows the room's state — the lamps that are on, the door left open, the humidity, the electrical panel.
- **A hero tile**: what matters most in the room right now, in large — a leak, the CO₂, an unlocked door, the humidity, what is playing, the heating, else the temperature — with its ring and a one-tap action (Lock, Play / pause).
- **Made for small screens**: 480 × 480, 720 × 360, 375 × 667… the layout (square, landscape, portrait) follows the screen, tiles grow to fill it and scroll when a room has many devices. A large landscape (1,000 px wide and more, the X2i at 1× density) gets four columns, 128 px rows, bigger icons and text, and a wider room rail.
- **Night screensaver**: after the idle delay, with Home Assistant's dark theme on, a dim clock, the temperature and only what needs a look, on near-black; a tap wakes the panel (and does nothing else). The light theme keeps the normal screen.
- **Easy to use and to read**: tiles of 64 px and more, 16 px names, 4.5:1 contrast, real buttons with spoken labels, no slider (the Shelly launcher uses the horizontal swipe), animations off with *reduce motion*, a `text_size: large` option.
- **Tap** toggles a light or a plug and opens the controls of the rest; **press and hold** opens the controls of anything, with **Customize**: size (normal, large, hero), room, pin, show / hide, group — saved to the dashboard.
- **Kiosk**: Home Assistant's toolbar and sidebar are hidden on the panel (not in edit mode).
- **Always-on friendly**: the screen moves by 2 px every 5 minutes against burn-in (`pixel_shift`), the header scenes can stand still (`animations: false`), and only the updates of the entities on screen redraw anything — patched in place, so a tap is never lost to a refresh.
- **Back to the start screen** after a while without a touch; each panel can open on its own room (`?room=kitchen`).
- **Visual editor** for the simple options; the per-room settings stay in YAML.
- **Light and dark**, the night pictures following the theme; 22 languages.

## Supported screens

| Screen | Panel | Layout | Navigation |
|---|---|---|---|
| Sonoff NSPanel Pro 86 | 3.95″, 480 × 480 | square | bar at the bottom |
| Shelly Wall Display X1i | 4″, 720 × 720 | square | bar at the bottom |
| Shelly Wall Display X2i | 6.95″, 1440 × 720, landscape | landscape | rail on the left |
| Shelly Wall Display X2i | portrait | portrait | bar at the bottom |
| Sonoff NSPanel Pro 120 | 4.7″, 750 × 1334 | portrait | bar at the bottom |
| Any other screen or browser | — | from its shape | as above |

The layout is chosen from the card's own size: wider than 1.3 × its height is landscape, taller than 1.25 × its width is portrait, square otherwise. `device:` forces it.

These panels have small CPUs: the card is a single element, switches rooms in place without reloading anything, and writes only the parts of the screen that changed. Keep the panel's WebView up to date (Shelly: **Settings → Home Assistant**, NSPanel Pro: Android System WebView).

## Prerequisites

- Home Assistant 2024.8 or later
- Your devices assigned to **areas** (the entity's area, or its device's)

## Installation

### Via the Marketplace (recommended)

Click the button below to add the repository directly:

[![Add to the Marketplace](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-wall-panel&category=plugin)

Or manually:

1. Open **Settings → Marketplace → Add from link** (top right; this needs a GitHub account connected)
2. Add `https://github.com/juju35/ha-wall-panel` — Category: **Dashboard** (Lovelace)
3. Open **Wall Panel** and click **Install**
4. Clear your browser cache and refresh

### Manual

1. Download `ha-wall-panel.js` and the `ha-wall-panel.i18n.*.js` translation files from the [latest release](https://github.com/juju35/ha-wall-panel/releases/latest)
2. Copy them all to `/config/www/community/ha-wall-panel/`
3. Go to **Settings → Dashboards → Resources** → Add resource:
   - URL: `/local/community/ha-wall-panel/ha-wall-panel.js`
   - Type: **JavaScript Module**
4. Clear your browser cache and refresh

## Configuration

### A dashboard for the panel (recommended)

Create a dashboard (**Settings → Dashboards → Add dashboard → New dashboard from scratch**), open its raw configuration editor and replace everything with:

```yaml
strategy:
  type: custom:wall-panel
```

That's all: the dashboard holds one full-screen view with every room. Open it on the panel (Shelly: **Settings → Home Assistant → dashboard**, NSPanel Pro: the Home Assistant app or a kiosk browser). Every option below goes under `strategy:`.

### The card in a view of your own

```yaml
type: panel
cards:
  - type: custom:wall-panel-card
```

or, in a view: `strategy: { type: custom:wall-panel }`.

### Options

The visual editor covers every option below except `areas`, `exclude_areas`, `rooms` and the per-layout form of `navigation`, which are YAML only (the editor keeps them as they are).

| Option | Default | Description |
|---|---|---|
| `start_room` | `home` | The screen shown first, and after `idle_return`: `home` or an area ID. The page address wins: `…/panel?room=kitchen` (area ID or name) opens a panel on its room |
| `navigation` | `auto` | Where the room bar goes: `auto` (bottom on a square or portrait screen, left in landscape), `bottom`, `left`, `hidden` (tap the header to go home). Or per layout: `{square: bottom, portrait: bottom, landscape: left}` |
| `device` | `auto` | Forces the layout: `nspanel-86`, `x1i` (square), `x2i` (landscape), `x2i-portrait`, `nspanel-120` (portrait), or `square` / `landscape` / `portrait` |
| `idle_return` | `120` | Seconds without a touch before going back to `start_room` (and closing a popup); `0` never |
| `kiosk` | `true` | Hide Home Assistant's toolbar and sidebar while the panel is shown (never in edit mode; `?kiosk=0` in the address turns it off) |
| `hero` | `auto` | The hero tile of every room: `auto`, or `false` for none (per room: `rooms.<area>.hero`) |
| `text_size` | `normal` | `large`: bigger names and states, taller tiles |
| `animations` | `true` | `false`: the header scenes stand still (less work for the panel's CPU; they also stop when the system asks for reduced motion) |
| `screensaver` | `night` | After `idle_return`: `night` shows the screensaver while Home Assistant's dark theme is on, `always` whatever the theme, `false` never |
| `show_empty_areas` | `false` | `true`: also list the areas with nothing to show (no tile, no reading). Areas listed in `areas`, and rooms given entities with `include`, always show |
| `pixel_shift` | `true` | Burn-in protection: the whole screen moves by 2 px every 5 minutes, around a small square; `false` keeps it still |
| `areas` | all | YAML only. The rooms shown, in this order (area IDs); default: every area holding something to show, by floor then name |
| `exclude_areas` | — | YAML only. Areas left out |
| `title` | location name | The home screen's title |
| `illustration_theme` | theme | `day` or `night` forces the pictures; by default the night pictures follow Home Assistant's dark theme |
| `language` | Home Assistant's | Forces a language |
| `height` | screen | CSS height of the card (by default the screen, minus the toolbar when it shows) |
| `rooms` | — | Per-room settings, below (YAML only) |

### Room by room — `rooms` (YAML only)

The key is the area ID. Everything here is also what **Customize** writes from the panel.

```yaml
strategy:
  type: custom:wall-panel
  rooms:
    living_room:
      name: Lounge                  # instead of the area name
      icon: mdi:sofa                # instead of the area icon
      room_type: living             # picture: living, bedroom, kids, kitchen, dining, bathroom, toilets, hallway, entry, office, laundry, garage, none
      hero: climate.living_room     # auto (default), false, or an entity
      pin: [light.ceiling]          # first, in this order
      hide: [switch.tv_plug]        # left out
      include: [sensor.washer_operation_state]   # added (from another room, without a room, or not detected)
      large: [cover.shutters]       # two columns wide
      order: [light, cover, climate]             # kinds (or entity IDs) first, in this order
      group:
        light.ceiling: [light.wall] # one tile: a tap toggles both
```

Tile kinds for `order`: `light`, `cover`, `climate`, `fan`, `media_player`, `lock`, `alarm_control_panel`, `appliance`, `plug`, `switch`, `water_heater`, `humidifier`, `vacuum`, `lawn_mower`, `camera`, `contact`, `motion`, `leak`, `safety` (smoke, gas, CO), `scene`, `other`.

### Customizing from the panel

Press and hold a tile (or right-click it), then **Customize**:

| Setting | What it writes |
|---|---|
| Size: Normal / Large / Hero | `large` / `hero` |
| Room | `hide` here (when detected here), `include` in the other room |
| Pin to the top | `pin` |
| Show on this screen | `hide` |
| Group with | `group` |
| Reset | removes the entity from every list: back to what detection gives |

An administrator's changes are saved to the dashboard at once (the strategy's options, or the first `custom:wall-panel-card` found). Otherwise — a non-admin user on the panel, a YAML-mode dashboard — the popup shows the `rooms:` lines to paste.

## How it works

**Detection.** Every area holding something to show is a room (`show_empty_areas: true` lists the others too); an entity belongs to its own area, else to its device's. Left out: config and diagnostic entities, hidden entities, the mobile app's, and a plain switch of a richer device (the LED or child lock of a purifier, say). A switch with the `outlet` class, or named as a plug, is a plug, and shows the power of a power sensor on the same device. A `sensor` / `select` for an operation state or a program (Home Connect, Miele, LG ThinQ…) is an appliance — one tile per device, its operation state first; a programme's progress, remaining or finish time is not. A `binary_sensor` of class `smoke`, `gas` or `carbon_monoxide` is a detector (`safety`).

**Readings.** Temperature, humidity, CO₂ and PM2.5 sensors of the room are averaged (unavailable ones ignored) and feed the header and the hero, never a tile. An appliance's own sensors — oven cavity, fridge, water heater, a device that also has a thermostat or a setpoint — are not taken for the room's air (the same rule as ha-room-card).

**Needs a look.** A smoke, gas or CO alarm, a water leak, CO₂ from 1,000 ppm (red from 1,400), an unlocked lock, an open door or window, humidity from 65 % (70 % in a bathroom, toilets or laundry).

**The hero (auto).** The first that applies: a smoke, gas or CO alarm, a leak, CO₂ from 1,000 ppm, a lock that is not locked, high humidity, a player playing, a thermostat, else the room temperature. A room with none of these has no hero.

**The header picture.** An entrance or hallway with door or motion sensors shows the door, window and motion detector; a bathroom, office, bedroom or toilets with readings (or any room with stale air or high humidity) shows the wall sensor and the window; a room with lights shows its lamps lit in their colours; else its plugs on the electrical panel.

**Tap.** Lights, plugs, switches and fans toggle (a group together); scenes run; anything else opens its controls: brightness steps, cover position and the cover picture of ha-cover-card, thermostat target and modes, fan speed, media transport and volume, lock, alarm (arm / disarm; a code-protected panel opens Home Assistant's dialog), vacuum and mower, water heater and humidifier. **More info** opens Home Assistant's own dialog.

## Screenshots

### Square — NSPanel Pro 86, Shelly X1i

| Home | Living room | Kitchen | Bedroom (night) |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/square-home.png" alt="Home" width="200"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/square-living.png" alt="Living room" width="200"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/square-kitchen.png" alt="Kitchen" width="200"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/square-bedroom-dark.png" alt="Bedroom at night" width="200"> |
| **Kids room** | **Bathroom** | **Entrance** | **Office** |
| <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/square-kids.png" alt="Kids room" width="200"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/square-bathroom.png" alt="Bathroom" width="200"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/square-entrance.png" alt="Entrance" width="200"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/square-office.png" alt="Office" width="200"> |

### Landscape — Shelly X2i

| Living room | Home |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/landscape-living.png" alt="Living room, landscape" width="360"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/landscape-home.png" alt="Home, landscape" width="360"> |
| **Living room, large landscape (1440 × 720)** | **Home, large landscape (dark)** |
| <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/wide-living.png" alt="Living room, large landscape" width="360"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/wide-home-dark.png" alt="Home, large landscape, dark" width="360"> |

### Night screensaver

| Screensaver | Same, light shot (`screensaver: always`) |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/saver-dark.png" alt="Night screensaver" width="220"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/saver.png" alt="Screensaver, always" width="220"> |

### Portrait, popups and dark theme

| Portrait (NSPanel Pro 120) | Portrait (Shelly X2i) | Cover controls | Thermostat | Customize | Customize (dark) |
|---|---|---|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/portrait-living.png" alt="Portrait" width="150"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/portrait-x2i-living.png" alt="Portrait, Shelly X2i" width="150"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/detail-cover.png" alt="Cover controls" width="200"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/detail-climate.png" alt="Thermostat controls" width="200"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/customize.png" alt="Customize a tile" width="200"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/customize-dark.png" alt="Customize a tile, dark" width="200"> |

### Animations

The header pictures move with the room's state (they stop when the system asks for reduced motion).

| Scene | Light | Dark |
|---|---|---|
| Home: rooms lit and flagged | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/banner-home.gif" alt="Home header" width="360"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/banner-home-dark.gif" alt="Home header, dark" width="360"> |
| Lights: the lamps that are on glow in their colour | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/banner-lights.gif" alt="Lights header" width="360"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/banner-lights-dark.gif" alt="Lights header, dark" width="360"> |
| Sensors: a door left open, motion detected | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/banner-sensors.gif" alt="Sensors header" width="360"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/banner-sensors-dark.gif" alt="Sensors header, dark" width="360"> |
| Humidity above the threshold | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/banner-humid.gif" alt="Humid header" width="360"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/banner-humid-dark.gif" alt="Humid header, dark" width="360"> |
| Stale air (CO₂) | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/banner-air.gif" alt="Stale air header" width="360"> | <img src="https://raw.githubusercontent.com/juju35/ha-wall-panel/main/screenshots/banner-air-dark.gif" alt="Stale air header, dark" width="360"> |

## Development

```sh
npm install
npm run build        # dist/ha-wall-panel.js + translation files
npm test             # unit tests (detection, customizing, translations)
npm run screenshots  # README captures and GIFs, then the in-place update checks (Playwright + ffmpeg; CHROMIUM_PATH=… for a local Chrome)
```

The room pictures come from [ha-room-card](https://github.com/juju35/ha-room-card) and the cover pictures from [ha-cover-card](https://github.com/juju35/ha-cover-card), copied into `src/scene.js` and `src/cover-scene.js`.

## Translations

English, Français, Deutsch, Español, Italiano, Nederlands, Português, Polski, Српски (`sr`), Srpski (`sr-Latn`), Română, Dansk, Svenska, Български, Русский, Українська, Magyar, Slovenčina, Čeština, Slovenščina, Latviešu, Ελληνικά. Device states use Home Assistant's own wording.

A regional variant uses its base language (`fr-CA` → `fr`); a language without translations falls back to English. Contributions for additional languages are welcome!

## License

[MIT](https://github.com/juju35/ha-wall-panel/blob/main/LICENSE)

## Support

If you find this project useful, you can support its development:

<a href="https://buymeacoffee.com/julienstep9"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" height="50"></a>
