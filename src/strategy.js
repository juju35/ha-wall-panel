// ── Strategies: a dashboard (or one view) generated for the wall panel ───────
// `strategy: { type: custom:wall-panel, …options }` on a dashboard gives one panel view holding the card with those
// options; the same in a view's `strategy` gives that view. The options are the card's (README).

const wpPanelView = (config) => {
  const { type: _type, ...options } = config || {};
  return { title: options.title || "Wall Panel", path: "panel", icon: "mdi:tablet-dashboard", type: "panel", cards: [{ type: `custom:${WP_TAG}`, ...options }] };
};

class WallPanelDashboardStrategy extends HTMLElement {
  static async generate(config) {
    return { title: config?.title || "Wall Panel", views: [wpPanelView(config)] };
  }
}
class WallPanelViewStrategy extends HTMLElement {
  static async generate(config) {
    const { title: _t, path: _p, icon: _i, ...view } = wpPanelView(config);
    return view;
  }
}
customElements.define("ll-strategy-dashboard-wall-panel", WallPanelDashboardStrategy);
customElements.define("ll-strategy-view-wall-panel", WallPanelViewStrategy);
