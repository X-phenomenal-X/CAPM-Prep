# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**CAPM Prep** (codename Floor Check — internal names like `Tower`, `fcSplash`, and the repo copy keep the codename) — a CAPM exam prep PWA for Abhay Badhwar (Production Supervisor, window/door glazing & fabrication, Markham ON), studying for the PMI CAPM via UofT Course 4181. The app is a **single-file, zero-dependency, fully offline HTML PWA**.

Three builds — `capm-pro.html` is the source of truth; the other two are **generated, never hand-edited**:
- `capm-pro.html` — primary/desktop build (source of truth)
- `capm-ios.html` — iOS PWA build, regenerate via `python3 make_ios.py`. Injects iOS standalone-PWA head tags (data-URI touch icon + manifest) and strips the Google Fonts `@import` (the pro build's only external fetch), aliasing the web fonts to iOS system fonts via `@font-face local()`.
- `capm-glass.html` — Liquid Glass build, regenerate via `python3 make_glass.py`. Pure reskin + motion layer: frosted translucent panels (backdrop-filter), a drifting 3-blob color field behind the app, a floating glass dock on mobile, and 3D perspective view transitions (overrides the `viewIn`/`slideInR`/`slideInL` keyframes). Same content, engine, and storage keys — progress carries across builds.

After any change to the pro build, regenerate **both** derived builds.

Last validated content counts: QUIZ=204, CARDS=116, CONCEPTS=159, GLOSS=168.

There is also a **next-gen React Three Fiber track** (owner-sanctioned 2026-07-05, superseding the single-file rule *for this track only*): source in `next/` (Vite + React + R3F + drei + postprocessing), built with `cd next && npm install && npm run build` into `app/` (committed, served by GitHub Pages at `/CAPM-Prep/app/`). It reads the classic app's `capm_pro_v1` localStorage (same origin on Pages) and ports the readiness core formula in `next/src/readiness.js` — keep that in sync if `readinessReport()` changes. No runtime asset fetches (procedural `<Environment>` with Lightformers, no HDRIs) so it works offline after first load.

## Hard constraints (classic builds)

- **One HTML file.** All JS, CSS, and content stay inline in a single HTML file — no external dependencies, ever (no CDNs, no separate .js/.css files in the shipped build). Applies to `capm-pro/ios/glass.html`, not the `next/` track.
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
- **Hero scene (GL path):** lit tower + ground-reflection pass, ring of 14 distant skyline buildings (kind 4) and a 120-point twinkling starfield (kind 5) placed at radius > camera distance so they never occlude the tower, pulsing aviation beacon (kind 3), per-window flicker, eased entrance, idle camera-tilt breathing, and a time-of-day atmosphere (`uNight` from the local hour drives sky colors, star/moon visibility, and skyline window density). Fragment-shader `vKind` branches must stay ordered high-to-low (evergreen 8 → final beam 7 → moon 6 → stars 5 → skyline 4 → beacon 3 → ground 2). At readiness ≥99.5% the topping-out ceremony plays: a white final beam + evergreen (real construction tradition) descends onto the parapet, driven by the `uTop` uniform.
- **FX/UX layer:** particle bursts + confetti + streak float text + haptics on quiz answers, once-per-session splash intro, directional view slides keyed to tab order, tap ripples, shareable canvas scorecard (`.sharebtn` on result screens, navigator.share with download fallback), animated conic border on the home CTA.
- **Exam-sim tools (Pearson VUE-style, added by wrapping `renderQuestion`/`renderReview`/`renderResult` — never rewrite the engine):** flag-for-review (`session.flags` keyed by question idx, aligned with `session.results` order), option elimination ×, post-run review navigator grid (`.rvchip`), session summary chips, timer urgency pulse under 5 min. Flashcards support swipe gestures (right=know, left=review; drag applied to `.tiltwrap`, not `#flip`, to avoid fighting the flip/tilt transforms). Desktop keyboard shortcuts: 1-5/A-E answer, Enter next, F flag; Space flip, ←/→ navigate, K/R mark cards.
- **Project Charter:** first-run signable charter modal (name, exam date, why, canvas signature) stored in `progress.charter`; `window.openCharter()` reopens it. Commitment-psychology feature — don't remove the signature pad. The PM name + signature also stamp every shared scorecard.
- **Weekly status report:** once the charter is signed and `progress.log` has ≥3 days, a "status report to the sponsor" card appears on Home every ~7 days (`progress.lastStatus` gates it) with days-on-floor, readiness, and the pace-forecast verdict.
- **Sound:** synthesized Web Audio ticks (correct/wrong/flip/confetti-chime), opt-in via a toggle in the settings sheet (`progress.sound`, default off), suppressed in Exam Conditions mode.
- **Exam Conditions mode:** `progress.blindMode` (toggle on quiz home) arms `session.blind` on mock/exam starts — feedback suppressed via `.blindrun` CSS + FX gate, silent auto-advance, full grading only at the end. Matches real Pearson VUE delivery. During blind runs `body.examenv` dims the ambient backdrop (blobs/aurora paused) for cognitive calm.
- **Calm mode:** `progress.calm` (toggle in settings sheet) sets `body.calm` — kills decorative animation (aurora, blob drift, CTA spin, ripples, float text, gauge shimmer) and shortens view transitions, keeping functional feedback. Accessibility feature — keep it working.

## Validation & editing workflow

There is no npm/build system — validation is done with ad-hoc scripts:

- **Edits to the HTML:** use Python `str.replace`, asserting `h.count(old) == n` before each edit to catch unexpected duplicate matches.
- **CSS integrity:** awk brace-balance check over the `<style>` block.
- **JS syntax:** extract the `<script>` content to a temp file and run `node --check` on it.
- **Storage:** `Store` prefers the legacy `window.storage` API but persists to `localStorage['capm_pro_v1']` as fallback/mirror — required for GitHub Pages persistence and the `app/` R3F bridge. Don't remove the localStorage layer.
- **Deep links:** classic builds handle `#drill=d1..d4|fx` (starts a domain drill) and `#mock` (starts a mock) on load — used by the 3D app's Drill/Mock CTAs.
- **Runtime smoke test:** `node harness.js` with jsdom stubs for `matchMedia`, `scrollTo`/`scrollIntoView`, canvas `getContext` (Proxy with `createRadialGradient` → `addColorStop`), `IntersectionObserver`, and `window.fetch`.
- **Visual checks:** Playwright screenshots with `--use-gl=angle --use-angle=swiftshader --ignore-gpu-blocklist`; wait ≥4000ms for animations to converge before capturing.
- A branded splash overlay shows once per browser session (guarded by `sessionStorage.fcSplash`) and self-removes at ~2.1s — screenshots taken after the 4s animation wait are unaffected; to suppress it entirely, preset `sessionStorage.setItem('fcSplash','1')`.
- `Tower.getMode()` returns `'gl'` or `'2d'` — assert `'gl'` in harnesses to catch silent shader-compile regressions (a broken shader falls back to canvas-2D without any console error).
- `Tower.setReadiness(n)` lights the tower to n% — useful for representative hero screenshots.

## Content authoring

Abhay learns best through quizzes, scenario-based questions, and PMBOK concepts explained with analogies from glazing/curtain-wall fabrication (floor QA checks, fabrication lines, spandrel panels, the One Yonge Toronto project). Phase 2c (complete) added EVM forecast drills (ETC, EAC variants, TCPI-against-EAC, EV-from-%-complete), quality-vs-grade, contract types, change control, critical path, and BA verification/validation & elicitation scenarios. Phase 2d (complete) rebalanced QUIZ toward d4 (elicitation technique selection, requirement types, product vs project scope, solution evaluation, weighted scoring, context diagrams) and d1 fundamentals (org structures, PMO types, phase gates, rolling wave, EEFs/OPAs). Scored-domain shares are now d1 29% / d2 19% / d3 29% / d4 23% vs exam weights 36/17/20/27 — d3 remains overweighted (append-only arrays mean rebalancing is done by adding, not removing; favor d1/d4 in future phases).
