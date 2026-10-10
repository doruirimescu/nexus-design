/*
 * Nexus design system — themes, theme panel, chart colours and Plotly defaults.
 * Source of truth: https://github.com/doruirimescu/nexus-design  (see DESIGN.md)
 *
 * Load it in <head>, after nexus.css, without async/defer, so the saved theme is
 * applied before the page paints:
 *   <link rel="stylesheet" href="https://doruirimescu.github.io/nexus-design/nexus.css">
 *   <script src="https://doruirimescu.github.io/nexus-design/nexus.js"></script>
 *
 * It adds a collapsible "Theme" panel to every page (opt out with
 * <html data-nexus-panel="off">). The viewer's choice is kept in localStorage.
 * The panel's button sits at the end of the page's .topbar (a floating tab when there
 * is none). The top bar slides away while scrolling down and returns on scroll up
 * (keep it fixed with <html data-nexus-topbar="static">). Any .dock[data-dock-for]
 * is shown once the element it names has scrolled up out of view.
 *
 * Exposes window.Nexus:
 *   Nexus.themes                  [{ id, name, scheme, description }]
 *   Nexus.theme                   the applied theme id (resolves "auto")
 *   Nexus.choice                  the viewer's choice: a theme id or "auto"
 *   Nexus.setTheme(id)            switch theme ("auto" follows the OS light/dark setting)
 *   Nexus.onThemeChange(fn)       call fn(themeId) after every switch; returns an unsubscribe
 *   Nexus.colors                  current theme's colours, read from the CSS tokens
 *   Nexus.token(name)             any CSS token, e.g. Nexus.token("--surface-3")
 *   Nexus.plotlyLayout(extra)     themed Plotly layout, deep-merged with `extra`
 *   Nexus.plotlyConfig            Plotly config (responsive, no logo, trimmed mode bar)
 *   Nexus.rgba(color, alpha)      "#rrggbb" or "rgb(...)" -> "rgba(...)"
 *   Nexus.merge(base, extra)      deep merge of plain objects
 *
 * On a theme switch every Plotly chart on the page is re-coloured: each colour that
 * matched a token of the old theme becomes the same token of the new one. Pages that
 * compute colours in other ways can redraw in Nexus.onThemeChange().
 */
(function () {
  "use strict";

  const THEMES = [
    { id: "midnight", name: "Midnight", scheme: "dark", description: "Deep navy with a blue accent. The original look." },
    { id: "graphite", name: "Graphite", scheme: "dark", description: "Neutral charcoal greys, soft periwinkle accent." },
    { id: "contrast", name: "High contrast", scheme: "dark", description: "Black and white with brighter marks." },
    { id: "daylight", name: "Daylight", scheme: "light", description: "Cool white surfaces and slate text." },
    { id: "paper", name: "Paper", scheme: "light", description: "Warm cream, like a printed report." },
  ];
  const AUTO = { id: "auto", name: "Match system", description: "Midnight or Daylight, following your device." };
  const DEFAULT = "midnight";
  const KEY = "nexus-theme";
  const root = document.documentElement;
  const ids = THEMES.map((t) => t.id);
  const lightQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

  // ---------- Theme state ----------

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function store(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: keep it for this page only */ }
  }
  const pageDefault = ids.includes(root.dataset.theme) ? root.dataset.theme : DEFAULT;
  const valid = (c) => c === "auto" || ids.includes(c);
  let choice = valid(stored()) ? stored() : pageDefault;

  const resolve = (c) => (c === "auto" ? (lightQuery && lightQuery.matches ? "daylight" : "midnight") : c);

  // ---------- Colours ----------

  // Token -> Nexus.colors key. Order matters when two tokens share a value: chart
  // re-colouring maps a colour to the first token that has it.
  const TOKENS = [
    ["accent", "--accent"], ["positive", "--under"], ["negative", "--over"],
    ["positiveInk", "--under-ink"], ["negativeInk", "--over-ink"],
    ["series2", "--series-2"], ["series2Ink", "--series-2-ink"], ["neutral", "--neutral"],
    ["highlight", "--hl-text"], ["accentStrong", "--accent-strong"], ["accentInk", "--accent-ink"],
    ["zeroLine", "--zero-line"], ["seqLow", "--seq-low"], ["seqMid", "--seq-mid"], ["seqHigh", "--seq-high"], ["divMid", "--div-mid"],
    ["text", "--text"], ["muted", "--muted"], ["faint", "--faint"],
    ["bg", "--bg"], ["surface", "--surface"], ["surface2", "--surface-2"], ["surface3", "--surface-3"],
    ["border", "--border"], ["borderStrong", "--border-strong"],
  ];
  // Midnight values, used until the stylesheet has loaded.
  const FALLBACK = {
    accent: "#4f8cff", positive: "#14a088", negative: "#dd6a2c", positiveInk: "#5fd4bd", negativeInk: "#f4a06f",
    series2: "#c98500", series2Ink: "#f0c060", neutral: "#6c81a9", highlight: "#fde68a", accentStrong: "#2f6fea",
    accentInk: "#bcd4ff", zeroLine: "#3a5594", seqLow: "#15254b", seqMid: "#2a78d6", seqHigh: "#cde2fb", divMid: "#24375f",
    text: "#e6edf7", muted: "#9fb0cf", faint: "#6b80a8", bg: "#0a1628", surface: "#0f1b33", surface2: "#14244a",
    surface3: "#1a2d5a", border: "#1f3460", borderStrong: "#2b4680",
  };

  let cache = null;
  function token(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }
  function readColors() {
    const c = {};
    let complete = true;
    for (const [key, name] of TOKENS) {
      const v = token(name);
      if (!v) complete = false;
      c[key] = v || FALLBACK[key];
    }
    c.under = c.positive; c.over = c.negative; c.underInk = c.positiveInk; c.overInk = c.negativeInk;
    c.grid = c.border;
    return { colors: c, complete };
  }
  function colors() {
    if (cache) return cache;
    const r = readColors();
    if (r.complete) cache = r.colors; // don't cache before the stylesheet is in
    return r.colors;
  }

  function parseColor(s) {
    if (typeof s !== "string") return null;
    s = s.trim().toLowerCase();
    let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
    if (m) {
      let h = m[1];
      if (h.length === 3) h = h.split("").map((x) => x + x).join("");
      const n = parseInt(h, 16);
      return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 };
    }
    m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    return null;
  }
  function rgba(color, a) {
    const c = parseColor(color);
    if (!c) return color;
    return `rgba(${c.r},${c.g},${c.b},${a})`;
  }

  // ---------- Plotly ----------

  const isObj = (v) => v !== null && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype;
  function merge(base, extra) {
    const out = { ...base };
    for (const [k, v] of Object.entries(extra || {})) out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
    return out;
  }
  const FONT = "Inter, system-ui, sans-serif";
  function plotlyLayout(extra) {
    const c = colors();
    return merge(
      {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { family: FONT, color: c.muted, size: 12 },
        margin: { l: 56, r: 16, t: 16, b: 56 },
        hoverlabel: { bgcolor: c.surface2, bordercolor: c.borderStrong, font: { color: c.text, family: FONT } },
        xaxis: { gridcolor: c.border, linecolor: c.border, zerolinecolor: c.zeroLine },
        yaxis: { gridcolor: c.border, linecolor: c.border, zerolinecolor: c.zeroLine, zerolinewidth: 1.5 },
        legend: { font: { color: c.muted } },
      },
      extra
    );
  }
  const plotlyConfig = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] };

  // Re-colour every Plotly chart from the old theme's tokens to the new theme's.
  function rethemePlots(prev, next) {
    if (!window.Plotly) return;
    // Chart tokens have distinct values within each theme, so this map is one-to-one
    // and switching back and forth returns the original colours.
    const map = new Map();
    for (const [key] of TOKENS) {
      const from = parseColor(prev[key]);
      const to = parseColor(next[key]);
      if (!from || !to) continue;
      const k = `${from.r},${from.g},${from.b}`;
      if (!map.has(k)) map.set(k, { ...to, raw: next[key] });
    }
    const swap = (v) => {
      const c = parseColor(v);
      if (!c) return v;
      const to = map.get(`${c.r},${c.g},${c.b}`);
      if (!to) return v;
      const a = c.a * to.a;
      if (a === 1) return v.trim().startsWith("#") && to.raw.startsWith("#") ? to.raw : `rgb(${to.r},${to.g},${to.b})`;
      return `rgba(${to.r},${to.g},${to.b},${a})`;
    };
    const isPlain = (v) => v !== null && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype;
    const walk = (v, colorish) => {
      if (typeof v === "string") return colorish ? swap(v) : v;
      if (Array.isArray(v)) {
        // Colour arrays and colorscales are swapped; arrays of objects (shapes,
        // annotations) are walked; plain data arrays (x, y, text) are left alone.
        if (colorish) return v.map((x) => walk(x, true));
        return v.some(isPlain) ? v.map((x) => (isPlain(x) ? walk(x, false) : x)) : v;
      }
      if (isPlain(v)) {
        const out = {};
        for (const [k, x] of Object.entries(v)) out[k] = walk(x, colorish || /colou?r|colorscale|fill/i.test(k));
        return out;
      }
      return v;
    };
    document.querySelectorAll(".js-plotly-plot").forEach((gd) => {
      if (!gd.data || !gd.layout) return;
      try {
        window.Plotly.react(gd, gd.data.map((t) => walk(t, false)), walk(gd.layout, false), gd._context || plotlyConfig);
      } catch (e) { /* a chart that can't be re-coloured keeps its old colours */ }
    });
  }

  // ---------- Applying a theme ----------

  const listeners = new Set();
  let applied = null;

  function apply(c) {
    const theme = resolve(c);
    root.dataset.themeChoice = c;
    if (theme === applied) return;
    const prev = applied ? colors() : null;
    applied = theme;
    root.dataset.theme = theme;
    cache = null;
    if (!prev) return; // first paint: nothing drawn yet
    const next = colors();
    rethemePlots(prev, next);
    for (const fn of listeners) {
      try { fn(theme); } catch (e) { console.error(e); }
    }
    window.dispatchEvent(new CustomEvent("nexus:themechange", { detail: { theme, choice: c } }));
  }

  function setTheme(c) {
    if (!valid(c)) return;
    choice = c;
    store(c);
    apply(c);
    syncPanel();
  }

  apply(choice);
  if (lightQuery) {
    const onScheme = () => { if (choice === "auto") apply("auto"); };
    lightQuery.addEventListener ? lightQuery.addEventListener("change", onScheme) : lightQuery.addListener(onScheme);
  }
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && valid(e.newValue)) { choice = e.newValue; apply(choice); syncPanel(); }
  });

  // ---------- Theme panel ----------

  let panel = null;
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7.5" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/></svg>';
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const preview = (id) => id === "auto"
    ? '<span class="nx-theme-preview auto" aria-hidden="true"></span>'
    : `<span class="nx-theme-preview" data-theme="${id}" aria-hidden="true"><span></span><span>` +
      '<i style="background:var(--accent)"></i><i style="background:var(--under)"></i><i style="background:var(--over)"></i></span></span>';
  const option = (t) =>
    `<label class="nx-theme-option"><input type="radio" name="nx-theme" value="${t.id}">${preview(t.id)}` +
    `<strong>${esc(t.name)}</strong><small>${esc(t.description)}</small></label>`;

  function syncPanel() {
    if (!panel) return;
    panel.box.querySelectorAll("input[name=nx-theme]").forEach((r) => { r.checked = r.value === choice; });
  }

  function buildPanel() {
    if (root.dataset.nexusPanel === "off" || panel) return;
    // In the top bar when the page has one; otherwise a floating tab on the right edge.
    const bar = document.querySelector(".topbar-inner");
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = bar ? "nx-theme-btn" : "nx-theme-tab";
    tab.setAttribute("aria-controls", "nx-theme-panel");
    tab.setAttribute("aria-expanded", "false");
    tab.innerHTML = bar ? ICON : `${ICON}<span class="nx-label">Theme</span>`;
    tab.title = "Change theme";
    tab.setAttribute("aria-label", "Change theme");

    const backdrop = document.createElement("div");
    backdrop.className = "nx-theme-backdrop";

    const box = document.createElement("aside");
    box.id = "nx-theme-panel";
    box.className = "nx-theme-panel";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-labelledby", "nx-theme-title");
    box.innerHTML =
      '<div class="nx-theme-head"><h2 id="nx-theme-title">Appearance</h2>' +
      '<button type="button" class="nx-theme-close" aria-label="Close theme panel">×</button></div>' +
      `<fieldset class="nx-theme-list"><legend>Theme</legend>${[...THEMES, AUTO].map(option).join("")}</fieldset>` +
      '<p class="nx-theme-note">Your choice is remembered in this browser for every page on this site.</p>';

    const open = (yes) => {
      box.classList.toggle("open", yes);
      backdrop.classList.toggle("open", yes);
      tab.setAttribute("aria-expanded", String(yes));
      if (yes) (box.querySelector("input:checked") || box.querySelector("input")).focus({ preventScroll: true });
      else tab.focus({ preventScroll: true });
    };
    tab.addEventListener("click", () => open(!box.classList.contains("open")));
    backdrop.addEventListener("click", () => open(false));
    box.querySelector(".nx-theme-close").addEventListener("click", () => open(false));
    box.addEventListener("keydown", (e) => { if (e.key === "Escape") open(false); });
    box.addEventListener("change", (e) => { if (e.target.name === "nx-theme") setTheme(e.target.value); });

    if (bar) bar.appendChild(tab);
    else document.body.append(tab);
    document.body.append(backdrop, box);
    panel = { tab, box };
    syncPanel();
  }

  // ---------- Top bar: hide on scroll down, show on scroll up ----------

  function autoHideTopbar() {
    const topbar = document.querySelector(".topbar");
    if (!topbar || root.dataset.nexusTopbar === "static") return;
    let lastY = window.scrollY, ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY, dy = y - lastY;
      const keep = y < topbar.offsetHeight || topbar.contains(document.activeElement) ||
        (panel && panel.box.classList.contains("open"));
      if (keep || dy < -6) topbar.classList.remove("nx-hidden");
      else if (dy > 6) topbar.classList.add("nx-hidden");
      if (Math.abs(dy) > 6 || keep) lastY = y;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    topbar.addEventListener("focusin", () => topbar.classList.remove("nx-hidden"));
  }

  // On phones the nav is one swipeable row: start it with the current page in view.
  function revealActiveNav() {
    const nav = document.querySelector(".topbar .nav"), a = nav && nav.querySelector("a.active");
    if (a && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2;
  }

  // ---------- Docks: keep a page control one tap away ----------

  function setupDocks() {
    if (!("IntersectionObserver" in window)) return;
    document.querySelectorAll(".dock[data-dock-for]").forEach((dock) => {
      const target = document.querySelector(dock.dataset.dockFor);
      if (!target) return;
      // Visible only while the original control is above the viewport (scrolled past).
      new IntersectionObserver(([e]) => {
        dock.classList.toggle("visible", !e.isIntersecting && e.boundingClientRect.bottom < 0);
      }).observe(target);
    });
  }

  function init() {
    buildPanel();
    autoHideTopbar();
    revealActiveNav();
    setupDocks();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.Nexus = {
    themes: THEMES.map((t) => ({ ...t })),
    get theme() { return applied; },
    get choice() { return choice; },
    setTheme,
    onThemeChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get colors() { return colors(); },
    token,
    plotlyLayout,
    plotlyConfig,
    rgba,
    merge,
  };
})();
