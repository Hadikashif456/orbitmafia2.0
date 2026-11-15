"""Orbit Mafia 2.0 — FastAPI backend.

Serves real NASA OSD-575 biomarker data (252 rows) + labelled-synthetic
daily vitals (Sol 140-147, 4 crew) from a committed SQLite database.
No external services, no API keys. If the DB file is missing the server
fails loudly at startup — it never silently serves fake data.
"""
import os
import sqlite3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from alerts import build_alerts
from cri import compute_cri, cri_band, cri_drivers

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DB_PATH = os.environ.get("DB_PATH", os.path.join(ROOT, "data", "orbit_mafia.db"))

CREW = {
    "C001": {"id": "C001", "name": "Crew C001", "callsign": "ASTRA", "role": "Commander",
             "age": 44, "color": "#2dd4bf", "notes": "Highest CRP surge after landing (+107.3%). Steady recovery."},
    "C002": {"id": "C002", "name": "Crew C002", "callsign": "ORBIT", "role": "Crew Medical Officer",
             "age": 49, "color": "#f59e0b", "notes": "Lowest CRI in the crew. 8 of 9 immune markers fell over 50% at R+1. Needs the most support."},
    "C003": {"id": "C003", "name": "Crew C003", "callsign": "NOVA", "role": "Mission Specialist",
             "age": 36, "color": "#f472b6", "notes": "CRP up 95.2% at R+1. Sleep is the main drag on CRI."},
    "C004": {"id": "C004", "name": "Crew C004", "callsign": "ATLAS", "role": "Pilot / Flight Engineer",
             "age": 41, "color": "#a78bfa", "notes": "Most stable recovery. Smallest CRP rise (+28.8%)."},
}

MISSION_EVENTS = [
    {"sol": 140, "title": "Baseline day", "detail": "All four crew in the green. CRI 80-99."},
    {"sol": 141, "title": "Sleep deficit begins", "detail": "C002 sleeps under 6h. HRV starts to fall across the crew."},
    {"sol": 142, "title": "CRI low point", "detail": "C002 CRI falls to 61.7. Recovery plan starts."},
    {"sol": 143, "title": "Contingency EVA", "detail": "C003 + C004 outside for 3h 20m. SpO2 and heart rate watched live."},
    {"sol": 144, "title": "Solar particle event", "detail": "Radiation dose jumps to 1.32 mGy. Crew shelters in the shielded area. All-clear after 9 hours."},
    {"sol": 145, "title": "Recovery day 1", "detail": "Sleep protected, exercise cut. CRI climbs back for every crew member."},
    {"sol": 146, "title": "Recovery day 2", "detail": "HRV recovering. C002 back to 79.8."},
    {"sol": 147, "title": "Back to green", "detail": "Whole crew GOOD or better. Mission summary ready for Ground."},
]

app = FastAPI(title="Orbit Mafia 2.0 API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def db():
    if not os.path.exists(DB_PATH):
        raise HTTPException(503, f"Database not found at {DB_PATH}. Run: python backend/seed.py")
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def _daily_row(row):
    d = dict(row)
    return d


def biomarker_changes(crew_id: str) -> list:
    con = db()
    rows = con.execute(
        "SELECT analyte, unit, timepoint, value FROM biomarkers WHERE crew_id=? AND timepoint IN ('L-3','R+1')",
        (crew_id,)).fetchall()
    con.close()
    by_an = {}
    for r in rows:
        by_an.setdefault(r["analyte"], {})[r["timepoint"]] = (r["value"], r["unit"])
    out = []
    for analyte, vals in by_an.items():
        if "L-3" in vals and "R+1" in vals:
            l3, unit = vals["L-3"]
            r1, _ = vals["R+1"]
            out.append({"analyte": analyte, "unit": unit, "l3_value": l3, "r1_value": r1,
                        "pct_change": round((r1 / l3 - 1) * 100, 1) if l3 else None})
    return sorted(out, key=lambda x: x["analyte"])


@app.get("/api/v1/health")
def health():
    ok = os.path.exists(DB_PATH)
    return {"status": "ok" if ok else "degraded", "service": "orbit-mafia-2.0", "version": "2.0.0", "db": ok}


@app.get("/api/v1/health/deps")
def health_deps():
    con = db()
    counts = {"biomarkers": con.execute("SELECT COUNT(*) c FROM biomarkers").fetchone()["c"],
              "daily": con.execute("SELECT COUNT(*) c FROM daily").fetchone()["c"]}
    con.close()
    return {"db": True, "db_path": DB_PATH, "counts": counts, "groq_key_present": False,
            "copilot": "cached-offline-answers (no API key, no live AI claim)"}


@app.get("/api/v1/crew")
def crew_list():
    con = db()
    out = []
    for cid, meta in CREW.items():
        latest = con.execute("SELECT * FROM daily WHERE crew_id=? ORDER BY sol DESC LIMIT 1", (cid,)).fetchone()
        d = _daily_row(latest) if latest else None
        out.append({**meta, "latest_sol": d["sol"] if d else None,
                    "cri": d["cri"] if d else None, "cri_band": cri_band(d["cri"]) if d else None,
                    "latest": d})
    con.close()
    return {"crew": out, "mission": "Mars Transit — Sol 140-147", "data_note": "Daily vitals are labelled synthetic; biomarkers are real OSD-575."}


@app.get("/api/v1/crew/{crew_id}")
def crew_one(crew_id: str):
    if crew_id not in CREW:
        raise HTTPException(404, "Unknown crew id")
    con = db()
    latest = con.execute("SELECT * FROM daily WHERE crew_id=? ORDER BY sol DESC LIMIT 1", (crew_id,)).fetchone()
    con.close()
    d = _daily_row(latest)
    return {**CREW[crew_id], "latest": d, "cri": d["cri"], "cri_band": cri_band(d["cri"]),
            "drivers": cri_drivers(d), "biomarker_changes": biomarker_changes(crew_id),
            "alerts": build_alerts(crew_id, d, biomarker_changes(crew_id))}


@app.get("/api/v1/crew/{crew_id}/vitals")
def vitals(crew_id: str):
    if crew_id not in CREW:
        raise HTTPException(404, "Unknown crew id")
    con = db()
    rows = con.execute("SELECT * FROM daily WHERE crew_id=? ORDER BY sol", (crew_id,)).fetchall()
    con.close()
    return {"crew_id": crew_id, "source": "synthetic daily vitals (labelled)", "vitals": [_daily_row(r) for r in rows]}


@app.get("/api/v1/crew/{crew_id}/cri")
def cri_endpoint(crew_id: str):
    if crew_id not in CREW:
        raise HTTPException(404, "Unknown crew id")
    con = db()
    rows = con.execute("SELECT sol, cri FROM daily WHERE crew_id=? ORDER BY sol", (crew_id,)).fetchall()
    latest = con.execute("SELECT * FROM daily WHERE crew_id=? ORDER BY sol DESC LIMIT 1", (crew_id,)).fetchone()
    con.close()
    d = _daily_row(latest)
    # Recompute CRI from the raw vitals to prove the stored value matches the formula
    recomputed = compute_cri(d)
    return {"crew_id": crew_id, "formula": "100 minus sleep/HRV/HR/SpO2/mood/reaction/temp penalties (see README, CRI section)",
            "cri": d["cri"], "recomputed_cri": recomputed, "formula_matches_stored": recomputed == d["cri"],
            "band": cri_band(d["cri"]), "drivers": cri_drivers(d),
            "series": [{"sol": r["sol"], "cri": r["cri"]} for r in rows]}


@app.get("/api/v1/crew/{crew_id}/trend")
def trend(crew_id: str):
    if crew_id not in CREW:
        raise HTTPException(404, "Unknown crew id")
    con = db()
    rows = con.execute("SELECT * FROM daily WHERE crew_id=? ORDER BY sol", (crew_id,)).fetchall()
    con.close()
    return {"crew_id": crew_id, "source": "synthetic daily vitals (labelled)",
            "trend": [_daily_row(r) for r in rows]}


@app.get("/api/v1/crew/{crew_id}/biomarkers")
def biomarkers(crew_id: str):
    if crew_id not in CREW:
        raise HTTPException(404, "Unknown crew id")
    con = db()
    rows = con.execute("SELECT * FROM biomarkers WHERE crew_id=? ORDER BY timepoint, analyte", (crew_id,)).fetchall()
    con.close()
    return {"crew_id": crew_id, "source": "NASA Open Science Data Repository, OSD-575, Version 3, HDCVD9 panel (real data)",
            "rows": len(rows), "changes_l3_to_r1": biomarker_changes(crew_id),
            "samples": [dict(r) for r in rows]}


@app.get("/api/v1/crew/{crew_id}/alerts")
def alerts_endpoint(crew_id: str):
    if crew_id not in CREW:
        raise HTTPException(404, "Unknown crew id")
    con = db()
    latest = con.execute("SELECT * FROM daily WHERE crew_id=? ORDER BY sol DESC LIMIT 1", (crew_id,)).fetchone()
    con.close()
    d = _daily_row(latest)
    changes = biomarker_changes(crew_id)
    return {"crew_id": crew_id, "alerts": build_alerts(crew_id, d, changes)}


@app.get("/api/v1/mission/replay")
def replay():
    con = db()
    rows = con.execute("SELECT * FROM daily ORDER BY sol, crew_id").fetchall()
    con.close()
    by_sol = {}
    for r in rows:
        by_sol.setdefault(r["sol"], []).append(_daily_row(r))
    return {"mission": "Mars Transit", "sols": sorted(by_sol),
            "events": MISSION_EVENTS,
            "frames": [{"sol": s, "crew": by_sol[s]} for s in sorted(by_sol)]}


@app.get("/api/v1/mission/summary")
def summary():
    con = db()
    rows = con.execute("SELECT crew_id, MIN(cri) min_cri, MAX(cri) max_cri, AVG(cri) avg_cri FROM daily GROUP BY crew_id").fetchall()
    total_alerts = 0
    out = []
    for r in rows:
        cid = r["crew_id"]
        latest = con.execute("SELECT * FROM daily WHERE crew_id=? ORDER BY sol DESC LIMIT 1", (cid,)).fetchone()
        d = _daily_row(latest)
        al = build_alerts(cid, d, biomarker_changes(cid))
        total_alerts += len(al)
        out.append({"crew_id": cid, "min_cri": r["min_cri"], "max_cri": r["max_cri"],
                    "avg_cri": round(r["avg_cri"], 1), "latest_cri": d["cri"], "alerts": len(al)})
    con.close()
    return {"mission": "Mars Transit — Sol 140-147", "crew": out, "total_alerts": total_alerts,
            "events": MISSION_EVENTS,
            "data": {"biomarkers": "Real NASA OSD-575 (252 rows, 9 analytes x 28 samples)",
                     "daily_vitals": "Synthetic, labelled (32 rows, Sol 140-147 x 4 crew)"}}


@app.get("/api/v1/labs/summary")
def labs_summary():
    """Real NASA OSD-575 lab evidence in one call.

    Per crew: the verified CRP change L-3 -> R+1 and how many of the 9
    immune markers fell over 50% at R+1. Counts come from the database,
    so the frontend never hardcodes them.
    """
    con = db()
    totals = {"biomarkers": con.execute("SELECT COUNT(*) c FROM biomarkers").fetchone()["c"],
              "samples": con.execute("SELECT COUNT(DISTINCT sample_id) c FROM biomarkers").fetchone()["c"],
              "analytes": con.execute("SELECT COUNT(DISTINCT analyte) c FROM biomarkers").fetchone()["c"],
              "crew": con.execute("SELECT COUNT(DISTINCT crew_id) c FROM biomarkers").fetchone()["c"]}
    con.close()
    per_crew = {}
    for cid in CREW:
        changes = biomarker_changes(cid)
        crp = next((c for c in changes if c["analyte"] == "CRP"), None)
        falls = [c for c in changes if c["pct_change"] is not None and c["pct_change"] <= -50]
        per_crew[cid] = {"crp": crp, "markers_fell_over_50pct": len(falls),
                         "total_markers": len(changes)}
    return {"source": "NASA Open Science Data Repository, OSD-575, Version 3, HDCVD9 panel (real data)",
            "counts": totals, "per_crew": per_crew}


@app.get("/api/v1/radiation")
def radiation():
    con = db()
    rows = con.execute("SELECT sol, crew_id, radiation_mgy FROM daily ORDER BY sol, crew_id").fetchall()
    con.close()
    return {"source": "Synthetic daily dose, labelled. Pattern only — not real RAD data.",
            "note": "Vitalis uses real Curiosity RAD data; Orbit Mafia 2.0 does not claim real radiation values and says so here.",
            "series": [dict(r) for r in rows]}
