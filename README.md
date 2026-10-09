# nexus-design

The shared visual style of Investing Nexus: deep navy, blue accent, teal/orange
polarity, gold highlights. Pages link the hosted stylesheet, so a change pushed
here restyles every page that uses it.

**Gallery:** <https://doruirimescu.github.io/nexus-design/>

## Use it on a page

```html
<link rel="stylesheet" href="https://doruirimescu.github.io/nexus-design/nexus.css">
<script src="https://doruirimescu.github.io/nexus-design/nexus.js"></script>  <!-- only for charts -->
```

Start from [`template.html`](template.html). The components, tokens and rules are
in [`DESIGN.md`](DESIGN.md).

## Use it from an AI agent

**Claude Code (any project):** clone this repo and link it as a personal skill:

```bash
git clone git@github.com:doruirimescu/nexus-design.git ~/personal/nexus-design
ln -s ~/personal/nexus-design ~/.claude/skills/nexus-style
```

Any session then knows the style. Ask for "a page in the nexus style". The skill
([`SKILL.md`](SKILL.md)) pulls the latest version before using it, and can also
edit and commit the style itself.

**Other agents:** point them at `DESIGN.md`, either the file in a local clone or
<https://github.com/doruirimescu/nexus-design/blob/main/DESIGN.md>.

## Files

| File | What it is |
|---|---|
| `nexus.css` | The stylesheet: tokens and components. |
| `nexus.js` | Chart colours and Plotly defaults (`window.Nexus`). |
| `DESIGN.md` | Guide for building pages: rules, tokens, component snippets. |
| `SKILL.md` | Claude Code skill wrapper around `DESIGN.md`. |
| `template.html` | Starter page. |
| `index.html` | Component gallery (the GitHub Pages homepage). |
| `favicon.svg` | Brand mark. |
| `chrome-theme/` | Matching Google Chrome theme. Load it unpacked from `chrome://extensions` (Developer mode → Load unpacked). |

## Changing the style

Edit `nexus.css` (and `nexus.js` for chart colours), then update `DESIGN.md` and
the gallery. Open `index.html` from disk to preview; it uses the local files.
After you push, GitHub Pages serves the new version within a few minutes.

Hosting: GitHub Pages from `main`, repo root. `.nojekyll` makes Pages publish the
files verbatim.
