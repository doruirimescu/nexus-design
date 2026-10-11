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

  function wrapPlotly(P) {
    if (!P || P.__nexus) return P;
    const raw = { newPlot: P.newPlot, react: P.react, restyle: P.restyle };
    const draw = (fn) => function (gd, data, layout, config) {
      if (isObj(data)) ({ data, layout, config } = data); // newPlot(gd, { data, layout, config })
      const node = el(gd);
      if (node) sources.set(node, { data: data || [], layout: layout || {} });
      const styled = styleChart(data, layout);
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
