---
name: nexus-style
description: The Investing Nexus visual style (dark navy, blue accent, teal/orange polarity, gold highlights). Use when building or restyling any web page, dashboard, report or chart that should match Investing Nexus or "the nexus style", or when the user asks to change that shared style itself.
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
- **Link the live stylesheet**:
  `<link rel="stylesheet" href="https://doruirimescu.github.io/nexus-design/nexus.css">`.
  Don't copy `nexus.css` into the project. Linking it is what makes later style
  changes reach the page without any edits.
- For charts, also load `https://doruirimescu.github.io/nexus-design/nexus.js`
  and use `Nexus.plotlyLayout()` / `Nexus.colors`.
- If the page must work fully offline or without third-party URLs, ask the user
  before vendoring a copy. A copy won't receive updates.
- Use only the components and tokens in `DESIGN.md`. If you need something new
  that would be reusable, add it to this repo (see below) rather than to the
  project.

## Changing the style itself

When the user wants the shared style changed (colours, spacing, a new
component):

1. Edit the files in this directory: `nexus.css`, plus `nexus.js` for chart
   colours. Update `DESIGN.md` (token table, snippets) and the gallery
   `index.html` to match.
2. Open `index.html` from disk to check the result. It links the local files.
3. Commit, and ask the user before pushing. Pushing restyles every page that
   links the live stylesheet, across all their projects.
