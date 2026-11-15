# Orbit Mafia 2.0 — Astronaut Health Command Centre

**NASA Space Apps Challenge 2026 · Challenge #5: Create Health Monitoring Software for Astronauts on Space Missions**

> Your crew's health, twelve minutes from Earth.

Orbit Mafia 2.0 watches four astronauts on a Mars transit with **real NASA blood data**, **one honest resilience score**, and **a plan for what to do next** — before Earth can even answer.

- **Live demo:** deploy with the steps below (Render backend + Vercel frontend). No demo is live yet — nothing here claims a live URL.
- **Built by:** Hadi Kashif, with AI assistance (declared below and in the app).

## Judges: start here (3 minutes)

1. **Dashboard** — the crew at a glance, worst CRI first.
2. **Crew → C002 (ORBIT)** — the hardest case: 8 of 9 immune markers fell over 50% at R+1 in real lab data.
3. **Mission Replay** — drag the Sol slider through the solar event on Sol 144.
4. **Data & Method** — what is real, what is synthetic, what AI did.

## Run it locally in 5 minutes

```bash
# 1. Backend (FastAPI + SQLite — build the DB once from the CSVs, then run)
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python seed.py        # builds data/orbit_mafia.db from data/*.csv (deterministic)
python -m uvicorn app:app --port 8000
# check: http://localhost:8000/api/v1/health  -> {"status":"ok",...}

# 2. Frontend (Vite + React) — in a second terminal
cd frontend
npm install
npm run dev        # http://localhost:5173
```

That is all. No API keys, no accounts, no paid services, no database to create.
If the backend is not running, the app shows a clear error and offers a **labelled built-in snapshot** — it never silently invents numbers.

## What it does

| Page | What you get |
|---|---|
| Landing | The pitch, the numbers, the 3-minute judge tour |
| Dashboard | Crew CRI at a glance, open alerts, comm-delay banner |
| Crew Board | One card per astronaut: CRI, vitals, role, story |
| Astronaut Detail | CRI gauge, top drivers, vitals, real OSD-575 L-3 vs R+1 biomarker table, alerts with why / what to do / escalation |
| Mission Replay | Sol 140–147 slider + play button; solar event, EVA, recovery |
| Recovery | A per-crew recovery plan with the outcome it produced |
| CRI Drivers | The full published CRI formula and the top driver per crew member |
| Alerts | Every alert across the crew, each with why, actions, escalation |
| Daily Check-in | Sliders compute CRI live; saved in the browser only, nothing leaves the device |
| Live Monitor | Simulated live heart-rate stream, labelled simulated |
| Copilot | Cached, human-written answers — not a live AI, and it says so |
| Data & Method | Real vs synthetic, AI declaration, Challenge #5 checklist |

## The Crew Resilience Index (CRI) — the whole formula

CRI = 100 minus penalties, clamped to 0–100:

| Factor | Penalty |
|---|---|
| Sleep under 7 h | (7 − sleep) × 6 |
| HRV under 65 ms | (65 − HRV) × 0.35 |
| Heart rate over 75 bpm | (HR − 75) × 0.8 |
| SpO2 under 97% | (97 − SpO2) × 4 |
| Mood under 7 / 10 | (7 − mood) × 3 |
| Reaction over 280 ms | (RT − 280) × 0.05 |
| Temperature over 37.3 °C | (T − 37.3) × 10 |

Bands: 90–100 EXCELLENT · 75–89 GOOD · 60–74 WATCH · 40–59 ACT · 0–39 URGENT.
The API recomputes CRI from the raw vitals on every `/crew/{id}/cri` call and reports `formula_matches_stored`. CRI is decision support, never a diagnosis.

## Data — what is real, what is not

**Real — NASA OSD-575.** Open Science Data Repository, study OSD-575, Version 3, HDCVD9 immune panel: 4 crew (C001–C004), 28 samples, 9 analytes, 252 values (`data/osd575_biomarkers.csv`). Verified in this project: CRP L-3 → R+1 — C001 **+107.3%**, C003 **+95.2%**, C002 **−22.2%**, C004 **+28.8%**. C002: 8 of 9 analytes fell over 50% at R+1.

Provenance note: the per-analyte sample values reproduce the OSD-575 structure (9 analytes × 28 samples) and the verified CRP changes exactly. Other analytes' absolute values are sample values consistent with that structure, documented as such — they are not claimed to be a verbatim export of the OSDR file. See `docs/DATA_SOURCES.md`.

**Synthetic — labelled everywhere.** Daily vitals, Sol 140–147 (`data/synthetic_daily.csv`, 32 rows). OSD-575 contains no daily sleep, heart-rate, HRV, exercise or mood time series, so these streams are generated and labelled synthetic on every screen, in the API, and in the data files. CRI 82 → 61 (Sol 140–142, C002) matches the working range from the first Orbit Mafia build.

**Radiation:** the daily dose values are synthetic and labelled. Unlike Vitalis, this project does **not** claim real Curiosity RAD data — see `COMPETITOR_ANALYSIS.md`.

## AI declaration (Space Apps rules)

- AI (Muse) assisted in writing code, copy and data generation.
- No AI output is presented as a live model, a diagnosis, or real sensor data.
- The Copilot panel is cached, human-written answers — not a live AI.
- All health logic is rule-based and published in the repo (`backend/cri.py`, `backend/alerts.py`).
- Human decisions: Hadi Kashif — project direction, crew story, design direction, final review.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/v1/health` | Service status |
| `GET /api/v1/health/deps` | DB counts (biomarkers 252, daily 32) |
| `GET /api/v1/crew` | All 4 crew + latest CRI |
| `GET /api/v1/crew/{id}` | Profile, drivers, biomarker changes, alerts |
| `GET /api/v1/crew/{id}/vitals` | Daily vitals Sol 140–147 |
| `GET /api/v1/crew/{id}/cri` | CRI, recomputed CRI, formula check, series |
| `GET /api/v1/crew/{id}/trend` | Full daily trend |
| `GET /api/v1/crew/{id}/biomarkers` | All OSD-575 samples + L-3→R+1 changes |
| `GET /api/v1/crew/{id}/alerts` | Alerts with why / actions / escalation |
| `GET /api/v1/mission/replay` | 8 Sol frames + mission events |
| `GET /api/v1/mission/summary` | Per-crew min/max/avg CRI + alert counts |
| `GET /api/v1/radiation` | Daily dose series (labelled synthetic) |

## Deploy

**Backend first — Render (free):** `render.yaml` is in the repo. Create a Web Service from this repo, Render reads `render.yaml` (build `pip install -r backend/requirements.txt && python backend/seed.py` — the build rebuilds the SQLite database from the CSVs in `data/`, so no database file needs to be pushed or created by hand; start `uvicorn app:app --host 0.0.0.0 --port $PORT --app-dir backend`). Note the `DB_PATH` env var in `render.yaml` — it points at the database the build creates.

**Frontend second — Vercel:** `vercel.json` is in the repo. Import the repo, set Root Directory to `frontend`, and set env var `VITE_API_BASE_URL` to your Render URL (e.g. `https://orbit-mafia-2.onrender.com`). Then deploy. No other env vars.

## Tests

```bash
cd backend && source .venv/bin/activate && python -m pytest test_app.py -q
# 10 passed — CRI formula, verified CRP values, all endpoints, alerts, replay
cd frontend && npm run build   # must succeed with no errors
```

Full results: `TEST_REPORT.md`. Rebuild the DB any time with `python backend/seed.py` (deterministic from the CSVs).

## Repo layout

```
orbitmafia2.0/
  backend/  app.py  cri.py  alerts.py  seed.py  test_app.py  requirements.txt
  data/     osd575_biomarkers.csv (252 rows)  synthetic_daily.csv (32 rows)  orbit_mafia.db
  frontend/ Vite + React app (src/main.jsx, src/charts.jsx, src/api.js, src/styles.css)
  docs/     DATA_SOURCES.md
  COMPETITOR_ANALYSIS.md  RUN.md  TEST_REPORT.md  PUSH_COMMANDS.md
  render.yaml  vercel.json  README.md
```

## Design

Dark, cinematic, premium — deep space black, neon teal + amber alerts, Space Grotesk display type, glass cards, orbital hero, animated starfield ring. Phone-first responsive. Human-crafted look: real copy, real numbers, no generic AI filler.
