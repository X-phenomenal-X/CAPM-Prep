# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Floor Check — a CAPM exam prep PWA for Abhay Badhwar (Production Supervisor, window/door glazing & fabrication, Markham ON), studying for the PMI CAPM via UofT Course 4181. The app is a **single-file, zero-dependency, fully offline HTML PWA**.

Two builds:
- `capm-pro.html` — primary/desktop build (source of truth)
- `capm-ios.html` — iOS PWA build. **Never `cp` from the pro build** — regenerate via `python3 make_ios.py` after any change to the pro build. The transform injects iOS standalone-PWA head tags (data-URI touch icon + manifest) and strips the Google Fonts `@import` (the pro build's only external fetch), aliasing the web fonts to iOS system fonts via `@font-face local()`.

Last validated content counts: QUIZ=204, CARDS=116, CONCEPTS=159, GLOSS=168.

## Hard constraints

- **One HTML file.** All JS, CSS, and content stay inline in a single HTML file — no external dependencies, ever (no CDNs, no separate .js/.css files in the shipped build).
- **SRS/flashcard array indices are append-only.** Never insert into or reorder existing items in the content arrays (`QUIZ`, `CARDS`, `CONCEPTS`, `GLOSS`) — saved SRS/Leitner state references items by index.
- **New JS goes before the `/* INIT */` marker.** Keep `capm-pro.html` and any extracted engine files in sync.
- **Animations must be time-based**, driven by `performance.now()` + exponential decay — never frame-count-based. Frame-based animation stalls under headless Playwright's throttled rAF.
- **WebGL:** explicitly enable `OES_standard_derivatives` before using `fwidth` in GLSL shaders.
- Content arrays are declared with `const`/`let` at script top level, so they are **NOT `window` properties**. In external harnesses evaluate:
  `typeof QUIZ !== 'undefined' ? QUIZ.length : 'undefined'` — never `window.QUIZ`.

## Architecture

- **5 tabs:** Home, Learn, Cards, Quiz, Tools.
- Features: 150-question timed exam sim, flashcard SRS/Leitner mistake bank, readiness predictor, study planner, milestones, AI tutor (Anthropic API with offline fallback).
- **WebGL tower hero visualization:** per-pane reflections, Fresnel brightening, sun-glint sweep, spandrel panels, AO, crisp mullions, bloom — with a canvas-2D fallback.
- **Responsive:** mobile bottom tabs ≤899px; desktop sidebar + 2-column dashboard ≥900px.
- **Hero scene (GL path):** lit tower + ground-reflection pass, ring of 14 distant skyline buildings (kind 4) and a 120-point twinkling starfield (kind 5) placed at radius > camera distance so they never occlude the tower, pulsing aviation beacon (kind 3), per-window flicker, eased entrance, idle camera-tilt breathing. Fragment-shader `vKind` branches must stay ordered high-to-low (stars 5 → skyline 4 → beacon 3 → ground 2).
- **FX/UX layer:** particle bursts + confetti + streak float text + haptics on quiz answers, once-per-session splash intro, directional view slides keyed to tab order, tap ripples, shareable canvas scorecard (`.sharebtn` on result screens, navigator.share with download fallback), animated conic border on the home CTA.

## Validation & editing workflow

There is no npm/build system — validation is done with ad-hoc scripts:

- **Edits to the HTML:** use Python `str.replace`, asserting `h.count(old) == n` before each edit to catch unexpected duplicate matches.
- **CSS integrity:** awk brace-balance check over the `<style>` block.
- **JS syntax:** extract the `<script>` content to a temp file and run `node --check` on it.
- **Runtime smoke test:** `node harness.js` with jsdom stubs for `matchMedia`, `scrollTo`/`scrollIntoView`, canvas `getContext` (Proxy with `createRadialGradient` → `addColorStop`), `IntersectionObserver`, and `window.fetch`.
- **Visual checks:** Playwright screenshots with `--use-gl=angle --use-angle=swiftshader --ignore-gpu-blocklist`; wait ≥4000ms for animations to converge before capturing.
- A branded splash overlay shows once per browser session (guarded by `sessionStorage.fcSplash`) and self-removes at ~2.1s — screenshots taken after the 4s animation wait are unaffected; to suppress it entirely, preset `sessionStorage.setItem('fcSplash','1')`.
- `Tower.getMode()` returns `'gl'` or `'2d'` — assert `'gl'` in harnesses to catch silent shader-compile regressions (a broken shader falls back to canvas-2D without any console error).
- `Tower.setReadiness(n)` lights the tower to n% — useful for representative hero screenshots.

## Content authoring

Abhay learns best through quizzes, scenario-based questions, and PMBOK concepts explained with analogies from glazing/curtain-wall fabrication (floor QA checks, fabrication lines, spandrel panels, the One Yonge Toronto project). Phase 2c (complete) added EVM forecast drills (ETC, EAC variants, TCPI-against-EAC, EV-from-%-complete), quality-vs-grade, contract types, change control, critical path, and BA verification/validation & elicitation scenarios. Phase 2d (complete) rebalanced QUIZ toward d4 (elicitation technique selection, requirement types, product vs project scope, solution evaluation, weighted scoring, context diagrams) and d1 fundamentals (org structures, PMO types, phase gates, rolling wave, EEFs/OPAs). Scored-domain shares are now d1 29% / d2 19% / d3 29% / d4 23% vs exam weights 36/17/20/27 — d3 remains overweighted (append-only arrays mean rebalancing is done by adding, not removing; favor d1/d4 in future phases).
