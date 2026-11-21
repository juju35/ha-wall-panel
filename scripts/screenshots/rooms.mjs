// Renders the wall panel with a mock home (neutral names, English) and saves the README screenshots.
// Usage: npm install && npm run build && node scripts/screenshots/rooms.mjs  (CHROMIUM_PATH to use a local Chrome)
import { pair, shoot } from "./harness.mjs";

const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: "2026-11-21T14:00:00Z" });
const AREAS = [
  ["living_room", "Living room"],
  ["kitchen", "Kitchen"],
  ["bedroom", "Bedroom"],
  ["kids_room", "Kids room"],
  ["bathroom", "Bathroom"],
  ["entrance", "Entrance"],
  ["office", "Office"],
];
// [entity_id, area, state, attributes, device]
const E = [
  ["light.living_room_ceiling", "living_room", "on", { friendly_name: "Living room Ceiling light", brightness: 204, supported_color_modes: ["brightness"] }],
  ["light.living_room_floor_lamp", "living_room", "on", { friendly_name: "Floor lamp", brightness: 90, supported_color_modes: ["brightness"], rgb_color: [255, 190, 120] }],
  ["cover.living_room_shutters", "living_room", "open", { friendly_name: "Shutters", current_position: 40, device_class: "shutter", supported_features: 15 }],
  ["climate.living_room", "living_room", "heat", { friendly_name: "Heating", current_temperature: 20.6, temperature: 21, hvac_action: "heating", hvac_modes: ["off", "heat", "auto"], preset_modes: ["comfort", "eco", "away"], preset_mode: "comfort", target_temp_step: 0.5 }],
  ["media_player.living_room_tv", "living_room", "playing", { friendly_name: "TV", device_class: "tv", media_title: "Nature documentary", app_name: "Streaming" }],
  ["fan.living_room_purifier", "living_room", "on", { friendly_name: "Air purifier", percentage: 33, supported_features: 1 }, "purifier"],
  ["switch.living_room_tv_plug", "living_room", "off", { friendly_name: "TV plug", device_class: "outlet" }],
  ["binary_sensor.living_room_patio_door", "living_room", "off", { friendly_name: "Patio door", device_class: "door" }],
  ["sensor.living_room_temperature", "living_room", "21.4", { device_class: "temperature", unit_of_measurement: "°C" }],
  ["sensor.living_room_humidity", "living_room", "48", { device_class: "humidity", unit_of_measurement: "%" }],

  ["light.kitchen_worktop", "kitchen", "on", { friendly_name: "Worktop", supported_color_modes: ["onoff"] }],
  ["light.kitchen_pendant", "kitchen", "off", { friendly_name: "Pendant", supported_color_modes: ["brightness"] }],
  ["sensor.dishwasher_operation_state", "kitchen", "run", { friendly_name: "Dishwasher" }, "dishwasher"],
  ["switch.kitchen_kettle_plug", "kitchen", "on", { friendly_name: "Kettle plug", device_class: "outlet" }, "kettle"],
  ["sensor.kettle_power", null, "1800", { device_class: "power", unit_of_measurement: "W" }, "kettle"],
  ["switch.kitchen_coffee_plug", "kitchen", "off", { friendly_name: "Coffee machine plug", device_class: "outlet" }],
  ["cover.kitchen_shutter", "kitchen", "closed", { friendly_name: "Shutter", current_position: 0, device_class: "shutter", supported_features: 15 }],
  ["binary_sensor.kitchen_sink_leak", "kitchen", "off", { friendly_name: "Sink leak", device_class: "moisture" }],
  ["sensor.kitchen_temperature", "kitchen", "22.1", { device_class: "temperature", unit_of_measurement: "°C" }],
  ["sensor.fridge_temperature", "kitchen", "4", { device_class: "temperature", unit_of_measurement: "°C" }],

  ["light.bedroom_left_bedside", "bedroom", "on", { friendly_name: "Left bedside lamp", brightness: 26, supported_color_modes: ["brightness"] }],
  ["light.bedroom_right_bedside", "bedroom", "off", { friendly_name: "Right bedside lamp", supported_color_modes: ["brightness"] }],
  ["cover.bedroom_shutters", "bedroom", "closed", { friendly_name: "Shutters", current_position: 0, device_class: "shutter", supported_features: 15 }],
  ["climate.bedroom", "bedroom", "heat", { friendly_name: "Radiator", current_temperature: 19.2, temperature: 17, hvac_action: "idle", hvac_modes: ["off", "heat"], preset_modes: ["comfort", "eco"], preset_mode: "eco" }],
  ["media_player.bedroom_speaker", "bedroom", "paused", { friendly_name: "Speaker", device_class: "speaker" }],
  ["sensor.bedroom_temperature", "bedroom", "19.2", { device_class: "temperature", unit_of_measurement: "°C" }],
  ["sensor.bedroom_humidity", "bedroom", "46", { device_class: "humidity", unit_of_measurement: "%" }],

  ["light.kids_room_night_light", "kids_room", "on", { friendly_name: "Night light", brightness: 77, supported_color_modes: ["rgb"], rgb_color: [140, 180, 255] }],
  ["light.kids_room_ceiling", "kids_room", "off", { friendly_name: "Ceiling light", supported_color_modes: ["brightness"] }],
  ["cover.kids_room_shutter", "kids_room", "open", { friendly_name: "Shutter", current_position: 100, device_class: "shutter", supported_features: 15 }],
  ["climate.kids_room", "kids_room", "heat", { friendly_name: "Radiator", current_temperature: 20.3, temperature: 20, hvac_action: "idle", hvac_modes: ["off", "heat"] }],
  ["binary_sensor.kids_room_window", "kids_room", "off", { friendly_name: "Window", device_class: "window" }],

  ["light.bathroom_mirror", "bathroom", "on", { friendly_name: "Mirror", supported_color_modes: ["onoff"] }],
  ["light.bathroom_spots", "bathroom", "off", { friendly_name: "Spots", supported_color_modes: ["brightness"] }],
  ["switch.bathroom_towel_rail", "bathroom", "on", { friendly_name: "Towel rail" }],
  ["fan.bathroom_ventilation", "bathroom", "on", { friendly_name: "Ventilation", percentage: 100, supported_features: 1 }],
  ["water_heater.water_heater", "bathroom", "eco", { friendly_name: "Water heater", temperature: 62, operation_list: ["eco", "electric", "off"], operation_mode: "eco" }, "boiler"],
  ["sensor.water_heater_temperature", null, "62", { device_class: "temperature", unit_of_measurement: "°C" }, "boiler"],
  ["sensor.bathroom_humidity", "bathroom", "72", { device_class: "humidity", unit_of_measurement: "%" }],
  ["sensor.bathroom_temperature", "bathroom", "23.8", { device_class: "temperature", unit_of_measurement: "°C" }],

  ["lock.front_door", "entrance", "unlocked", { friendly_name: "Front door lock" }],
  ["binary_sensor.front_door", "entrance", "on", { friendly_name: "Front door", device_class: "door" }],
  ["alarm_control_panel.home", "entrance", "disarmed", { friendly_name: "Alarm" }],
  ["light.entrance", "entrance", "on", { friendly_name: "Entrance light", supported_color_modes: ["onoff"] }],
  ["binary_sensor.entrance_motion", "entrance", "on", { friendly_name: "Motion", device_class: "motion" }],
  ["camera.entrance_doorbell", "entrance", "idle", { friendly_name: "Doorbell camera" }],

  ["light.office_desk_lamp", "office", "on", { friendly_name: "Desk lamp", supported_color_modes: ["onoff"] }],
  ["switch.office_pc_plug", "office", "on", { friendly_name: "PC plug", device_class: "outlet" }, "pcplug"],
  ["sensor.office_pc_plug_power", null, "142", { device_class: "power", unit_of_measurement: "W" }, "pcplug"],
  ["climate.office", "office", "heat", { friendly_name: "Radiator", current_temperature: 21.6, temperature: 20, hvac_action: "idle", hvac_modes: ["off", "heat"] }],
  ["binary_sensor.office_window", "office", "off", { friendly_name: "Window", device_class: "window" }],
  ["fan.office_purifier", "office", "off", { friendly_name: "Air purifier", supported_features: 1 }],
  ["sensor.office_co2", "office", "1120", { device_class: "carbon_dioxide", unit_of_measurement: "ppm" }],
  ["sensor.office_temperature", "office", "21.6", { device_class: "temperature", unit_of_measurement: "°C" }],
];

export const hass = {
  language: "en",
  locale: { language: "en" },
  user: { is_admin: true },
  config: { location_name: "Home" },
  areas: Object.fromEntries(AREAS.map(([id, name]) => [id, { area_id: id, name }])),
  floors: {},
  devices: {},
  entities: {},
  states: {},
};
for (const [id, area, state, attrs, device] of E) {
  hass.states[id] = st(id, state, attrs);
  hass.entities[id] = { entity_id: id, area_id: area, device_id: device };
  if (device) hass.devices[device] = { area_id: area || E.find((e) => e[4] === device && e[1])?.[1] };
}

// Run directly: render the stills (animations.mjs imports the mock home only).
const direct = import.meta.url === `file://${process.argv[1]}`;
const SQ = { w: 480, h: 480 };
const shots = [
  ...pair("square-home", SQ),
  ...["living_room", "kitchen", "bedroom", "kids_room", "bathroom", "entrance", "office"].flatMap((r) => pair(`square-${r.replace("_room", "").replace("_", "-")}`, { ...SQ, room: r })),
  ...pair("landscape-living", { w: 720, h: 360, room: "living_room" }),
  ...pair("landscape-home", { w: 720, h: 360 }),
  ...pair("portrait-living", { w: 375, h: 667, room: "living_room" }),
  ...pair("detail-cover", { ...SQ, room: "living_room", popup: ["detail", "cover.living_room_shutters"] }),
  ...pair("detail-climate", { ...SQ, room: "bedroom", popup: ["detail", "climate.bedroom"] }),
  ...pair("customize", { ...SQ, room: "living_room", popup: ["edit", "switch.living_room_tv_plug"] }),
];
if (direct) await shoot({ shots, hass });
