# Nexus design system

The visual system of Investing Nexus: a set of themes (Midnight navy is the
default), a blue accent, teal/orange polarity and gold text highlights. This
file is the guide for building pages with it. Read it fully before writing
markup.

- Live stylesheet: `https://doruirimescu.github.io/nexus-design/nexus.css`
- Live script (themes, theme panel, charts): `https://doruirimescu.github.io/nexus-design/nexus.js`
- Starter page: [`template.html`](template.html) · Component gallery: [`index.html`](index.html)

## Rules

1. **Link the live files; don't copy them.** Every page links `nexus.css` and
   `nexus.js` from the URLs above, both in `<head>`, in that order, and the
   script without `async`/`defer`. A change pushed to this repo then restyles
   every page. Put page-specific CSS in a small `<style>` block or project
   stylesheet that only adds layout. Never redefine tokens or restyle the
   shared components there.
2. **Never hard-code a colour.** Every colour comes from a token: `var(--accent)`
   in CSS, `Nexus.colors.accent` or `Nexus.token("--accent")` in JavaScript, or a
   swatch class (`.sw-under`) in markup. A hex value in a page will not follow
   the viewer's theme.
3. **Pages are theme-agnostic.** The viewer picks the theme in the panel that
   `nexus.js` adds. Check new work in at least one dark theme (Midnight) and one
   light theme (Daylight).
4. **Teal = positive / undervalued / good, orange = negative / overvalued / bad.**
   The pair is colour-blind safe in every theme. Don't use red/green. Always pair
   the colour with a word (`Undervalued`, `Overvalued`); use `.verdict` for this.
5. **Marks vs text.** Bars and lines use `--under` / `--over`. Text uses the
   `--under-ink` / `--over-ink` variants, which keep text contrast in every theme.
6. **Highlight sparingly.** `<mark>` (gold) is for the single most important fact
   in a sentence. `.hl-accent` (blue) is for supporting numbers. One to three
   per paragraph.
7. **Numbers** are tabular (already set on tables and KPIs) and right-aligned in
   tables (`td.num`).
8. **Mobile.** Layouts must work at 390px wide with no horizontal page scroll.
   Wide tables go inside `.table-wrap`, which scrolls on its own.

## Themes

| Id | Name | Scheme | Character | Type (display / body / mono) | Chart style |
|---|---|---|---|---|---|
| `midnight` | Midnight | dark | Deep navy, blue accent. The default and the original look. | Inter / Inter / JetBrains Mono | Glass |
| `graphite` | Graphite | dark | Neutral charcoal, periwinkle accent. | IBM Plex Sans / IBM Plex Sans / IBM Plex Mono | Blueprint |
| `contrast` | High contrast | dark | Black and white, brighter marks. | Atkinson Hyperlegible Next / same / Atkinson Hyperlegible Mono | Bold |
| `daylight` | Daylight | light | Cool white surfaces, slate text. | Manrope / Manrope / JetBrains Mono | Soft |
| `paper` | Paper | light | Warm cream, ink-blue accent. | Newsreader / Source Sans 3 / IBM Plex Mono | Print |
| `terminal` | Terminal | dark | Green-phosphor CRT, reimagined: green UI; cyan (under), amber (over) and magenta (second series) for data; faint scanlines, glow on display type only. | VT323 / JetBrains Mono / JetBrains Mono | Phosphor |
| `monokai-pro` | Monokai Pro | dark | Warm charcoal of the Monokai Pro editor theme: yellow accent, green (under), pink-red (over), purple second series, orange highlights; spectrum brand gradient. | Fira Sans / Fira Sans / Fira Code | Syntax |
| `monokai-classic` | Monokai Classic | dark | The original olive-black Monokai: hot-pink accent, green (under), orange (over), purple second series, string-yellow highlights. | Source Sans 3 / Source Sans 3 / Source Code Pro | Gutter |
| `monokai-machine` | Monokai Machine | dark | Monokai Pro's blue-slate filter: cyan accent, green (under), coral-red (over), lavender second series, yellow highlights. | Space Grotesk / Space Grotesk / JetBrains Mono | Instrument |

Viewers can also pick **Match system**, which follows the device's light/dark
setting (Daylight or Midnight).

How it works:

- Each theme is a file in `themes/` that sets every token on
  `[data-theme="<id>"]`. `nexus.css` imports them all. Midnight also applies to
  `:root`, so a page without `nexus.js` still renders in Midnight.
- `nexus.js` sets `data-theme` on `<html>` from the viewer's saved choice
  (`localStorage["nexus-theme"]`) before the page paints, and adds the collapsible
  theme panel (a small tab at the bottom right).
- A page can choose its default with `<html data-theme="paper">`; the viewer's
  choice still wins. Hide the panel with `<html data-nexus-panel="off">`.
- Any element can carry `data-theme` to show a different theme inside it, which is how
  the panel and the gallery draw previews.
- The theme button sits at the end of the page's `.topbar` (a floating tab on pages
  without one).
- The `.topbar` slides away while scrolling down and returns on any scroll up, so
  phones get the full screen for content. Keep it fixed with
  `<html data-nexus-topbar="static">`. On phones the nav is one swipeable row, scrolled
  so the active link is in view.
- On a switch, every Plotly chart is re-coloured automatically: each colour that
  matched a token of the old theme becomes the same token of the new theme.
  Colours a page derives some other way can be redrawn in
  `Nexus.onThemeChange(fn)` (also fired as the `nexus:themechange` window event).

### Adding a theme

1. Copy `themes/midnight.css` to `themes/<id>.css`, change the selector to
   `[data-theme="<id>"]` (no `:root`) and set every token, including `color-scheme`,
   the fonts and `--radius`. Add any new font family to the Google Fonts `@import`
   at the top of `nexus.css`. A theme may add a few scoped rules after its tokens
   (Terminal adds scanlines and a display-type glow); keep them decorative and never
   reduce text contrast.
2. Add `@import url("themes/<id>.css");` to the top of `nexus.css`.
3. Add `{ id, name, scheme, description }` to `THEMES` in `nexus.js`.
4. Check contrast: `--text` ≥ 7:1, and `--muted`, `--accent`, the `-ink`
   colours and `--on-accent` on `--accent-strong` ≥ 4.5:1 against `--surface`.
   Marks (`--under`, `--over`, `--series-2`, `--neutral`) need ≥ 3:1.
5. Keep the chart tokens (the ones in `TOKENS` in `nexus.js`) distinct from each
   other within the theme. The chart re-colouring relies on it.
   Add the theme's chart style to `CHART_STYLES` in `nexus.js` (see "Chart styles").
6. Add a row to the table above, then open `index.html` and look at every
   section in the new theme.

## Tokens

Every theme defines all of these. Values below are Midnight's.

| Token | Midnight | Use |
|---|---|---|
| `--bg`, `--bg-glow`, `--bg-glow-2` | `#0a1628` … | page background and its two radial glows |
| `--surface` / `--surface-2` / `--surface-3` | `#0f1b33` / `#14244a` / `#1a2d5a` | panels, inputs, raised areas |
| `--border` / `--border-strong` | `#1f3460` / `#2b4680` | dividers / control borders |
| `--text` / `--muted` / `--faint` | `#e6edf7` / `#9fb0cf` / `#6b80a8` | primary / secondary / tertiary text |
| `--accent` / `--accent-strong` / `--accent-soft` | `#4f8cff` / `#2f6fea` / 14% accent | links, primary buttons, active states |
| `--accent-ink` / `--on-accent` | `#bcd4ff` / `#fff` | accent-coloured text / text on `--accent-strong` |
| `--hl-bg` / `--hl-text` / `--hl-soft` / `--hl-line` | 16% gold / `#fde68a` / … | `<mark>`, tags, callouts |
| `--under` / `--under-ink` / `--under-soft` / `--under-line` | `#14a088` / `#5fd4bd` / … | positive mark / text / tint / border |
| `--over` / `--over-ink` / `--over-soft` / `--over-line` | `#dd6a2c` / `#f4a06f` / … | negative mark / text / tint / border |
| `--neutral` | `#6c81a9` | neutral mark (neither positive nor negative) |
| `--series-2` / `--series-2-ink` / `--series-2-soft` | `#c98500` / `#f0c060` / … | second categorical series (after `--accent`); never in the same chart as the polarity pair |
| `--zero-line` | `#3a5594` | chart zero line |
| `--seq-low` / `--seq-mid` / `--seq-high` | | sequential colour scale (heatmaps) |
| `--div-mid` | `#24375f` | midpoint of a diverging scale (`--over` → `--div-mid` → `--under`) |
| `--topbar-bg`, `--row-hover`, `--shadow`, `--shadow-hover` | | chrome and elevation |
| `--gradient-text`, `--brand-gradient` | | `.gradient-text`, `.brand-mark` |
| `--font` / `--font-display` / `--mono` | Inter / Inter / JetBrains Mono | body, headlines + KPI numbers, tickers and code (per theme) |
| `--radius` | `12px` | cards, panels, tables (per theme) |

## Page skeleton

Start from [`template.html`](template.html): `.topbar` (brand plus `.nav`), then
`main.container` (use `.container.narrow` for text-heavy pages), then `.footer`.
Mark the current page's nav link with `class="active"`.

Page header pattern: `.eyebrow` label, `h1` with one word in `.gradient-text`,
then a `p.lead` summary that uses `<mark>` for the key fact.

Separate sections with `<h2 class="section">Title</h2>`.

## Components

```html
<!-- Link cards in a responsive grid; .tag is an optional gold pill in the corner -->
<div class="card-grid">
  <a class="card" href="x.html"><em class="tag">8 Oct 2026</em><strong>Title</strong><span>Description.</span></a>
</div>

<!-- Generic raised container -->
<div class="panel">…</div>

<!-- KPI tiles (.kpis.tight for less top margin, .value.sm for a smaller number) -->
<div class="kpis">
  <div class="panel kpi"><div class="label">Equal-weight</div><div class="value">14.5%</div>
    <div class="sub"><span class="verdict over">Overvalued</span> · average gap</div></div>
</div>
<!-- Progress bar (inside a KPI or on its own) -->
<div class="progress"><div style="width:62%;background:var(--under)"></div></div>

<!-- Polarity label (coloured square + word), and plain polarity text -->
<span class="verdict under">Undervalued 12%</span>  <span class="verdict over">Overvalued 30%</span>
<span class="pos">+4.2%</span> <span class="neg">−1.3%</span> <span class="dim">n/a</span>

<!-- Status badges -->
<span class="badge live">Latest snapshot</span>  <span class="badge past">Historical</span>

<!-- Ticker chips -->
<span class="chips"><span class="chip">NVDA</span><span class="chip">AMD</span></span>

<!-- Buttons (.primary, .on = toggled, .sm, .lg) and inputs -->
<button class="btn">Secondary</button> <button class="btn primary">Primary</button>
<input class="input" type="search" placeholder="Search…">  <select class="input">…</select>

<!-- Control group (e.g. a date picker); .page-head + .page-controls lay it out next to the title -->
<div class="date-bar"><label>Date</label><button class="btn">‹</button><select>…</select><button class="btn">›</button></div>

<!-- Forms -->
<div class="form-grid">
  <label class="field">Ticker <span class="hint">Any US listing</span><input class="input"></label>
  <div class="form-actions"><button class="btn primary lg">Calculate</button></div>
</div>
<input type="file" class="file-input">

<!-- Toolbar above a table -->
<div class="toolbar"><input class="input" type="search"><span class="muted small">Showing 5 of 97</span></div>

<!-- Data table; .sym for tickers, .num for right-aligned numbers, .company for wrapping text -->
<div class="table-wrap scroll-y"><table class="data">
  <thead><tr><th>Symbol</th><th class="num">Price</th></tr></thead>
  <tbody><tr><td class="sym">NVDA</td><td class="num">179.16</td></tr></tbody>
</table></div>
<!-- Key/value results: table.data.kv, rows .key / .row-under / .row-over -->

<!-- Labelled horizontal bars -->
<div class="dist-row"><div class="dist-label">Label</div>
  <div class="dist-track"><div class="dist-bar" style="width:60%;background:var(--under)"></div></div>
  <div class="dist-count">12</div></div>

<!-- Text: .prose, .formula (block), .callout (gold note), .notice (error), .code-block, .kbd -->

<!-- Segmented control: one pressed option (aria-pressed="true") -->
<div class="segmented" role="group" aria-label="Source">
  <button class="btn" aria-pressed="true">AlphaSpread</button><button class="btn" aria-pressed="false">Fair Value</button>
</div>

<!-- Dock: a floating copy of a page control. nexus.js shows it once the element named
     in data-dock-for has scrolled up out of view (bottom centre, thumb-reachable on
     phones). The page renders the same buttons in both and keeps them in sync. -->
<div class="dock" data-dock-for="#source-switch" role="group" aria-label="Source">
  <label>Source</label><button class="btn" aria-pressed="true">AlphaSpread</button>…
</div>

<!-- Two-column layout that stacks on mobile -->
<div class="two-col">…</div>

<!-- Table of contents for long reads (numbered, two columns on wide screens) -->
<nav class="toc"><h4>Contents</h4><ol><li><a href="#ch1">What is a dollar?</a></li>…</ol></nav>

<!-- T-accounts: balance sheets for money mechanics. .up / .down tint a row that just
     changed (teal / orange, with the change in <small>); .zero dims an empty line. -->
<div class="t-grid">
  <div class="t-account"><div class="t-title">Federal Reserve<small>the central bank</small></div>
    <div class="t-side"><h4>Assets</h4><div class="t-row up"><span>Treasury bonds</span><b>400 <small>+100</small></b></div></div>
    <div class="t-side"><h4>Liabilities</h4><div class="t-row up"><span>Bank reserves</span><b>250 <small>+100</small></b></div></div>
    <div class="t-total"><span>Total</span><b>400</b></div><div class="t-total"><span>Total</span><b>400</b></div>
  </div>
</div>

<!-- Timeline: dated events; buttons with aria-pressed make it a picker (e.g. for a chart) -->
<ol class="timeline"><li><button class="timeline-item" aria-pressed="true">
  <time>15 Mar 2020</time><strong>Zero rates and $700B QE</strong><span>What happened.</span></button></li></ol>

<!-- Range slider with a label and a live value -->
<label class="range-field">Reserves <output>$3.00T</output><input type="range" min="0.6" max="4.6" step="0.05"></label>
```

Helpers: `.muted`, `.faint`, `.small`, `.scroll-y`, `.gradient-text`, `.hl-accent`, `<mark>`.

## Charts

Use Plotly with `nexus.js`, so charts follow the theme:

```html
<div class="panel chart-panel">
  <div class="chart-head"><h3>Title</h3>
    <div class="legend"><span><i class="sw-under"></i>Undervalued</span><span><i class="sw-over"></i>Overvalued</span></div></div>
  <div id="chart" class="chart"></div>   <!-- .h-lg / .h-md / .h-sm for shorter charts -->
</div>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<script>
  const C = Nexus.colors;   // read at draw time: it reflects the current theme
  Plotly.newPlot("chart", [{ type: "bar", x, y, marker: { color: C.positive, cornerradius: 3 } }],
                 Nexus.plotlyLayout({ yaxis: { ticksuffix: "%" } }), Nexus.plotlyConfig);
</script>
```

- `Nexus.colors` keys: `accent`, `positive`/`negative` (= under/over),
  `positiveInk`/`negativeInk`, `series2`, `series2Ink`, `neutral`, `highlight`,
  `zeroLine`, `seqLow`/`seqMid`/`seqHigh`, `divMid`, `text`, `muted`, `faint`, `bg`,
  `surface`, `surface2`, `surface3`, `border`, `borderStrong`.
- Use `Nexus.rgba(color, alpha)` for translucent fills; the re-colouring keeps the alpha.
- Legend swatches: `<i class="sw-under">`, `sw-over`, `sw-accent`, `sw-neutral`,
  `sw-series-2`; `.ln` for a line, `.band` for a translucent band.
- Use one y-axis per chart; never two y-axes.
- Don't hand-style marks or axes for the look (bar corners, line weight, marker
  shape, gridlines); the chart style does that per theme (below).
- Every chart has a hover tooltip, and a legend when it has two or more series.
- For a categorical series beyond the polarity pair, use `accent`, then `series2`, then `neutral`
  (and `faint` for an "other" remainder layer).

### Areas, range bands, eras and events

```js
// Stacked area: give each layer an opaque colour; the theme picks the fill treatment.
{ type: "scatter", mode: "lines", stackgroup: "one", x, y, line: { color: C.accent, width: 1 }, fillcolor: C.accent }
// Single area under a line
{ type: "scatter", x, y, fill: "tozeroy", line: { color: C.accent } }
// Range band (e.g. a target range): an invisible lower edge, then fill: "tonexty" with a
// translucent fillcolor. A translucent fill is the page's choice and is kept as set.
{ x, y: lower, line: { width: 0, color: C.neutral }, hoverinfo: "skip" },
{ x, y: upper, fill: "tonexty", fillcolor: Nexus.rgba(C.neutral, 0.22), line: { width: 0, color: C.neutral } }

// Shaded eras (programmes, regimes, recessions) and dated event lines
const b = Nexus.bands([{ x0: "2008-11-25", x1: "2010-03-31", label: "QE1", tone: "accent" }, …]);
const e = Nexus.events([{ x: "2019-09-17", label: "SOFR 5.25%", tone: "negative" }]);
Plotly.newPlot(id, data, Nexus.plotlyLayout({ shapes: [...b.shapes, ...e.shapes], annotations: [...b.annotations, ...e.annotations] }));
```

- `tone` is a `Nexus.colors` key: `accent` (default), `series2`, `neutral`, `positive`, `negative`.
  Labels use the matching ink colour. `labelY` (0–1) staggers crowded labels; `label: ""` hides one
  (do that on phones when bands are narrow).
- Bands sit below the data; event lines above. Their opacity, outline and dash come from the theme.
- A line `width: 0` stays invisible in every chart style.
- Redraw interactive charts with `Plotly.react` (not `relayout`), so a theme switch restyles the
  current state.

### Chart styles

Each theme also has a chart style: how marks and axes are drawn. Colours still come
from the page. `nexus.js` applies it to every `Plotly.newPlot` / `Plotly.react` call,
and restyles drawn charts on a theme switch, so pages need no code for it.

| Style | Theme | Bars | Lines and markers | Areas | Bands and events | Grid and axes |
|---|---|---|---|---|---|---|
| Glass | Midnight | rounded 4px | ×1.1 weight, markers ringed in `--surface` | 32% fill | soft 8% bands, dotted event lines | dotted horizontal grid, no axis lines |
| Blueprint | Graphite | square | ×0.8 weight, square markers | 16% fill | faint bands with dashed edges, mono labels | hairline grid on both axes, framed plot, outside ticks, mono tick labels |
| Bold | High contrast | 2px corners, 1.5px `--bg` outline | ×1.5 weight (min 2.5px), dash pattern per line series, larger ringed markers | 62–82% fill, stacked layers split by `--bg` lines, no dashes | 13% bands with solid edges, dashed events | strong horizontal grid, `--text` axis lines, 13px type |
| Soft | Daylight | rounded 6px | ×1.25 weight, hollow markers | 26% fill | 7% bands, dotted events | light horizontal grid, no axis lines |
| Print | Paper | square, thin ink outline | ×0.85 weight, open markers | hatched (`/` fill pattern) | ruled band edges, serif labels | horizontal grid, `--text` baseline, outside ticks, serif axis titles |
| Phosphor | Terminal | wireframe (outline over a 22% fill) | glowing traces, square markers | faint 10% fill under a glowing edge | dotted band edges, mono labels | dotted graticule on both axes, framed plot, mono tick labels |
| Syntax | Monokai Pro | rounded 3px | ×1.2 weight, markers ringed in `--surface` | 22% fill | 7% bands, dashed events, mono labels | dashed horizontal grid, no axis lines |
| Gutter | Monokai Classic | square, 1.5px `--bg` outline | ×1 weight (min 1.5px), diamond markers | 30–50% fill, stacked layers split by `--bg` lines | 8% bands with dashed edges, mono labels | horizontal grid, `--border-strong` baseline, outside ticks, mono tick labels |
| Instrument | Monokai Machine | 1px corners | ×0.9 weight (min 1.5px), open diamond markers | 18% fill | faint bands with dotted edges, dashed events, mono labels | solid horizontal and dotted vertical grid, framed plot, mono tick labels |

- Explicit page settings win where they are a choice rather than a look: `showgrid`,
  `dash`, `marker.symbol`, an existing bar `marker.line`. Corner radius and line
  weight always come from the style (line weight scales the page's width).
- Charts with more than 60 bars skip bar outlines and the vertical grid.
- `Nexus.chartStyle` is the current style's `{ name, description }`;
  `Nexus.styleChart(data, layout)` applies it by hand for code that bypasses
  `Plotly.newPlot` / `react`. Opt a page out with `<html data-nexus-chart-style="off">`.
- Glow (Phosphor) is CSS in `themes/terminal.css`; `nexus.js` copies each trace's
  colour into `color` so the drop-shadow can use `currentColor`.

## Changing the design system

Edit `nexus.css` (components), `themes/*.css` (colours) and `nexus.js` (theme
list, charts). Update this file and the gallery (`index.html`). Preview by opening
`index.html` from disk (it links the local files), or by serving a site that uses
it against this clone (for Investing Nexus: `scripts/nexus.sh --start` in
stock-market-data uses `../nexus-design` automatically). Then commit and push.
GitHub Pages serves the new version within a few minutes, and every page that
links it updates.
