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
 *   Nexus.chartStyle              the current theme's chart style { name, description }
 *   Nexus.chartStyles             every theme's chart style, by theme id
 *   Nexus.styleChart(data, layout) apply the chart style yourself -> { data, layout }
 *                                 (Plotly.newPlot / Plotly.react already do this)
 *   Nexus.bands(list)             shaded x-ranges with labels (eras, regimes) -> { shapes, annotations }
 *   Nexus.events(list)            dated vertical marker lines with labels -> { shapes, annotations }
 *   Nexus.rgba(color, alpha)      "#rrggbb" or "rgb(...)" -> "rgba(...)"
 *   Nexus.merge(base, extra)      deep merge of plain objects
 *
 * Each theme also has a chart style (bar corners, line weight, markers, grid, axis
 * frame), applied to every Plotly.newPlot / Plotly.react call; opt out with
 * <html data-nexus-chart-style="off">.
 *
 * On a theme switch every Plotly chart on the page is re-coloured and restyled: each
 * colour that matched a token of the old theme becomes the same token of the new one.
 * Pages that compute colours in other ways can redraw in Nexus.onThemeChange().
 */
(function () {
  "use strict";

  const THEMES = [
    { id: "midnight", name: "Midnight", scheme: "dark", description: "Deep navy with a blue accent. The original look." },
    { id: "graphite", name: "Graphite", scheme: "dark", description: "Neutral charcoal greys, soft periwinkle accent." },
    { id: "contrast", name: "High contrast", scheme: "dark", description: "Black and white with brighter marks." },
    { id: "daylight", name: "Daylight", scheme: "light", description: "Cool white surfaces and slate text." },
    { id: "paper", name: "Paper", scheme: "light", description: "Warm cream, like a printed report." },
    { id: "terminal", name: "Terminal", scheme: "dark", description: "Green phosphor CRT, reimagined. Amber and aqua for the data." },
    { id: "monokai-pro", name: "Monokai Pro", scheme: "dark", description: "Warm charcoal, yellow accent, the Monokai spectrum." },
    { id: "monokai-classic", name: "Monokai Classic", scheme: "dark", description: "The original olive-black Monokai, hot-pink accent." },
    { id: "monokai-machine", name: "Monokai Machine", scheme: "dark", description: "Cool blue-slate Monokai, cyan accent." },
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
  // Chart text follows the theme's body font.
  const font = () => token("--font") || "Inter, system-ui, sans-serif";
  function plotlyLayout(extra) {
    const c = colors(), FONT = font();
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
        modebar: { bgcolor: "rgba(0,0,0,0)", color: c.faint, activecolor: c.accent },
      },
      extra
    );
  }
  const plotlyConfig = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] };

  // ---------- Chart styles ----------
  //
  // Each theme has a chart style: how marks and axes are drawn (bar corners and
  // outlines, line weight, marker shape, gridlines, axis frame, tick font). Colours
  // still come from the page. Every Plotly.newPlot / Plotly.react call is styled
  // automatically, and a theme switch restyles the charts already drawn. Opt a page
  // out with <html data-nexus-chart-style="off">.
  //
  //   bar:    radius (corner px); outline "bg" | "ink" (an edge in that colour);
  //           wire (fill alpha: bars become outlines over a faint fill)
  //   line:   scale (× the page's width), min (px), dashes (cycled over line traces)
  //   marker: symbol (when the page sets none), ring (edge in --surface),
  //           hollow (open symbols), grow (+px)
  //   area:   alpha (fill opacity of filled / stacked areas), edge "bg" (layers split by a
  //           --bg line), pattern (a fillpattern shape: hatched areas)
  //   band:   alpha (fill of Nexus.bands), edge (outline dash, or none), event (dash of
  //           Nexus.events lines), label "mono" | "display" (label font)
  //   grid:   x / y: false (hidden) or a dash ("solid" | "dot" | "dash"); color (a colour key)
  //   axis:   line / xLine (colour key of the axis lines), frame (mirror them),
  //           ticks ("outside"), tickFont ("mono"), titleFont ("display"), size (font px)
  //   hover:  bg / border (colour keys)
  //   glow:   lines and bars glow (drawn by the theme's CSS)
  // Charts with more than DENSE bars skip bar outlines and the x grid.
  const CHART_STYLES = {
    midnight: {
      name: "Glass", description: "Rounded bars, ringed markers, dotted horizontal grid.",
      bar: { radius: 4 }, line: { scale: 1.1 }, marker: { ring: true },
      grid: { x: false, y: "dot" }, axis: {},
      area: { alpha: 0.32 }, band: { alpha: 0.08, event: "dot" },
    },
    graphite: {
      name: "Blueprint", description: "Square bars, hairline grid on both axes, framed plot, mono ticks.",
      bar: { radius: 0 }, line: { scale: 0.8, min: 1.25 }, marker: { symbol: "square" },
      grid: { x: "solid", y: "solid" }, axis: { line: "borderStrong", frame: true, ticks: "outside", tickFont: "mono" },
      area: { alpha: 0.16 }, band: { alpha: 0.05, edge: "dash", event: "dash", label: "mono" },
    },
    contrast: {
      name: "Bold", description: "Heavy lines with a dash pattern per series, outlined bars, larger type.",
      bar: { radius: 2, outline: "bg" }, line: { scale: 1.5, min: 2.5, dashes: ["solid", "dash", "dot", "dashdot"] },
      marker: { ring: true, grow: 2 },
      grid: { x: false, y: "solid", color: "borderStrong" }, axis: { line: "text", ticks: "outside", size: 13 },
      hover: { border: "text" },
      area: { alpha: 0.62, edge: "bg" }, band: { alpha: 0.13, edge: "solid", event: "dash" },
    },
    daylight: {
      name: "Soft", description: "Softly rounded bars, hollow markers, light horizontal grid.",
      bar: { radius: 6 }, line: { scale: 1.25 }, marker: { hollow: true },
      grid: { x: false, y: "solid" }, axis: {},
      area: { alpha: 0.26 }, band: { alpha: 0.07, event: "dot" },
    },
    paper: {
      name: "Print", description: "Square inked bars, a strong baseline, serif axis titles, open markers.",
      bar: { radius: 0, outline: "ink" }, line: { scale: 0.85, min: 1.25 }, marker: { hollow: true },
      grid: { x: false, y: "solid" }, axis: { xLine: "text", ticks: "outside", titleFont: "display" },
      area: { alpha: 0.12, pattern: "/" }, band: { alpha: 0.06, edge: "solid", event: "dash", label: "display" },
    },
    terminal: {
      name: "Phosphor", description: "Wireframe bars, glowing traces, dotted oscilloscope graticule.",
      bar: { radius: 0, wire: 0.22 }, line: { scale: 1, min: 1.5 }, marker: { symbol: "square" },
      grid: { x: "dot", y: "dot" }, axis: { line: "borderStrong", frame: true, ticks: "outside", tickFont: "mono" },
      hover: { bg: "bg", border: "accent" }, glow: true,
      area: { alpha: 0.1 }, band: { alpha: 0.07, edge: "dot", event: "dot", label: "mono" },
    },
    "monokai-pro": {
      name: "Syntax", description: "Softly rounded bars, ringed markers, dashed horizontal grid, mono band labels.",
      bar: { radius: 3 }, line: { scale: 1.2 }, marker: { ring: true },
      grid: { x: false, y: "dash" }, axis: {},
      area: { alpha: 0.22 }, band: { alpha: 0.07, event: "dash", label: "mono" },
    },
    "monokai-classic": {
      name: "Gutter", description: "Square bars split by background lines, diamond markers, ruled baseline, mono ticks.",
      bar: { radius: 0, outline: "bg" }, line: { scale: 1, min: 1.5 }, marker: { symbol: "diamond" },
      grid: { x: false, y: "solid" }, axis: { xLine: "borderStrong", ticks: "outside", tickFont: "mono" },
      area: { alpha: 0.3, edge: "bg" }, band: { alpha: 0.08, edge: "dash", event: "dash", label: "mono" },
    },
    "monokai-machine": {
      name: "Instrument", description: "Near-square bars, open diamond markers, framed plot with a dotted vertical grid.",
      bar: { radius: 1 }, line: { scale: 0.9, min: 1.5 }, marker: { symbol: "diamond", hollow: true },
      grid: { x: "dot", y: "solid" }, axis: { line: "borderStrong", frame: true, ticks: "outside", tickFont: "mono" },
      hover: { bg: "bg", border: "accent" },
      area: { alpha: 0.18 }, band: { alpha: 0.06, edge: "dot", event: "dash", label: "mono" },
    },
  };
  const chartStyle = () => CHART_STYLES[applied] || CHART_STYLES[DEFAULT];
  const chartStylesOn = () => root.dataset.nexusChartStyle !== "off";

  const fade = (v, a) => (Array.isArray(v) ? v.map((x) => fade(x, a)) : rgba(v, a));
  const isScatter = (t) => (t.type || "scatter") === "scatter" || t.type === "scattergl";
  // Plotly's default mode is lines, plus markers below 20 points.
  const isLines = (t) => isScatter(t) && (t.mode === undefined || String(t.mode).includes("lines"));
  const isMarkers = (t) => isScatter(t) &&
    (t.mode === undefined ? !(t.x && t.x.length >= 20) : String(t.mode).includes("markers"));
  const openSymbol = (s) => (typeof s === "string" && !s.endsWith("-open") ? `${s}-open` : s);
  const isArea = (t) => isScatter(t) && ((t.fill && t.fill !== "none") || t.stackgroup !== undefined);
  // A translucent fillcolor is the page's choice (a range band, say); an opaque or
  // missing one leaves the fill opacity to the chart style.
  const opaque = (v) => { const p = parseColor(v); return !p || p.a === 1; };

  // Over this many bars, outlines would swallow the thin bars and an x grid line per
  // category turns into noise: dense charts skip both.
  const DENSE = 60;
  const isDense = (data) => data.some((t) => isObj(t) && (t.type === "bar" || t.type === "histogram") &&
    Math.max((t.x || []).length, (t.y || []).length) > DENSE);

  function styleTraces(data, s, c, dense) {
    let lineIndex = 0;
    return data.map((t) => {
      if (!isObj(t)) return t;
      const out = { ...t };
      if (t.type === "bar" || t.type === "histogram") {
        const m = { ...(t.marker || {}) };
        m.cornerradius = s.bar.radius;
        const fill = m.color !== undefined ? m.color : c.accent;
        if (s.bar.wire) {
          m.color = fade(fill, s.bar.wire);
          m.line = { ...(m.line || {}), color: fill, width: 1.5 };
        } else if (s.bar.outline && !dense && !(m.line && m.line.width)) {
          const ink = s.bar.outline === "ink";
          m.line = { ...(m.line || {}), color: ink ? rgba(c.text, 0.55) : c.bg, width: ink ? 0.75 : 1.5 };
        }
        out.marker = m;
      }
      const area = isArea(t);
      if (isLines(t)) {
        const l = { ...(t.line || {}) };
        // width 0 is a deliberate invisible edge (the lower bound of a range band): keep it.
        if (l.width !== 0) l.width = Math.max(s.line.min || 0, Math.round((l.width || 2) * s.line.scale * 100) / 100);
        // Areas keep solid edges: a dash pattern on a filled layer reads as noise.
        // Invisible edges (width 0) take no slot in the dash cycle.
        if (!area && l.width !== 0) {
          if (s.line.dashes && !l.dash) l.dash = s.line.dashes[lineIndex % s.line.dashes.length];
          lineIndex++;
        }
        if (area && s.area.edge === "bg" && t.stackgroup !== undefined) l.color = c.bg;
        out.line = l;
      }
      if (area && opaque(t.fillcolor)) {
        const base = t.fillcolor || (t.line && t.line.color) || c.accent;
        out.fillcolor = rgba(base, s.area.alpha);
        if (s.area.edge === "bg" && t.stackgroup !== undefined) out.fillcolor = rgba(base, s.area.alpha + 0.2);
        if (s.area.pattern && !t.fillpattern) {
          out.fillpattern = { shape: s.area.pattern, fgcolor: rgba(base, 0.55), bgcolor: rgba(base, s.area.alpha), size: 7, solidity: 0.18 };
        }
      }
      if (isMarkers(t)) {
        const m = { ...(t.marker || {}) };
        const color = m.color !== undefined ? m.color : t.line && t.line.color;
        if (s.marker.symbol && m.symbol === undefined) m.symbol = s.marker.symbol;
        if (s.marker.grow) m.size = (m.size || 6) + s.marker.grow;
        if (s.marker.hollow) {
          m.symbol = openSymbol(m.symbol || "circle");
          m.line = { ...(m.line || {}), width: Math.max(1.5, (m.line && m.line.width) || 0) };
          if (color !== undefined) m.line.color = color;
        } else if (s.marker.ring && !(m.line && m.line.width)) {
          m.line = { ...(m.line || {}), color: c.surface, width: 1 };
        }
        out.marker = m;
      }
      return out;
    });
  }

  function styleLayout(layout, s, c, dense) {
    const out = { ...(layout || {}) };
    const family = { mono: token("--mono"), display: token("--font-display") };
    const axes = new Set(["xaxis", "yaxis", ...Object.keys(out).filter((k) => /^[xy]axis\d*$/.test(k))]);
    for (const k of axes) {
      const dim = k[0];
      const ax = { ...(out[k] || {}) };
      const g = dense && dim === "x" ? false : s.grid[dim];
      if (g === false) { if (ax.showgrid === undefined) ax.showgrid = false; }
      else if (g) { if (ax.showgrid === undefined) ax.showgrid = true; if (ax.griddash === undefined) ax.griddash = g; }
      // The base layout's border-coloured grid and axis lines count as unset.
      if (s.grid.color && (ax.gridcolor === undefined || ax.gridcolor === c.border)) ax.gridcolor = c[s.grid.color];
      const line = (dim === "x" && s.axis.xLine) || s.axis.line;
      if (line && ax.showline === undefined) {
        ax.showline = true;
        if (ax.linecolor === undefined || ax.linecolor === c.border) ax.linecolor = c[line];
        if (s.axis.frame && ax.mirror === undefined) ax.mirror = true;
      }
      if (s.axis.ticks && ax.ticks === undefined) {
        ax.ticks = s.axis.ticks;
        ax.ticklen = 4;
        if (ax.tickcolor === undefined) ax.tickcolor = c[line || "borderStrong"];
      }
      if (s.axis.tickFont) ax.tickfont = merge({ family: family[s.axis.tickFont] }, ax.tickfont);
      if (s.axis.titleFont && ax.title) {
        const title = isObj(ax.title) ? ax.title : { text: ax.title };
        ax.title = merge({ font: { family: family[s.axis.titleFont], size: 14 } }, title);
      }
      out[k] = ax;
    }
    if (s.axis.size) out.font = merge(out.font || {}, { size: s.axis.size });
    if (Array.isArray(out.shapes)) out.shapes = out.shapes.map((sh) => styleMarkShape(sh, s, c));
    if (Array.isArray(out.annotations) && s.band.label) {
      out.annotations = out.annotations.map((a) => (isObj(a) && /^nexus-(band|event)/.test(a.name || "")
        ? merge(a, { font: { family: family[s.band.label] } }) : a));
    }
    if (s.hover) {
      out.hoverlabel = merge(out.hoverlabel || {}, {
        ...(s.hover.bg ? { bgcolor: c[s.hover.bg] } : {}),
        ...(s.hover.border ? { bordercolor: c[s.hover.border] } : {}),
      });
    }
    return out;
  }

  // Shapes made by Nexus.bands / Nexus.events carry a name, so each theme can draw
  // them its own way: band opacity and outline, event-line dash.
  function styleMarkShape(sh, s, c) {
    if (!isObj(sh) || typeof sh.name !== "string") return sh;
    if (sh.name === "nexus-band") {
      const col = parseColor(sh.fillcolor) ? sh.fillcolor : c.accent;
      return { ...sh, fillcolor: rgba(col, s.band.alpha),
        line: s.band.edge ? { color: rgba(col, 0.5), width: 1, dash: s.band.edge } : { width: 0 } };
    }
    if (sh.name === "nexus-event") {
      return { ...sh, line: { ...(sh.line || {}), dash: s.band.event || "dot", width: s.line.scale >= 1.5 ? 1.5 : 1 } };
    }
    return sh;
  }

  // ---------- Bands and event lines ----------
  //
  // Nexus.bands([{ x0, x1, label, tone }]) shades x-ranges (eras, regimes, recessions);
  // Nexus.events([{ x, label, tone }]) draws dated vertical lines. Both return
  // { shapes, annotations } to spread into a layout. tone is a Nexus.colors key
  // ("accent" by default, or "series2", "neutral", "positive", "negative"); labels use
  // the matching ink colour. Labels sit at the top of the plot; pass labelY (0-1) to
  // stagger them, or label: "" to leave one out.
  const INK = { accent: "accentInk", positive: "positiveInk", negative: "negativeInk", series2: "series2Ink", neutral: "muted" };
  const mid = (a, b) => {
    const ta = Date.parse(a), tb = Date.parse(b);
    if (typeof a === "string" && !isNaN(ta) && !isNaN(tb)) return new Date((ta + tb) / 2).toISOString().slice(0, 10);
    return (Number(a) + Number(b)) / 2;
  };
  function marks(list, kind) {
    const c = colors(), s = chartStyle();
    const shapes = [], annotations = [];
    for (const b of list || []) {
      const tone = c[b.tone] ? b.tone : "accent";
      const col = c[tone], ink = c[INK[tone]] || c.muted;
      if (kind === "band") {
        shapes.push(styleMarkShape({ type: "rect", name: "nexus-band", xref: "x", yref: "paper", x0: b.x0, x1: b.x1, y0: 0, y1: 1,
          fillcolor: col, layer: "below" }, s, c));
      } else {
        shapes.push(styleMarkShape({ type: "line", name: "nexus-event", xref: "x", yref: "paper", x0: b.x, x1: b.x, y0: 0, y1: 1,
          line: { color: rgba(col, 0.8) }, layer: "above" }, s, c));
      }
      if (b.label) {
        annotations.push({ name: `nexus-${kind}-label`, xref: "x", yref: "paper", showarrow: false,
          x: kind === "band" ? mid(b.x0, b.x1) : b.x, y: b.labelY === undefined ? 1 : b.labelY, yanchor: "top",
          xanchor: kind === "band" ? "center" : "left", xshift: kind === "band" ? 0 : 3,
          text: b.label, font: { size: 11, color: ink }, captureevents: false });
      }
    }
    return { shapes, annotations };
  }

  function styleChart(data, layout) {
    if (!chartStylesOn()) return { data, layout };
    const s = chartStyle(), c = colors(), dense = isDense(data || []);
    return { data: styleTraces(data || [], s, c, dense), layout: styleLayout(layout, s, c, dense) };
  }

  // The page's own (unstyled) data and layout for each chart, so a theme switch
  // restyles from them rather than from the previous theme's styled version.
  const sources = new WeakMap();
  const el = (gd) => (typeof gd === "string" ? document.getElementById(gd) : gd);

  // Glow: lines and bars copy their stroke into `color`, so the theme's CSS can
  // draw a drop-shadow in currentColor.
  function glow(gd) {
    if (!chartStyle().glow || !chartStylesOn()) return;
    gd.querySelectorAll(".scatterlayer .js-line, .barlayer .point path").forEach((p) => {
      p.style.color = p.style.stroke && p.style.stroke !== "none" ? p.style.stroke : p.style.fill;
    });
  }

  const touchCharts = () => root.dataset.nexusTouchCharts !== "off" &&
    !!window.matchMedia && matchMedia("(hover: none) and (pointer: coarse)").matches;

  function wrapPlotly(P) {
    if (!P || P.__nexus) return P;
    const raw = { newPlot: P.newPlot, react: P.react, restyle: P.restyle };
    const draw = (fn) => function (gd, data, layout, config) {
      if (isObj(data)) ({ data, layout, config } = data); // newPlot(gd, { data, layout, config })
      const node = el(gd);
      if (node) sources.set(node, { data: data || [], layout: layout || {} });
      const styled = styleChart(data, layout);
      // Touch screens: a finger drag scrolls the page instead of zooming the chart, and
      // the mode bar (which needs hover and covers the plot) is hidden. Taps still show values.
      if (touchCharts()) {
        styled.layout = merge(styled.layout || {}, { dragmode: false });
        config = { ...(config || {}), displayModeBar: false, scrollZoom: false };
      }
      const done = fn.call(P, gd, styled.data, styled.layout, config);
      if (node) Promise.resolve(done).then(() => {
        if (!node.__nexusGlow && node.on) { node.__nexusGlow = true; node.on("plotly_afterplot", () => glow(node)); }
        glow(node);
      });
      return done;
    };
    P.newPlot = draw(raw.newPlot);
    P.react = draw(raw.react);
    // Carry simple top-level restyles (e.g. toggling `visible`) into the stored source.
    P.restyle = function (gd, update, indices) {
      const src = sources.get(el(gd));
      if (src && isObj(update)) {
        const idx = indices === undefined ? src.data.map((_, i) => i) : [].concat(indices);
        src.data = src.data.map((t, i) => {
          const j = idx.indexOf(i);
          if (j < 0) return t;
          const u = { ...t };
          for (const [k, v] of Object.entries(update)) if (!k.includes(".")) u[k] = Array.isArray(v) ? v[j % v.length] : v;
          return u;
        });
      }
      return raw.restyle.apply(P, arguments);
    };
    P.__nexus = true;
    return P;
  }
  // nexus.js loads before Plotly, so catch the global as Plotly's bundle assigns it.
  if (window.Plotly) wrapPlotly(window.Plotly);
  else {
    let held;
    try {
      Object.defineProperty(window, "Plotly", {
        configurable: true, enumerable: true,
        get: () => held,
        set: (v) => { held = wrapPlotly(v); },
      });
    } catch (e) { /* charts keep the base style */ }
  }

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
    const fonts = { font: { family: font() }, hoverlabel: { font: { family: font() } } };
    document.querySelectorAll(".js-plotly-plot").forEach((gd) => {
      if (!gd.data || !gd.layout) return;
      try {
        const src = sources.get(gd);
        if (!src) {
          window.Plotly.react(gd, gd.data.map((t) => walk(t, false)), merge(walk(gd.layout, false), fonts), gd._context || plotlyConfig);
          return;
        }
        // Restyle from the page's version; keep the viewer's zoom.
        const layout = merge(walk(src.layout, false), fonts);
        for (const k of Object.keys(gd.layout).filter((k) => /^[xy]axis\d*$/.test(k))) {
          if (gd.layout[k].autorange === false) layout[k] = merge(layout[k] || {}, { range: gd.layout[k].range, autorange: false });
        }
        window.Plotly.react(gd, src.data.map((t) => walk(t, false)), layout, gd._context || plotlyConfig);
      } catch (e) { /* a chart that can't be re-coloured keeps its old colours */ }
    });
  }

  // ---------- Home-screen web app: head tags and status bar colour ----------

  // Pages only need the usual viewport tag; this adds what iOS and Android read when the
  // page is added to the home screen. viewport-fit=cover lets the layout use the safe-area
  // insets (notch, Dynamic Island, home indicator); nexus.css pads for them.
  function headTag(attrs) {
    const el = document.createElement(attrs.rel ? "link" : "meta");
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    document.head.appendChild(el);
    return el;
  }
  function setupHead() {
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp && !/viewport-fit/.test(vp.content)) vp.content += ", viewport-fit=cover";
    const has = (name) => document.querySelector(`meta[name="${name}"]`);
    if (!has("mobile-web-app-capable")) headTag({ name: "mobile-web-app-capable", content: "yes" });
    if (!has("apple-mobile-web-app-capable")) headTag({ name: "apple-mobile-web-app-capable", content: "yes" });
    // "default" lets the status bar take theme-color, so it follows light and dark themes.
    if (!has("apple-mobile-web-app-status-bar-style")) headTag({ name: "apple-mobile-web-app-status-bar-style", content: "default" });
  }
  let themeColor = null;
  function syncThemeColor() {
    if (!document.head) return;
    if (!themeColor) themeColor = document.querySelector('meta[name="theme-color"]') || headTag({ name: "theme-color", content: "" });
    const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
    if (bg) themeColor.setAttribute("content", bg);
  }
  setupHead();

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
    syncThemeColor();
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
    `<strong>${esc(t.name)}</strong><small>${esc(t.description)}` +
    (CHART_STYLES[t.id] ? ` Charts: ${esc(CHART_STYLES[t.id].name)}.` : "") + "</small></label>";

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

  // The same gesture also minimises the phone tab bar (<html class="nx-bars-min">), as iOS
  // does: it shrinks to one round button and a .dock moves into its row. Scrolling up,
  // reaching the end of the page or tapping the button brings it back.
  function autoHideTopbar() {
    const topbar = document.querySelector(".topbar");
    const hideTop = topbar && root.dataset.nexusTopbar !== "static";
    let lastY = window.scrollY, ticking = false;
    const show = () => {
      if (hideTop) topbar.classList.remove("nx-hidden");
      root.classList.remove("nx-bars-min");
    };
    const update = () => {
      ticking = false;
      const y = window.scrollY, dy = y - lastY;
      const atEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 4;
      const keep = y < (topbar ? topbar.offsetHeight : 60) || atEnd ||
        (topbar && topbar.contains(document.activeElement)) ||
        (panel && panel.box.classList.contains("open")) || root.classList.contains("nx-sheet-open");
      if (keep || dy < -6) show();
      else if (dy > 6) {
        if (hideTop) topbar.classList.add("nx-hidden");
        root.classList.add("nx-bars-min");
      }
      if (Math.abs(dy) > 6 || keep) lastY = y;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    if (topbar) topbar.addEventListener("focusin", show);
    // A tap on the minimised tab bar expands it rather than following the link.
    document.addEventListener("click", (e) => {
      if (!root.classList.contains("nx-bars-min") || !e.target.closest(".nx-tabbar")) return;
      e.preventDefault();
      e.stopPropagation();
      show();
    }, true);
  }

  // Home-screen app: no pinch or double-tap zoom on the page, as in a native app. In the
  // browser zoom stays available. Charts and wide tables still scroll sideways inside.
  function lockZoomInApp() {
    const standalone = navigator.standalone === true ||
      (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
    if (!standalone) return;
    root.classList.add("nx-standalone");
    const stop = (e) => e.preventDefault();
    ["gesturestart", "gesturechange"].forEach((t) => document.addEventListener(t, stop, { passive: false }));
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

  // ---------- App shell: tab bar and "More" sheet from the site's web manifest ----------
  //
  // A site opts in with a manifest.webmanifest next to its home page (found through
  // <link rel="manifest"> or the .brand link). Its "shortcuts" become a bottom tab bar on
  // phones: up to five tabs, or four plus "More" when there are more, like an iOS app.
  // Extra members on each shortcut: nexus_icon (a name from TAB_ICONS), nexus_match
  // (path prefixes, relative to the manifest, that select the tab; default its url) and
  // nexus_group (section heading in the More sheet).

  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const TAB_ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    chart: '<path d="M3 3v17a1 1 0 0 0 1 1h17"/><path d="m7 15 4-5 3 3 6-7"/>',
    bars: '<path d="M3 3v17a1 1 0 0 0 1 1h17"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12" y="6" width="3" height="11" rx="1"/><rect x="17" y="9" width="3" height="8" rx="1"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    pie: '<path d="M21 12A9 9 0 1 1 12 3v9h9Z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z"/>',
    gauge: '<path d="M4.5 18a9 9 0 1 1 15 0"/><path d="m12 13 4-4"/><circle cx="12" cy="13" r="1.2"/>',
    book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5v-15Z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/>',
    doc: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    wallet: '<path d="M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6"/><path d="M17 14h.01"/>',
    more: '<circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  };
  const tabIcon = (name) => svg(TAB_ICONS[name] || TAB_ICONS.link);
  const CHEVRON = '<svg class="nx-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  const APP_KEY = "nexus-app:";

  function manifestUrl() {
    const link = document.querySelector('link[rel="manifest"]');
    if (link) return link.href;
    const brand = document.querySelector(".topbar a.brand[href]");
    return brand ? new URL("manifest.webmanifest", brand.href).href : null;
  }

  // Path of this page relative to the manifest's folder, e.g. "fairvalue/index.html".
  function sitePath(base) {
    const dir = new URL(".", base).pathname, here = location.pathname;
    let rel = here.startsWith(dir) ? decodeURIComponent(here.slice(dir.length)) : null;
    if (rel !== null && (rel === "" || rel.endsWith("/"))) rel += "index.html";
    return rel;
  }

  function matches(item, rel, base) {
    if (rel === null) return false;
    const prefixes = item.nexus_match || [new URL(item.url, base).pathname.slice(new URL(".", base).pathname.length)];
    return prefixes.some((p) => rel.startsWith(p));
  }

  let shell = null;
  function buildShell(man, base) {
    if (shell) { shell.remove(); shell = null; }
    const items = (man.shortcuts || []).filter((s) => s && s.url && s.name);
    if (items.length < 2) { root.classList.remove("nx-has-tabs"); return; }
    const overflow = items.length > 5;
    const tabs = overflow ? items.slice(0, 4) : items;
    const rest = overflow ? items.slice(4) : [];
    const rel = sitePath(base);
    let active = tabs.findIndex((t) => matches(t, rel, base));
    const moreActive = active < 0 && rest.some((t) => matches(t, rel, base));
    const href = (s) => esc(new URL(s.url, base).href);

    const bar = document.createElement("nav");
    bar.className = "nx-tabbar";
    bar.setAttribute("aria-label", man.short_name || man.name || "Sections");
    bar.innerHTML = tabs.map((t, i) =>
      `<a href="${href(t)}"${i === active ? ' class="active" aria-current="page"' : ""}>` +
      `${tabIcon(t.nexus_icon)}<span>${esc(t.short_name || t.name)}</span></a>`).join("") +
      (overflow ? `<button type="button" class="nx-more-btn${moreActive ? " active" : ""}" aria-haspopup="dialog" aria-controls="nx-more" aria-expanded="false">${tabIcon("more")}<span>More</span></button>` : "");
    const nodes = [bar];

    if (overflow) {
      const groups = [];
      for (const s of rest) {
        const g = s.nexus_group || "";
        let grp = groups.find((x) => x.name === g);
        if (!grp) groups.push(grp = { name: g, items: [] });
        grp.items.push(s);
      }
      const btn = bar.querySelector(".nx-more-btn");
      const more = createSheet("nx-more", (open) => btn.setAttribute("aria-expanded", String(open)));
      more.setHead("More");
      more.body.innerHTML = groups.map((g) =>
        (g.name ? `<h3 class="nx-list-head">${esc(g.name)}</h3>` : "") +
        '<ul class="nx-list">' + g.items.map((s) =>
          `<li><a href="${href(s)}"${matches(s, rel, base) ? ' aria-current="page"' : ""}>` +
          `<span class="nx-list-icon">${tabIcon(s.nexus_icon)}</span>` +
          `<span class="nx-list-text"><strong>${esc(s.name)}</strong>${s.description ? `<small>${esc(s.description)}</small>` : ""}</span>` +
          `${CHEVRON}</a></li>`).join("") + "</ul>").join("");
      btn.addEventListener("click", () => more.open(!more.isOpen()));
      nodes.push(...more.nodes);
    }

    document.body.append(...nodes);
    root.classList.add("nx-has-tabs");
    shell = { remove: () => nodes.forEach((n) => n.remove()) };
  }

  // Link the manifest and touch icon on pages that don't, so "Add to Home Screen" works
  // from any page of the site.
  function linkManifest(url, man) {
    if (!document.querySelector('link[rel="manifest"]')) headTag({ rel: "manifest", href: url });
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const icon = (man.icons || []).find((i) => /180/.test(i.sizes || "")) ||
        (man.icons || []).find((i) => !/maskable/.test(i.purpose || ""));
      if (icon) headTag({ rel: "apple-touch-icon", href: new URL(icon.src, url).href });
    }
    if (!document.querySelector('meta[name="apple-mobile-web-app-title"]') && (man.short_name || man.name))
      headTag({ name: "apple-mobile-web-app-title", content: man.short_name || man.name });
  }

  // Draw at once from the copy kept from an earlier page (no flash of the old top nav),
  // then refresh it from the network.
  function setupAppShell() {
    if (root.dataset.nexusTabs === "off") return;
    const url = manifestUrl();
    if (!url) return;
    let cached = null;
    try { cached = localStorage.getItem(APP_KEY + url); } catch (e) { /* no storage */ }
    if (cached) {
      try { const man = JSON.parse(cached); linkManifest(url, man); buildShell(man, url); } catch (e) { cached = null; }
    }
    fetch(url, { cache: "no-cache" })
      .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then((text) => {
        const man = JSON.parse(text);
        try { localStorage.setItem(APP_KEY + url, text); } catch (e) { /* no storage */ }
        if (text !== cached) { linkManifest(url, man); buildShell(man, url); }
      })
      .catch((status) => {
        // No manifest (an HTTP error, not being offline): not an app-shell site.
        // Forget any old copy and keep the top nav.
        if (typeof status !== "number") return;
        try { localStorage.removeItem(APP_KEY + url); } catch (e) { /* no storage */ }
        if (cached && shell) { shell.remove(); shell = null; root.classList.remove("nx-has-tabs"); }
      });
  }

  // ---------- Bottom sheet (phones) ----------
  //
  // A panel that slides up from the bottom: grabber, title (+ optional subtitle), Done,
  // and a scrolling body. Dismissed by Done, the backdrop, Escape or dragging it down.
  // Returns { nodes, body, setHead(title, subtitle), open(yes), isOpen() }; the caller
  // appends `nodes` to the page.
  let sheetSeq = 0;
  function createSheet(id, onToggle) {
    const titleId = `${id}-title-${++sheetSeq}`;
    const backdrop = document.createElement("div");
    backdrop.className = "nx-sheet-backdrop";
    const sheet = document.createElement("div");
    sheet.id = id;
    sheet.className = "nx-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", titleId);
    sheet.tabIndex = -1;
    sheet.innerHTML =
      '<div class="nx-sheet-grabber" aria-hidden="true"></div>' +
      `<div class="nx-sheet-head"><div class="nx-sheet-titles"><h2 id="${titleId}"></h2><small hidden></small></div>` +
      '<button type="button" class="nx-sheet-done">Done</button></div>' +
      '<div class="nx-sheet-body"></div>';
    const body = sheet.querySelector(".nx-sheet-body");
    const done = sheet.querySelector(".nx-sheet-done");
    let opener = null;
    const isOpen = () => sheet.classList.contains("open");
    const open = (yes) => {
      if (yes === isOpen()) return;
      sheet.style.transform = "";
      sheet.classList.toggle("open", yes);
      backdrop.classList.toggle("open", yes);
      root.classList.toggle("nx-sheet-open", yes);
      if (onToggle) onToggle(yes);
      if (yes) {
        opener = document.activeElement;
        body.scrollTop = 0;
        // Focus the dialog itself (screen readers start at its title) without ringing a button.
        sheet.focus({ preventScroll: true });
      } else if (opener && opener.focus) opener.focus({ preventScroll: true });
    };
    backdrop.addEventListener("click", () => open(false));
    done.addEventListener("click", () => open(false));
    sheet.addEventListener("keydown", (e) => { if (e.key === "Escape") open(false); });
    // Drag the sheet down by its header to dismiss it, as in iOS.
    let startY = null, dy = 0;
    [sheet.querySelector(".nx-sheet-grabber"), sheet.querySelector(".nx-sheet-head")].forEach((h) => {
      h.addEventListener("touchstart", (e) => { startY = e.touches[0].clientY; dy = 0; sheet.classList.add("dragging"); }, { passive: true });
      h.addEventListener("touchmove", (e) => {
        if (startY === null) return;
        dy = Math.max(0, e.touches[0].clientY - startY);
        sheet.style.transform = `translateY(${dy}px)`;
      }, { passive: true });
      h.addEventListener("touchend", () => {
        sheet.classList.remove("dragging");
        startY = null;
        if (dy > 80) open(false); else sheet.style.transform = "";
      });
    });
    const setHead = (title, subtitle) => {
      sheet.querySelector("h2").textContent = title;
      const small = sheet.querySelector(".nx-sheet-titles small");
      small.textContent = subtitle || "";
      small.hidden = !subtitle;
    };
    return { nodes: [backdrop, sheet], body, setHead, open, isOpen };
  }

  // ---------- List tables: tables become iOS-style lists on phones ----------
  //
  // <table class="data" data-list> opts in. Header cells name the roles of their columns:
  //   <th data-list="title">     first line, left (default: the first column)
  //   <th data-list="subtitle">  second line, left
  //   <th data-list="value">     first line, right: the number that matters for this table
  //   <th data-list="note" data-list-prefix="Solvency">  second line, right
  //   data-list-prefix="…" / data-list-suffix="…" on any of them adds text around the
  //   cell in the row (e.g. note "Solvency 77", subtitle "22 stocks").
  // On phones the header hides and every row shows just those cells with a chevron; a
  // tap opens a sheet with every column (and an "Open" button when the row has a link).
  // On the <table>:
  //   data-list-tap="native"   the row keeps the page's own tap (select, navigate); no sheet
  //   data-list-action="Zoom"  the sheet's button performs the row's own tap
  // A <tr data-list-detail> right after a row (e.g. an expandable detail row) is hidden
  // in the list and shown inside that row's sheet.
  // Long tables (12+ rows) also get a Sort menu. Columns whose <th> is .sortable are
  // sorted by the page (the menu clicks that header and reads aria-sort back); others
  // are sorted here, by <td data-sort> when present, else by the cell's number or text.
  // <th data-sort-dir="asc"> starts that column ascending (default: numbers descending,
  // text ascending). Rows the page re-renders or filters are picked up automatically.
  //
  // <table data-list="cards"> is for reference and comparison tables (text to read, not
  // rows to open): on phones each row becomes a card, the title column as its heading
  // and every other cell under its column's label. Short values sit side by side; long
  // text takes the full width.

  const PHONE_QUERY = "(max-width: 640px), (pointer: coarse) and (max-height: 500px)";
  const phone = () => !!window.matchMedia && matchMedia(PHONE_QUERY).matches;
  const ROLE_CLASS = { title: "nx-c-title", subtitle: "nx-c-sub", value: "nx-c-value", note: "nx-c-note" };
  const ROLE_CLASSES = Object.values(ROLE_CLASS);
  const headCells = (t) => [...((t.tHead && t.tHead.rows[0] && t.tHead.rows[0].cells) || [])];
  const headLabel = (th) => (th.dataset.listLabel || th.textContent).replace(/[↑↓▲▼]/g, "").trim();
  const listed = new WeakSet();
  let detail = null;

  function roles(t) {
    const r = headCells(t).map((th) => (th.dataset.list || "").trim());
    if (r.length && !r.includes("title")) r[0] = r[0] || "title";
    return r;
  }

  const isCards = (t) => t.dataset.list === "cards";
  const setData = (el, key, v) => { if (v) el.dataset[key] = v; else delete el.dataset[key]; };

  function markList(t) {
    const ths = headCells(t), rs = roles(t), cards = isCards(t);
    t.classList.add(cards ? "nx-tcards" : "nx-tlist");
    t.classList.toggle("nx-tlist-sub", !cards && rs.includes("subtitle"));
    t.classList.toggle("nx-tlist-note", !cards && rs.includes("note"));
    const labels = ths.map(headLabel);
    // A row that already shows every column and leads nowhere has nothing to open: no chevron, no tap.
    const hidden = rs.some((r, i) => !ROLE_CLASS[r] && labels[i]);
    const leads = t.dataset.listAction || t.dataset.listTap === "native" || [...t.tBodies].some((b) => b.querySelector("a[href]"));
    t.classList.toggle("nx-tlist-static", !cards && !hidden && !leads);
    // Cards: a column with any long text spans the card in every row, so cards line up.
    const wide = cards ? ths.map((_, i) => [...t.tBodies].some((b) => [...b.rows].some((tr) => {
      const td = tr.hasAttribute("data-list-detail") ? null : tr.cells[i];
      return td && (td.textContent.trim().length > 26 || !!td.querySelector("table, ul, ol, p"));
    }))) : [];
    for (const body of t.tBodies) for (const tr of body.rows) {
      if (tr.hasAttribute("data-list-detail")) continue;
      [...tr.cells].forEach((td, i) => {
        td.classList.remove(...ROLE_CLASSES, "nx-c-wide");
        const cls = ROLE_CLASS[rs[i]];
        if (cls) td.classList.add(cls);
        if (cards) {
          // Cards: every non-title cell carries its column label; long text spans the card.
          setData(td, "nxLabel", rs[i] === "title" ? "" : labels[i]);
          if (rs[i] !== "title" && wide[i]) td.classList.add("nx-c-wide");
        } else {
          setData(td, "nxPrefix", ROLE_CLASS[rs[i]] && ths[i] && ths[i].dataset.listPrefix);
          setData(td, "nxSuffix", ROLE_CLASS[rs[i]] && ths[i] && ths[i].dataset.listSuffix);
        }
      });
    }
    syncSort(t);
  }

  // ----- Row detail sheet -----
  function openDetail(t, tr) {
    if (!detail) {
      detail = createSheet("nx-detail");
      document.body.append(...detail.nodes);
    }
    const ths = headCells(t), rs = roles(t), cells = [...tr.cells];
    // A cell's text as the row shows it, with its column's prefix and suffix ("Trade 1").
    const text = (i) => {
      const v = i >= 0 && cells[i] ? cells[i].textContent.trim() : "";
      if (!v || !ths[i]) return v;
      return [ths[i].dataset.listPrefix, v, ths[i].dataset.listSuffix].filter(Boolean).join(" ");
    };
    detail.setHead(text(rs.indexOf("title")) || "Details", text(rs.indexOf("subtitle")));
    const rows = cells.map((td, i) => {
      if (rs[i] === "title" || rs[i] === "subtitle" || !ths[i]) return "";
      const label = headLabel(ths[i]);
      const value = td.innerHTML.trim();
      if (!label) return ""; // unlabelled columns are controls (an expand caret) or decoration
      return `<li><div class="nx-kv"><span>${esc(label)}</span><b>${value || "–"}</b></div></li>`;
    }).join("");
    // Detail rows that follow this row (e.g. a trade's legs) go under the values.
    let extra = "";
    for (let n = tr.nextElementSibling; n && n.hasAttribute("data-list-detail"); n = n.nextElementSibling)
      extra += [...n.cells].map((c) => c.innerHTML).join("");
    const action = t.dataset.listAction;
    const link = !action && tr.querySelector("a[href]");
    detail.body.innerHTML = (rows ? `<ul class="nx-list nx-kv-list">${rows}</ul>` : "") +
      (extra ? `<div class="nx-sheet-extra">${extra}</div>` : "") +
      (action ? `<button type="button" class="btn primary nx-sheet-action">${esc(action)}${CHEVRON}</button>` : "") +
      (link ? `<a class="btn primary nx-sheet-action" href="${esc(link.href)}"${link.target ? ` target="${esc(link.target)}" rel="noopener"` : ""}>` +
        `Open ${esc(text(rs.indexOf("title")) || "page")}${CHEVRON}</a>` : "");
    if (action) detail.body.querySelector(".nx-sheet-action").addEventListener("click", () => {
      detail.open(false);
      tr.__nxPass = true; // let this click through to the page's own row handler
      tr.click();
    });
    detail.open(true);
  }

  // ----- Sorting -----
  // A cell's sort key: its data-sort, else (in a .num column) the first number in its
  // text, else its text. Empty cells and dashes give null and always sort last.
  function cellKey(td, numeric) {
    if (!td) return null;
    const own = td.dataset.sort !== undefined;
    const raw = own ? td.dataset.sort : td.textContent.trim();
    if (raw === "" || /^[–—-]$|^n\/a/i.test(raw)) return null;
    if (!own && !numeric) return raw.toLowerCase();
    const n = raw.replace(/[,\s ]/g, "").replace(/[−–]/g, "-").match(/-?\d+(\.\d+)?/);
    return n ? parseFloat(n[0]) : raw.toLowerCase();
  }
  const defaultDir = (th) => (th.dataset.sortDir === "asc" ? 1 : th.dataset.sortDir === "desc" ? -1 : th.classList.contains("num") ? -1 : 1);

  function sortHere(t, i, dir) {
    const body = t.tBodies[0];
    if (!body) return;
    const th = headCells(t)[i], numeric = !!th && th.classList.contains("num");
    const rows = [...body.rows].map((tr, k) => ({ tr, k, v: cellKey(tr.cells[i], numeric) }));
    rows.sort((a, b) => {
      if (a.v === null || b.v === null) return a.v === null ? (b.v === null ? a.k - b.k : 1) : -1;
      if (typeof a.v === "number" && typeof b.v === "number") return (a.v - b.v) * dir || a.k - b.k;
      return String(a.v).localeCompare(String(b.v)) * dir || a.k - b.k;
    });
    t.__nxSort = { i, dir };
    headCells(t).forEach((th, j) => (j === i ? th.setAttribute("aria-sort", dir > 0 ? "ascending" : "descending") : th.removeAttribute("aria-sort")));
    body.append(...rows.map((r) => r.tr));
  }

  function currentSort(t) {
    const ths = headCells(t);
    const i = ths.findIndex((th) => th.hasAttribute("aria-sort") && th.getAttribute("aria-sort") !== "none");
    if (i >= 0) return { i, dir: ths[i].getAttribute("aria-sort") === "ascending" ? 1 : -1 };
    return t.__nxSort || null;
  }

  function buildSortTools(t) {
    if (t.__nxTools || t.dataset.listSort === "off") return;
    const rowCount = t.tBodies[0] ? t.tBodies[0].rows.length : 0;
    if (rowCount < 12 && t.dataset.listSort !== "on") return;
    const tools = document.createElement("div");
    tools.className = "nx-list-tools";
    tools.innerHTML = '<label class="nx-sort"><span>Sort</span><select aria-label="Sort by"></select></label>' +
      '<button type="button" class="nx-sort-dir" aria-label="Reverse order"></button>';
    (t.closest(".table-wrap") || t).before(tools);
    const select = tools.querySelector("select"), dirBtn = tools.querySelector(".nx-sort-dir");
    select.addEventListener("change", () => {
      const i = +select.value, th = headCells(t)[i];
      if (!th) return;
      if (th.classList.contains("sortable")) th.click();
      else sortHere(t, i, defaultDir(th));
      syncSort(t);
    });
    dirBtn.addEventListener("click", () => {
      const cur = currentSort(t);
      if (!cur) return;
      const th = headCells(t)[cur.i];
      if (th && th.classList.contains("sortable")) th.click();
      else sortHere(t, cur.i, -cur.dir);
      syncSort(t);
    });
    t.__nxTools = { select, dirBtn };
  }

  function syncSort(t) {
    const tools = t.__nxTools;
    if (!tools) return;
    const ths = headCells(t), cur = currentSort(t);
    const opts = ths.map((th, i) => (headLabel(th) ? `<option value="${i}">${esc(headLabel(th))}</option>` : "")).join("");
    const key = (cur ? "1" : "0") + opts;
    if (tools.select.dataset.opts !== key) {
      tools.select.innerHTML = (cur ? "" : '<option value="" disabled>Default order</option>') + opts;
      tools.select.dataset.opts = key;
    }
    tools.select.value = cur ? String(cur.i) : "";
    tools.dirBtn.disabled = !cur;
    tools.dirBtn.textContent = cur && cur.dir > 0 ? "↑" : "↓";
    tools.dirBtn.setAttribute("aria-label", cur && cur.dir > 0 ? "Ascending; tap to reverse" : "Descending; tap to reverse");
  }

  function initList(t) {
    if (listed.has(t)) return;
    listed.add(t);
    if (!isCards(t)) buildSortTools(t);
    markList(t);
    // On phones a tap anywhere on a row opens its details instead of following a link.
    t.addEventListener("click", (e) => {
      if (!phone() || !t.classList.contains("nx-tlist") || t.classList.contains("nx-tlist-static") || t.dataset.listTap === "native") return;
      const tr = e.target.closest("tr");
      if (!tr || !tr.parentElement || tr.parentElement.parentElement !== t || tr.parentElement.tagName !== "TBODY") return;
      if (tr.__nxPass) { tr.__nxPass = false; return; }
      if (tr.hasAttribute("data-list-detail") || e.target.closest("button, input, select, textarea, label")) return;
      e.preventDefault();
      openDetail(t, tr);
    });
  }

  function setupListTables() {
    document.querySelectorAll("table[data-list]").forEach(initList);
    if (!("MutationObserver" in window)) return;
    const dirty = new Set();
    let queued = false;
    new MutationObserver((records) => {
      for (const m of records) {
        const t = m.target.closest ? m.target.closest("table[data-list]") : null;
        if (t) dirty.add(t);
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.matches("table[data-list]")) dirty.add(n);
          else if (n.querySelector) n.querySelectorAll("table[data-list]").forEach((x) => dirty.add(x));
        }
      }
      if (!dirty.size || queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        for (const t of dirty) { if (!listed.has(t)) initList(t); else markList(t); }
        dirty.clear();
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    buildPanel();
    autoHideTopbar();
    revealActiveNav();
    setupDocks();
    setupAppShell();
    syncThemeColor();
    lockZoomInApp();
    setupListTables();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.Nexus = {
    themes: THEMES.map((t) => ({ ...t, chartStyle: CHART_STYLES[t.id].name })),
    get theme() { return applied; },
    get choice() { return choice; },
    setTheme,
    onThemeChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get colors() { return colors(); },
    token,
    plotlyLayout,
    plotlyConfig,
    get chartStyle() { const s = chartStyle(); return { name: s.name, description: s.description }; },
    chartStyles: Object.fromEntries(Object.entries(CHART_STYLES).map(([id, s]) => [id, { name: s.name, description: s.description }])),
    styleChart,
    bands: (list) => marks(list, "band"),
    events: (list) => marks(list, "event"),
    rgba,
    merge,
  };
})();
