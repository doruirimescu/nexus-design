# Nexus design system

The visual style of Investing Nexus: deep navy, blue accent, teal/orange polarity,
gold text highlights. This file is the guide for building pages in this style.
Read it fully before writing markup.

- Live stylesheet: `https://doruirimescu.github.io/nexus-design/nexus.css`
- Live chart helper: `https://doruirimescu.github.io/nexus-design/nexus.js`
- Starter page: [`template.html`](template.html) · Component gallery: [`index.html`](index.html)

## Rules

1. **Link the live stylesheet; don't copy it.** Every page links `nexus.css` from
   the URL above, so a change pushed to this repo restyles every page. Put
   page-specific CSS in a small `<style>` block that only adds layout. Never
   redefine the tokens or restyle the components there.
2. **Use the tokens.** Colours come from the CSS custom properties below
   (`var(--accent)`), or from `Nexus.colors` in JavaScript. Never hard-code a hex
   value that duplicates a token.
3. **Dark only.** The theme is dark by design (`color-scheme: dark`). Don't add a
   light mode.
4. **Teal = positive / undervalued / good, orange = negative / overvalued / bad.**
   This pair was validated as colour-blind safe on the navy surface. Don't use
   red/green. Always pair the colour with a word (`Undervalued`, `Overvalued`),
   never colour alone. Use the `.verdict` component for this.
5. **Marks vs text.** Bars and lines use `--under` / `--over`. Text uses the
   lighter `--under-ink` / `--over-ink`.
6. **Highlight sparingly.** `<mark>` (gold) is for the single most important fact
   in a sentence, such as a date or a headline figure. `.hl-accent` (blue) is for
   supporting numbers. Use one to three per paragraph, not more.
7. **Numbers** are tabular (`font-variant-numeric: tabular-nums` is already set on
   tables and KPIs) and right-aligned in tables (`td.num`).
8. **Mobile.** Layouts must work at 390px wide with no horizontal page scroll.
   Wide tables go inside `.table-wrap`, which scrolls on its own.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a1628` | page background (with radial glows, set on `body`) |
| `--surface` / `--surface-2` / `--surface-3` | `#0f1b33` / `#14244a` / `#1a2d5a` | panels, inputs, raised areas |
| `--border` / `--border-strong` | `#1f3460` / `#2b4680` | dividers / control borders |
| `--text` / `--muted` / `--faint` | `#e6edf7` / `#9fb0cf` / `#6b80a8` | primary / secondary / tertiary text |
| `--accent` / `--accent-strong` / `--accent-soft` | `#4f8cff` / `#2f6fea` / 14% accent | links, primary buttons, active states |
| `--hl-bg` / `--hl-text` | 16% gold / `#fde68a` | `<mark>` highlight |
| `--under` / `--under-ink` | `#14a088` / `#5fd4bd` | positive mark / text |
| `--over` / `--over-ink` | `#dd6a2c` / `#f4a06f` | negative mark / text |
| `--radius` | `12px` | cards, panels, tables |
| `--font` / `--mono` | Inter / JetBrains Mono | body / tickers and code |

## Page skeleton

Start from [`template.html`](template.html): `.topbar` (brand plus `.nav`), then
`main.container` (use `.container.narrow` for text-heavy pages), then `.footer`.
Mark the current page's nav link with `class="active"`.

Page header pattern: `.eyebrow` label, `h1` with one word in `.gradient-text`,
then a `p.lead` summary that uses `<mark>` for the key fact.

Separate sections with `<h2 class="section">Title</h2>`. It renders as a small
uppercase label with a rule after it.

## Components

```html
<!-- Link cards in a responsive grid; .tag is an optional gold pill in the corner -->
<div class="card-grid">
  <a class="card" href="x.html"><em class="tag">8 Oct 2026</em><strong>Title</strong><span>Description.</span></a>
</div>

<!-- Generic raised container -->
<div class="panel">…</div>

<!-- KPI tiles -->
<div class="kpis">
  <div class="panel kpi"><div class="label">Equal-weight</div><div class="value">14.5%</div>
    <div class="sub"><span class="verdict over">Overvalued</span> · average gap</div></div>
</div>

<!-- Polarity label (coloured square + word) -->
<span class="verdict under">Undervalued 12%</span>  <span class="verdict over">Overvalued 30%</span>

<!-- Status badges -->
<span class="badge live">Latest snapshot</span>  <span class="badge past">Historical</span>

<!-- Buttons and inputs -->
<button class="btn">Secondary</button> <button class="btn primary">Primary</button>
<input class="input" type="search" placeholder="Search…">  <select class="input">…</select>

<!-- Control group (e.g. a date picker): label, buttons and a select in one pill -->
<div class="date-bar"><label>Date</label><button class="btn">‹</button><select>…</select><button class="btn">›</button></div>

<!-- Toolbar above a table -->
<div class="toolbar"><input class="input" type="search"><span class="muted small">Showing 5 of 97</span></div>

<!-- Data table; .sym for tickers, .num for right-aligned numbers, .company for wrapping text -->
<div class="table-wrap scroll-y"><table class="data">
  <thead><tr><th>Symbol</th><th class="num">Price</th></tr></thead>
  <tbody><tr><td class="sym">NVDA</td><td class="num">179.16</td></tr></tbody>
</table></div>

<!-- Labelled horizontal bars -->
<div class="dist-row"><div class="dist-label">Label</div>
  <div class="dist-track"><div class="dist-bar" style="width:60%;background:var(--under)"></div></div>
  <div class="dist-count">12</div></div>

<!-- Two-column layout that stacks on mobile -->
<div class="two-col">…</div>

<!-- Error / warning callout -->
<div class="notice">Something went wrong.</div>
```

Helpers: `.muted`, `.small`, `.scroll-y`, `.gradient-text`, `.hl-accent`, `<mark>`.

## Charts

Use Plotly with `nexus.js`, so charts follow the theme:

```html
<div class="panel chart-panel">
  <div class="chart-head"><h3>Title</h3>
    <div class="legend"><span><i style="background:var(--under)"></i>Undervalued</span><span><i style="background:var(--over)"></i>Overvalued</span></div></div>
  <div id="chart" class="chart"></div>
</div>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<script src="https://doruirimescu.github.io/nexus-design/nexus.js"></script>
<script>
  Plotly.newPlot("chart", [{ type: "bar", x, y, marker: { color: Nexus.colors.positive, cornerradius: 3 } }],
                 Nexus.plotlyLayout({ yaxis: { ticksuffix: "%" } }), Nexus.plotlyConfig);
</script>
```

- Use one y-axis per chart; never two y-axes.
- Every chart has a hover tooltip, and a legend when it has two or more series.
- For a categorical series beyond the polarity pair, start with `Nexus.colors.accent`.
  Run any new palette through a colour-blind check before adding it to `nexus.js`.

## Changing the style

Edit `nexus.css`, plus `nexus.js` if chart colours change. Update the token table
above and the gallery (`index.html`), then commit and push. GitHub Pages serves
the new version within a few minutes, and every page that links it updates. To
check a change before pushing, open `index.html` from disk; it links the local
files.
