# RUN.md — exact commands

## Local (5 minutes)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app:app --port 8000
# new terminal:
cd frontend
npm install
npm run dev
# open http://localhost:5173
```

## Tests

```bash
cd backend && source .venv/bin/activate && python -m pytest test_app.py -q
cd frontend && npm run build
```

## Rebuild the database (deterministic, from CSVs)

```bash
cd backend && source .venv/bin/activate && python seed.py
# -> data/orbit_mafia.db (252 biomarkers, 32 daily rows)
```

## Deploy

1. **Render (backend first):** create a Web Service from this repo. `render.yaml`
   is included. No env vars to set by hand (DB_PATH is in render.yaml).
2. **Vercel (frontend second):** import the repo, Root Directory `frontend`,
   env var `VITE_API_BASE_URL` = your Render URL, e.g.
   `https://orbit-mafia-2.onrender.com`. Deploy. No other env vars.
3. Check: open the Vercel URL, Dashboard loads, no error banner. Then
   `https://<render-url>/api/v1/health` returns `{"status":"ok"}`.
