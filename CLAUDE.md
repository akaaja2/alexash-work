# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Alex Ash's personal site (https://alexash.work): a hand-written static site with no build step, no package manager, no tests and no linter. Every page is a single self-contained `.html` file with inline `<style>` and `<script>`. It deploys to Netlify straight from the repo root (`netlify.toml`: `publish = "."`).

## Running locally

Any static server from the repo root works, e.g. `python3 -m http.server 8000` (PowerShell: `python -m http.server 8000`), then open http://localhost:8000. Opening files directly via `file://` mostly works, but the contact form only functions when deployed on Netlify.

## Pages

- `index.html` — the main single-page site (~2000 lines); nearly all work happens here.
- `tpn-in2030.html`, `econ-musings.html` — standalone detail pages linked from project rows in `index.html`; each links back with `href="index.html"`.
- `bookshelf.html` — standalone version of the bookcase. **The same markup is duplicated inline** in the Library (`#books`) section of `index.html`, with CSS scoped under `.bookcase-embed`. Changes to books/links usually need making in both files.
- `thanks.html` — the no-JS fallback target of the contact form (`action="/thanks.html"`).
- `archive/designs/` — old design explorations, not linked from the site.

`netlify.toml` rewrites `/*` to `/index.html` (status 200); Netlify only applies this when no real file matches, so the other pages still resolve.

## index.html architecture

- **Layout**: fixed scroll banner (`#scroll-banner`) on top, then `.layout` = sticky `.sidebar` nav + content `<section>`s (`#about`, `#ai-pm`, `#books`, `#education`, `#econ`, `#contact`). The CSS variable `--banner-h` is live-updated by JS to the banner's rendered height and drives sticky offsets — don't hard-code banner height elsewhere.
- **Banner animation** (main `<script>`): the name is first shown via a letter-scramble overlay, then `opentype.js` (CDN) loads the Bungee TTF from `FONT_URL` and `buildSVG` turns the glyphs into SVG paths. Scroll progress drives the path trace, logo markers riding along the trace (preceded by HTML "logo flyers"), the portrait blur-reveal, and the banner shrink. `prefers-reduced-motion` skips scramble/flyers and shows everything immediately.
- **Sidebar/section nav**: highlights the active section, updates the breadcrumb, and number keys jump to sections. On mobile (`@media` block under "Mobile / responsive") the sidebar becomes a horizontal scroll strip.
- **Project lightbox** (`#proj-lightbox`) and the **contact form** (Netlify Forms: `data-netlify="true"`, honeypot `bot-field`, submitted via `fetch("/")` with a url-encoded body, falling back to `thanks.html`).
- **Book flyer** (`#book-flyer`): a separate IIFE `<script>` at the bottom of the body for the "new book" banner-plane animation.
- DOM order matters: elements the main script touches must appear before its `<script>` tag (a past crash came from `#proj-lightbox` sitting after it). Listeners use optional chaining / null guards — keep that pattern.

## Conventions

- Dark warm palette used across pages: background `#0c0b09`, text `#ede3d0`, accent `#c97b1a`; body font `'Courier New', monospace`, display font Bungee (Google Fonts).
- Images are mostly `.webp` in the repo root; `og-image.png` is the social preview.
- Recent fixes have focused on mobile: avoid anything that causes horizontal overflow (`html`/`body` set `overflow-x: hidden`).
- `.gitignore` excludes `*.md` working docs (this file is explicitly un-ignored) and `cv/` (personal, must never be deployed).
