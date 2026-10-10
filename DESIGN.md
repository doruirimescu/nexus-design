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

| Id | Name | Scheme | Character | Type (display / body / mono) |
|---|---|---|---|---|
| `midnight` | Midnight | dark | Deep navy, blue accent. The default and the original look. | Inter / Inter / JetBrains Mono |
| `graphite` | Graphite | dark | Neutral charcoal, periwinkle accent. | IBM Plex Sans / IBM Plex Sans / IBM Plex Mono |
| `contrast` | High contrast | dark | Black and white, brighter marks. | Atkinson Hyperlegible Next / same / Atkinson Hyperlegible Mono |
| `daylight` | Daylight | light | Cool white surfaces, slate text. | Manrope / Manrope / JetBrains Mono |
| `paper` | Paper | light | Warm cream, ink-blue accent. | Newsreader / Source Sans 3 / IBM Plex Mono |
| `terminal` | Terminal | dark | Green-phosphor CRT, reimagined: green UI; cyan (under), amber (over) and magenta (second series) for data; faint scanlines, glow on display type only. | VT323 / JetBrains Mono / JetBrains Mono |

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
- Every chart has a hover tooltip, and a legend when it has two or more series.
- For a categorical series beyond the polarity pair, use `accent`, then `series2`.

## Changing the design system

Edit `nexus.css` (components), `themes/*.css` (colours) and `nexus.js` (theme
list, charts). Update this file and the gallery (`index.html`). Preview by opening
`index.html` from disk (it links the local files), or by serving a site that uses
it against this clone (for Investing Nexus: `scripts/nexus.sh --start` in
stock-market-data uses `../nexus-design` automatically). Then commit and push.
GitHub Pages serves the new version within a few minutes, and every page that
links it updates.
