# TEST_REPORT.md — run 2026-11-15 (Asia/Karachi)

## Backend — pytest: 10 passed

Command: `cd backend && .venv/bin/python -m pytest test_app.py -q`
Result: `10 passed in 0.49s` (1 harmless DeprecationWarning from starlette TestClient).

Tests cover:
- `/api/v1/health` returns ok; `/health/deps` counts biomarkers 252, daily 32
- CRI formula: perfect day = 100.0; bad day < 60; bands EXCELLENT/WATCH/URGENT
- CRP L-3→R+1 matches verified OSD-575 values exactly: C001 +107.3, C002 −22.2, C003 +95.2, C004 +28.8
- C002: exactly 8 of 9 analytes fell over 50% at R+1
- Every `/crew/{id}/cri` response: `formula_matches_stored: true`, 8-Sol series
- All endpoints return 200 for all 4 crew (vitals, cri, trend, biomarkers, alerts) + replay, summary, radiation; unknown crew returns 404
- Every C002 alert has why + actions + escalation, level in WATCH/ACT/URGENT
- Replay: sols 140–147, 8 frames, 8 events

## Backend — live uvicorn smoke test

Command: `python -m uvicorn app:app --port 8000`
- `GET /api/v1/health` → `{"status":"ok","service":"orbit-mafia-2.0","version":"2.0.0","db":true}`
- `GET /api/v1/crew/C002/cri` → cri 79.8, recomputed_cri 79.8, formula_matches_stored true, band GOOD, drivers Sleep −6.6 / HRV −6.6
- `GET /api/v1/mission/summary` → C001 avg 91.7, C002 min 47.9 / avg 69.7 / alerts 2, C003 avg 88.4
- `GET /api/v1/crew/XXXX` → 404

## Frontend — build

Command: `cd frontend && npm install && npm run build`
Result: success. `dist/index.html`, `dist/assets/index-*.css` (5.89 kB),
`dist/assets/index-*.js` (183.43 kB, 57.54 kB gzip). 32 modules transformed.

## Frontend — live preview smoke test

Command: `npm run preview -- --port 4173`
- `GET /` → 200, HTML served
- `GET /snapshot.json` → 200 (29 keys, labelled snapshot)

## Data verification

- `data/osd575_biomarkers.csv`: 252 rows (9 analytes × 28 samples). Generator asserts the count.
- `data/synthetic_daily.csv`: 32 rows (Sol 140–147 × 4 crew). C002 CRI Sol 140 79.8 → Sol 142 61.7 → Sol 144 47.9 → Sol 147 79.8 (matches the "82 to 61" working range from v1, low point at the solar event).
- `data/orbit_mafia.db`: rebuilt by `python seed.py` → `{'biomarkers': 252, 'daily': 32}`.

---

# REWORK — 2026-11-15 ~11:20 PKT (Asia/Karachi): all-real integration + design-system pass

Hadi's warning: everything real, nothing to replace by hand, frontend fully
integrated with the backend, smooth, frontend like overworldaudio.com and
secure-the-unknown.cyera.com. Honest-data rule kept: daily vitals/CRI stay
labelled "mission scenario — simulated", because OSDR publishes no daily
sleep/HR/HRV/mood series; every lab number now comes from the real OSD-575
CSV via the API, and the Sol 144 dip is anchored on the page to C002's real
R+1 lab crash.

## What changed (files)
- `backend/app.py` — new endpoint `GET /api/v1/labs/summary`: real CRP
  L-3→R+1 + markers-fell-over-50% per crew + counts from the DB (252 rows,
  28 samples, 9 analytes, 4 crew). No hardcoded numbers anywhere in it.
- `backend/test_app.py` — new test `test_labs_summary_real_numbers`.
- `frontend/src/styles.css` — full design-system rewrite from the two
  reference sites: Cyera Black #160923, Deep Purple #441563, Aubergine
  #6D2D93, Lilac #D28EFF (single restrained accent), Clay, Salmon #FF978B;
  Overworld-style black entry, glowing sigil/orbit ring, huge display type
  (clamp 52–104px), fine fixed grid, glass cards (24/32px radii), fade-up
  motion, lilac-gradient buttons. New classes: .real-badge, .sim-badge,
  .offline-banner, .status-pill/.status-dot, .crp-strip.
- `frontend/src/main.jsx` — per-page integration audit fixes (see below).
- `frontend/src/charts.jsx` — HBar gains a `suffix` prop ("pts" for penalties).
- `README.md` — deploy note corrected: Render build runs `python backend/seed.py`
  (the DB file is binary and is NOT pushed to GitHub; the build rebuilds it).

## Integration audit — per page
- Landing: hero counts (252/9/4) now from `GET /api/v1/labs/summary`, not typed in.
- Dashboard: lab-rows KPI from `/health/deps`; NEW real CRP evidence strip
  (per-crew CRP + falls) from `/labs/summary`; offline snapshot is now a
  visible OFFLINE banner. Verified Sol 147: all 4 crew GOOD/EXCELLENT, so
  "whole crew is back in the green" is true.
- Crew Board: API-backed; daily vitals now carry a "Scenario · simulated" tag.
- Astronaut Detail: biomarker table was already API-backed (real OSD-575);
  trend chart now carries a scenario label + anchor note tying the Sol 144
  dip to the real R+1 lab crash (C002-specific wording only on C002's page).
- Mission Replay: NEW real-lab anchor card from `/labs/summary`; frames
  labelled scenario/simmulated.
- Recovery: hardcoded lowest-CRI values REMOVED — lowest now from
  `/mission/summary` min_cri per crew (verified same values: C002 47.9, C001
  77.2, C003 74.8, C004 75.2). Recovery plans stay as plan text (not data).
- CRI Drivers: illustrative HBar values (100/70/50/…) REMOVED — bars now show
  the worst crew member's real API penalties in points; per-crew text now
  uses each crew's real top driver from `/api/v1/crew/{id}`.
- Alerts: API-backed; NEW real-lab evidence banner from `/labs/summary`
  (C002 8/9 falls + all four CRP changes).
- Daily Check-in: user input only; CRI computed in-browser with the same
  published formula; stored in browser only. No backend data invented.
- Live Monitor: heart rate now starts from C002's last stored value from
  the API (not a typed-in 68); SpO2 now from the API too. Still labelled
  simulated, as before.
- Copilot: cached human-written answers (declared); Sol 144 answer now
  labels the 1.32 mGy dose as a simulated scenario value, not real RAD data.
- Data & Method: documentation page; numbers are the verified real ones.

## Verification (this rework, commands + outputs)
- `cd backend && .venv/bin/python -m pytest test_app.py -q` → **11 passed** (1 warning, same harmless starlette DeprecationWarning).
- `python seed.py` → `{'biomarkers': 252, 'daily': 32}`; uvicorn on :8000.
- `GET /api/v1/labs/summary` → counts {biomarkers 252, samples 28, analytes 9, crew 4}; CRP C001 +107.3, C002 −22.2, C003 +95.2, C004 +28.8; C002 falls 8/9.
- Every endpoint curled for all 4 crew: vitals, cri, trend, biomarkers, alerts + detail → **all 200**; replay, summary, radiation, labs/summary, crew, health, health/deps → **all 200**; unknown crew → **404**.
- Sol 147 CRI from the live API: C001 ASTRA 99.0 EXCELLENT, C002 ORBIT 79.8 GOOD, C003 NOVA 96.3 EXCELLENT, C004 ATLAS 96.5 EXCELLENT. Summary mins: C001 77.2, C002 47.9, C003 74.8, C004 75.2; total_alerts 5.
- `cd frontend && npm run build` → success, 32 modules, CSS 9.01 kB, JS 189.24 kB (58.94 kB gzip). Built bundle verified to contain `labs/summary`, the OFFLINE banner text, and the new badge classes.
- `npm run dev` (port 5173) → `GET /` 200; the Vite proxy forwards `/api/v1/health` to the real backend → `{"status":"ok","db":true}`; `/api/v1/labs/summary` through the proxy returns the real CRP numbers above. So the frontend talks to the real backend, not the snapshot.

## Still not verified live (needs Hadi)
- Render + Vercel deployment (no accounts/credentials available in this session).
- Full click-through in a real browser / on his phone (build + dev-server + API checks passed; visual phone check still to do by Hadi).

---

# FIX — 2026-11-15 ~11:35 PKT: blank Alerts page + "CRI is stuck" + Cyera scroll animation

Hadi's report: `localhost:5173/#/alerts` rendered COMPLETELY BLANK (only the
purple grid, no header/nav), and CRI felt stuck everywhere. Plus the
animation ask, pinned to the exact reference: http://secure-the-unknown.cyera.com/
— scroll-triggered animation, smooth, no lag.

## Cause 1 (blank Alerts page) — a misplaced `.catch()` — CONFIRMED by a real DOM render
`AlertsPage` had:
`Promise.all(data.crew.map(c => api(...).then(...)).catch(() => []))`
The `.catch()` sat on the ARRAY returned by `.map()`, not on the promise —
`Array.prototype.catch` does not exist — so the moment the crew API returned,
the effect threw `TypeError: data.crew.map(...).catch is not a function` and
React unmounted the whole app (header and nav included). That is exactly the
screenshot: purple grid, nothing else.
Fix: the effect was rewritten with async/await so the grouping cannot be
misread; `(a.actions || [])` and a colour fallback were also added to the
alert render. The parent agent's first theory (an unguarded
`labs.data.per_crew.C002` at line 458) was CHECKED and is WRONG: line 456
already guards it with `labs.data &&`, and the live `/labs/summary` returns
all four crews with CRP objects. The `.catch()` was the crash.
Fix 2 (defence in depth): a React `ErrorBoundary` now wraps the route switch
— one bad page can never blank the whole app again; the header/nav stay and
the user gets a plain error message + a way home.

## Cause 2 ("CRI is stuck") — CRI never moved, and never looked like it moved
- Every page fetched once on mount and never re-fetched. Fixed: `useApi`
  now supports polling (`pollMs: 30000` on Dashboard/Crew/Detail) and a
  manual `refresh()`; every fetch shows "Updated HH:MM:SS" + a
  ↻ Refresh data button, so a stuck state is visible and fixable. The header
  status pill re-checks `/health/deps` every 15 s (LIVE flips to OFFLINE and
  back on its own).
- The gauge and every big number snapped instantly to the new value with no
  motion. Fixed: new `useCountUp`/`AnimatedNumber` (requestAnimationFrame
  tween, ~650 ms ease-out) on the Gauge arc + number and on all CRI/KPI
  numbers; HBar fills now grow via `transform: scaleX` (compositor-only).
- Live Monitor faked movement with `Math.random()` and showed no CRI at all.
  Fixed: it now steps through C002's 8 stored Sols from
  `/api/v1/crew/C002/trend`, one every 2 s, looping — every value is a stored
  API row (HR, HRV, SpO2, CRI, sleep, radiation), no random numbers.
- Replay slider was wired but its numbers changed with no visible motion.
  Fixed: animated frame numbers + a big "ORBIT · C002 — CRI on Sol X" focus
  readout + touch-friendly ‹ Prev / Next › Sol buttons (slider pauses play).
- Check-in sliders did recompute CRI, but the gauge gave no feedback.
  Fixed: the gauge now counts up on every slider move, and a live line names
  the biggest drag ("Biggest drag right now: Sleep −18.0 pts — move that
  slider and watch CRI climb").

## Animation — Cyera scroll feel, smooth, no lag (performance is the requirement)
Studied first: overworldaudio.com (black entry gate, glowing concentric-ring
sigil, huge staggered type, cinematic calm) and secure-the-unknown.cyera.com
via mesh3d/Threads walkthroughs (WebGL purple world, capsule drifting
through scenes as you scroll, "Begin Your Mission"). Replicated the FEEL with
our own hand-written CSS/JS — no copied code, assets or brand marks:
- Scroll reveal via ONE IntersectionObserver (threshold 0.08, rootMargin
  `0px 0px 60px 0px` so elements reveal just before they scroll in — feels
  instant on touch scroll); staggered card grids; hero entrance in staggered
  lines; marquee strip; page-transition fade on every navigation.
- Perf rules enforced (see the audit below): transform/opacity-only
  animation — the old `.reveal` blur, `backdrop-filter` on the sticky topbar
  and cards, `background-attachment:fixed` on the body, and the
  background-position gradient shimmer were ALL REMOVED (each repaints every
  scroll frame on phones). The glow orbs now get their soft edge from a
  radial gradient instead of `filter:blur(46px)`, so drifting them is
  transform-only. Zero scroll listeners in the code (only the observer).
- Phone-first: bigger range thumbs (28 px), no hover-only behaviour
  (hover lifts are inside `@media (hover:hover)`), `prefers-reduced-motion`
  disables all motion.

## Verification — DOM render harness (jsdom + real Vite dev proxy + real backend)
Harness: `/tmp/om2-test/harness.cjs` + `interact.cjs` (bundles `src/main.jsx`
with esbuild, mounts it in a real DOM, fetches through the Vite dev server
on :5173, which proxies `/api` to the live uvicorn backend on :8000).
- BEFORE the fix, the harness reproduced the crash exactly:
  `TypeError: data.crew.map(...).catch is not a function` → process died,
  root unmounted (the blank page).
- AFTER the fix — `#/alerts`: root renders (6,244 chars), topbar + LIVE pill
  present, lab banner present, all 5 alerts present (CRP up, immune markers
  fell, Sleep only), ERRORS []. `#/dashboard`: CRP strip + "Updated
  HH:MM:SS" + Refresh button, ERRORS []. `#/crew/C002`: real lab table,
  ERRORS [].
- Replay interaction — set the slider to 144 in the DOM: CRI **47.9** shows,
  "Sol 144" shows, ERRORS [].
- Check-in interaction — dragged the sleep slider to 4 h: CRI **98.3 → 80.3**,
  "Biggest drag right now: Sleep −18.0 pts" shows, ERRORS [].
- Live interaction — waited 5 s: tick **3**, now showing **Sol 143** (stepped
  140 → 141 → 142 → 143), CRI label present, ERRORS [].
- C002 CRI per Sol, re-verified live from `/api/v1/crew/C002/trend`:
  140 → 79.8, 141 → 73.4, 142 → 61.7, 143 → 61.7, 144 → 47.9,
  145 → 73.4, 146 → 79.8, 147 → 79.8. `/crew/C002/cri`:
  cri 79.8, recomputed 79.8, `formula_matches_stored: true`.
- Perf audit — `/tmp/om2-test/perf-audit.cjs` (pure Node, no deps):
  **ALL PERF CHECKS PASSED** — 13/13 keyframes transform/opacity only
  (drawLine is stroke-dashoffset, one-shot), all infinite animations
  transform/opacity only, 0 filter:blur, 0 backdrop-filter,
  0 background-attachment:fixed, 0 scroll listeners, 2 IntersectionObserver
  references, no layout/paint properties inside keyframes.
- `cd backend && .venv/bin/python -m pytest test_app.py -q` → **11 passed**.
- `cd frontend && npm run build` → success, CSS 13.44 kB, JS 197.44 kB
  (61.18 kB gzip). Still light: no new dependencies.
- `frontend/public/snapshot.json` regenerated from the live API (31 keys) —
  now includes the previously missing `/api/v1/labs/summary` and
  `/api/v1/health/deps`, so the labelled offline snapshot works on every page.

## Still not verified live (needs Hadi)
- Real-browser/phone tap-through + scroll feel on his phone (jsdom tests
  prove the render, the interactions and the perf structure; the feel of the
  scroll on a real phone is the last check).
- Render + Vercel deployment (no accounts in this session).

## Motion round 2 — UNMISSABLE motion, 2026-11-15 ~11:50 PKT

Why: Hadi said the site "is still the same, it didn't even change" — the
motion from the last round existed in code but was too subtle to see
(22px rises, a 90s orbit spin, marquee below the fold), and his running
dev server can also show stale files. This round makes motion impossible
to miss on first load, with no scrolling needed.

First load (Landing, no scrolling needed):
- Headline lines slide up out of masks one by one (`.hero-line`,
  `heroLineUp`, 1.05s each, delays .05/.22/.4s) — the whole first paint
  finishes moving in ~1.5s.
- Big glowing orbit sigil: 3 rings spinning at visibly different speeds
  (22s / 32s / 46s) with glowing dots riding the rings + pulsing core +
  gentle bob. The old 90s ring was replaced — you can SEE this one turn.
- Gradient headline shimmers lilac ↔ teal (two layers cross-fading by
  opacity only — no background-position repainting).
- Hero stats count up from 0 (252 labs, 9 analytes, 4 crew).
- Marquee strip faster (22s) and larger; LIVE pill has an expanding
  pulse ring around it.

On scroll (Cyera-style):
- Reveals now rise 52px + scale .965 → 1, 0.9s, staggered grids
  (was 22px / 0.7s — nearly invisible). One IntersectionObserver.
- New scroll-progress hairline at the very top (lilac→teal), driven by a
  CSS scroll-timeline — no JS scroll listener at all.
- Section headers on the Dashboard slide in via Reveal.

Dashboard motion proof:
- Worst-crew CRI gauge sweeps up from zero on every load and again on
  every Refresh (keyed remount); KPI numbers count up from zero on load.
- Replay: slider animates the big CRI number (900ms tween).

Render verification — new harness `/tmp/om2-test/motion.cjs` (jsdom + real
Vite dev proxy + real backend), with a controllable IntersectionObserver
mock and the real stylesheet injected so computed styles resolve:
- `#/home`: 3 hero lines, animation `computed:heroLineUp`; sigil 3 rings /
  3 dots / 1 core, `computed:sigilSpin`, `sigilSpinRev`, `pulseCore`;
  gradient layers a+b, `computed:gradFade`; marquee `computed:marquee`;
  LIVE pill `status-pill live-pulse`, text "LIVE · 252 LABS · 32 DAILY";
  hero stats reach 252 / 9 / 4; reveals 0 `.in` before scroll, 2 `.in`
  after the observer fires; ERRORS [].
- `#/dashboard`: LIVE pill, gauge SVG present, KPI lowest CRI present,
  reveals 0 before scroll → 6 after; ERRORS [].
- `#/replay`: slider to 144 → CRI **47.9** + "Sol 144"; ERRORS [].
- `#/checkin`: sleep slider to 4h → CRI **80.3**, "Biggest drag right
  now: Sleep −18.0 pts"; ERRORS [].
- `#/live`: after 5s tick **3**, showing **Sol 143**; ERRORS [].
- `#/alerts`: lab banner + all 3 alert titles; ERRORS [].
- Perf audit `/tmp/om2-test/perf-audit.cjs`: **ALL PERF CHECKS PASSED** —
  17/17 keyframes transform/opacity only, infinite animations all
  transform/opacity only, 0 filter:blur, 0 backdrop-filter, 0
  background-attachment:fixed, 0 scroll listeners.
- NOTE on the harness itself: the first bundle build used a bad esbuild
  `--define` (CLI quoting made BASE the literal characters `""`, so every
  API fetch hit the SPA fallback and returned HTML). Fixed with
  `/tmp/om2-test/build-bundle.cjs` (JS API define, verified
  `var BASE = "";` in the bundle) — the app code was never at fault.
  The old harness's `HAS_CREW ['ORBIT']` line was a false positive
  ("ORBIT" is in the topbar logo); the motion harness checks real data.
- `cd backend && .venv/bin/python -m pytest test_app.py -q` → **11 passed**.
- `cd frontend && npm run build` → success, CSS 15.12 kB, JS 198.69 kB
  (61.49 kB gzip). No new dependencies.

Still not verified live (needs Hadi): real-browser/phone look at the hero
and the scroll — the jsdom harness proves the animations are attached and
running, but the feel on his phone is the last check. To SEE the new
motion he MUST: `git pull`, STOP the running frontend dev server,
`npm run dev` again, Ctrl+F5 hard refresh — a running dev server keeps
serving the old files until it is restarted.
