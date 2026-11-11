/*
 * Illustrative data and a tiny backtester for the Perfect Shapes examples (dashboard.html, trade-lab.html).
 * Everything here is SYNTHETIC: a seeded mean-reverting series stands in for a basket ratio, so the pages
 * need no server and show the same numbers every time. Nothing in this file is part of the design system.
 */
(function () {
  "use strict";
  const PPY = 252;

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const gauss = (r) => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };

  function businessDays(n, start) {
    const out = [], d = new Date((start || "2016-01-04") + "T00:00:00Z");
    while (out.length < n) { const w = d.getUTCDay(); if (w && w < 6) out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
    return out;
  }

  /**
   * log ratio: an Ornstein-Uhlenbeck swing around a centre. `k` is the pull per bar, `sigma` the noise per bar.
   * `shift: { at, by, len }` moves the centre by `by` over `len` bars from bar `at`: the range breaks.
   */
  function logRatio(seed, o) {
    o = Object.assign({ n: 2520, k: 0.035, sigma: 0.012, shift: null }, o);
    const r = rng(seed), Y = new Float64Array(o.n), sh = o.shift;
    const centre = (t) => (sh ? sh.by * Math.min(Math.max((t - sh.at) / sh.len, 0), 1) : 0);
    for (let t = 1; t < o.n; t++) Y[t] = Y[t - 1] - o.k * (Y[t - 1] - centre(t)) + o.sigma * gauss(r);
    return Y;
  }

  const quantile = (arr, p) => { const a = Array.from(arr).sort((x, y) => x - y), i = (a.length - 1) * p / 100, f = Math.floor(i); return a[f] + (a[Math.min(f + 1, a.length - 1)] - a[f]) * (i - f); };

  /** the range band of Y[from..to]: median +/- the smaller half of the p10-p90 band. Returns [low, high, median]. */
  function band(Y, from, to, pct) {
    const w = Y.slice(from, to + 1), lo = quantile(w, pct || 10), hi = quantile(w, 100 - (pct || 10)), md = quantile(w, 50);
    const h = Math.min(md - lo, hi - md);
    return [md - h, md + h, md];
  }

  /** daily vol of the log ratio, per year */
  function annualVol(Y, from, to) {
    let s = 0, s2 = 0, n = 0;
    for (let t = from + 1; t <= to; t++) { const d = Y[t] - Y[t - 1]; s += d; s2 += d * d; n++; }
    return Math.sqrt(Math.max(s2 / n - (s / n) ** 2, 0)) * Math.sqrt(PPY);
  }

  /**
   * Band mean reversion on the log ratio Y, trading the pair (long one leg, short the other: P&L = side x ratio change).
   * Enter beyond an edge, exit at the median, fills at the next close. Options:
   *   maxTrades  stop after this many trades        startOnly  enter only if outside the band on the first bar
   *   brk        [low, high]: close and stop when the ratio passes the far side (a "range break")
   * A trade open on the last bar is closed there.
   */
  function backtest(Y, from, to, bandv, o) {
    o = Object.assign({ maxTrades: Infinity, startOnly: false, brk: null, capital: 10000 }, o);
    const R = Y.map(Math.exp), [lo, hi, md] = bandv, eq = new Float64Array(Y.length).fill(NaN), trades = [];
    eq[from] = o.capital;
    let pos = 0, pend = null, ended = false, open = null, started = false;
    const decide = (t) => {
      if (pos) {
        if (o.brk && ((pos > 0 && Y[t] < o.brk[0]) || (pos < 0 && Y[t] > o.brk[1]))) { ended = true; return { exit: "range break" }; }
        if ((pos > 0 && Y[t] >= md) || (pos < 0 && Y[t] <= md)) return { exit: "median" };
      } else if (!ended && trades.length < o.maxTrades) {
        const sig = Y[t] < lo ? 1 : Y[t] > hi ? -1 : 0;
        if (sig) return { enter: sig };
        if (o.startOnly && t === from) ended = true;
      }
      return null;
    };
    pend = decide(from);
    for (let t = from + 1; t <= to; t++) {
      eq[t] = eq[t - 1] * (1 + pos * (R[t] / R[t - 1] - 1));
      const last = t === to;
      if (pend && pend.exit && pos) { trades.push({ t0: open, t1: t, side: pos, ret: pos * (R[t] / R[open] - 1), reason: pend.exit }); pos = 0; }
      else if (pend && pend.enter && !pos && !last && trades.length < o.maxTrades) { pos = pend.enter; open = t; started = true; }
      pend = null;
      if (last && pos) { trades.push({ t0: open, t1: t, side: pos, ret: pos * (R[t] / R[open] - 1), reason: "end of period" }); pos = 0; }
      else pend = decide(t);
      if (pend && pend.enter && trades.length + (pos ? 1 : 0) >= o.maxTrades) pend = null;
    }
    // one pass of statistics
    let peak = o.capital, mdd = 0;
    for (let t = from; t <= to; t++) { peak = Math.max(peak, eq[t]); mdd = Math.min(mdd, eq[t] / peak - 1); }
    const swings = trades.filter((x) => x.reason === "median").length;
    return { eq, trades, swings, final: eq[to], total: eq[to] / o.capital - 1, mdd, startSig: Y[from] < lo ? 1 : Y[from] > hi ? -1 : 0, started };
  }

  const fmt = {
    pct: (v, d) => (v * 100).toFixed(d == null ? 1 : d) + "%",
    signed: (v, d) => (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(d == null ? 1 : d) + "%",
    money: (v) => "$" + Math.round(v).toLocaleString("en-US"),
  };

  window.LabDemo = { PPY, rng, gauss, businessDays, logRatio, quantile, band, annualVol, backtest, fmt };
})();
