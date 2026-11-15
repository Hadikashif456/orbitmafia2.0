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

## Not yet verified live (needs Hadi)

- Render + Vercel deployment (no accounts/credentials available in this session).
- Full click-through in a real browser (build + preview HTTP checks passed; visual check on phone still to do by Hadi).
