---
name: nexus-style
description: The Investing Nexus design system (switchable themes — Midnight navy by default — blue accent, teal/orange polarity, gold highlights, theme panel). Use when building or restyling any web page, dashboard, report or chart that should match Investing Nexus or "the nexus style", or when the user asks to change that shared style or its themes.
---

# Nexus style

This skill's directory is a clone of https://github.com/doruirimescu/nexus-design,
the single source of truth for the style.

## Before anything else

Get the latest version. The style may have changed since this clone was updated:

```bash
git -C "<this skill's base directory>" pull --ff-only
```

If the pull fails (no network, local edits), carry on with the local copy and
mention it to the user.

Then read `DESIGN.md` in this directory in full. It contains the rules, tokens,
components and chart setup.

## Building a page in this style

- Start from `template.html` here.
- **Link the live files in `<head>`**, stylesheet first, script without async/defer:
  `<link rel="stylesheet" href="https://doruirimescu.github.io/nexus-design/nexus.css">`
  `<script src="https://doruirimescu.github.io/nexus-design/nexus.js"></script>`.
  Don't copy them into the project. Linking them is what makes later style and
  theme changes reach the page without edits, and the script adds the theme panel.
- Never hard-code a colour: use tokens (`var(--accent)`), `Nexus.colors` /
  `Nexus.token()` in JavaScript, and swatch classes (`.sw-under`) in markup.
- For charts use `Nexus.plotlyLayout()` / `Nexus.colors`; they follow the theme.
- If the page must work fully offline or without third-party URLs, ask the user
  before vendoring a copy. A copy won't receive updates.
- Use only the components and tokens in `DESIGN.md`. If you need something new
  that would be reusable, add it to this repo (see below) rather than to the
  project.

## Changing the style itself

When the user wants the shared style changed (colours, spacing, a new
component):

1. Edit the files in this directory: `nexus.css` (components), `themes/*.css`
   (colours) and `nexus.js` (theme list, charts). To add a theme, follow
   "Adding a theme" in `DESIGN.md`. Update `DESIGN.md` and the gallery
   `index.html` to match.
2. Open `index.html` from disk to check the result in several themes. It links the local files.
3. Commit, and ask the user before pushing. Pushing restyles every page that
   links the live stylesheet, across all their projects.
