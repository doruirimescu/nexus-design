/*
 * Nexus design system — chart colours and Plotly defaults.
 * Source of truth: https://github.com/doruirimescu/nexus-design  (see DESIGN.md)
 *
 *   <script src="https://doruirimescu.github.io/nexus-design/nexus.js"></script>
 *
 * Exposes window.Nexus:
 *   Nexus.colors               palette (mirrors the CSS custom properties in nexus.css)
 *   Nexus.plotlyLayout(extra)  dark Plotly layout, deep-merged with `extra`
 *   Nexus.plotlyConfig         Plotly config (responsive, no logo, trimmed mode bar)
 *   Nexus.rgba(hex, alpha)     "#rrggbb" -> "rgba(...)"
 */
(function () {
  "use strict";

  const colors = {
    bg: "#0a1628",
    surface: "#0f1b33",
    surface2: "#14244a",
    border: "#1f3460",
    borderStrong: "#2b4680",
    text: "#e6edf7",
    muted: "#9fb0cf",
    faint: "#6b80a8",
    accent: "#4f8cff",
    // Polarity pair, validated colour-blind safe on the dark surface.
    // Marks (bars, lines) use the base colour; text uses the *Ink variant.
    positive: "#14a088",
    negative: "#dd6a2c",
    positiveInk: "#5fd4bd",
    negativeInk: "#f4a06f",
    zeroLine: "#3a5594",
  };

  function isObj(v) {
    return v && typeof v === "object" && !Array.isArray(v);
  }

  function merge(base, extra) {
    const out = { ...base };
    for (const [k, v] of Object.entries(extra || {})) out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
    return out;
  }

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  const FONT = "Inter, system-ui, sans-serif";

  function plotlyLayout(extra) {
    return merge(
      {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { family: FONT, color: colors.muted, size: 12 },
        margin: { l: 56, r: 16, t: 16, b: 56 },
        hoverlabel: { bgcolor: colors.surface2, bordercolor: colors.borderStrong, font: { color: colors.text, family: FONT } },
        xaxis: { gridcolor: colors.border, linecolor: colors.border, zerolinecolor: colors.zeroLine },
        yaxis: { gridcolor: colors.border, linecolor: colors.border, zerolinecolor: colors.zeroLine, zerolinewidth: 1.5 },
        legend: { font: { color: colors.muted } },
      },
      extra
    );
  }

  const plotlyConfig = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] };

  window.Nexus = { colors, plotlyLayout, plotlyConfig, rgba };
})();
