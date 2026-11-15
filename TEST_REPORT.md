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

## Not yet verified live (needs Hadi)

- Render + Vercel deployment (no accounts/credentials available in this session).
- Full click-through in a real browser (build + preview HTTP checks passed; visual check on phone still to do by Hadi).
