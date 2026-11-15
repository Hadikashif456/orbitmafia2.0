"""Seed the SQLite database from the CSVs in ../data/ (deterministic rebuild).

Run:  python seed.py        (writes ../data/orbit_mafia.db)
The .db file is committed to the repo so the app works with zero setup.
"""
import csv
import os
import sqlite3

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
DB_PATH = os.environ.get("DB_PATH", os.path.join(DATA, "orbit_mafia.db"))


def build(db_path: str = DB_PATH) -> dict:
    if os.path.exists(db_path):
        os.remove(db_path)
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    cur.execute("""CREATE TABLE biomarkers (
        id INTEGER PRIMARY KEY AUTOINCREMENT, crew_id TEXT, timepoint TEXT,
        analyte TEXT, unit TEXT, value REAL, sample_id TEXT)""")
    cur.execute("""CREATE TABLE daily (
        id INTEGER PRIMARY KEY AUTOINCREMENT, crew_id TEXT, sol INTEGER,
        heart_rate REAL, hrv_ms REAL, spo2 REAL, sleep_hours REAL, mood INTEGER,
        reaction_ms REAL, temp_c REAL, systolic REAL, diastolic REAL,
        radiation_mgy REAL, exercise_min REAL, body_mass_kg REAL, cri REAL)""")
    with open(os.path.join(DATA, "osd575_biomarkers.csv"), newline="") as fh:
        rows = list(csv.DictReader(fh))
    cur.executemany(
        "INSERT INTO biomarkers (crew_id,timepoint,analyte,unit,value,sample_id) VALUES (?,?,?,?,?,?)",
        [(r["crew_id"], r["timepoint"], r["analyte"], r["unit"], float(r["value"]), r["sample_id"]) for r in rows])
    with open(os.path.join(DATA, "synthetic_daily.csv"), newline="") as fh:
        days = list(csv.DictReader(fh))
    cur.executemany(
        "INSERT INTO daily (crew_id,sol,heart_rate,hrv_ms,spo2,sleep_hours,mood,reaction_ms,temp_c,systolic,diastolic,radiation_mgy,exercise_min,body_mass_kg,cri) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [(d["crew_id"], int(d["sol"]), float(d["heart_rate"]), float(d["hrv_ms"]), float(d["spo2"]),
          float(d["sleep_hours"]), int(d["mood"]), float(d["reaction_ms"]), float(d["temp_c"]),
          float(d["systolic"]), float(d["diastolic"]), float(d["radiation_mgy"]),
          float(d["exercise_min"]), float(d["body_mass_kg"]), float(d["cri"])) for d in days])
    con.commit()
    counts = {
        "biomarkers": cur.execute("SELECT COUNT(*) FROM biomarkers").fetchone()[0],
        "daily": cur.execute("SELECT COUNT(*) FROM daily").fetchone()[0],
    }
    con.close()
    return counts


if __name__ == "__main__":
    print(build(), "->", DB_PATH)
