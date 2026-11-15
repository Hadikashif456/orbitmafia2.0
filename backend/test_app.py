import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient

from app import app
from cri import compute_cri, cri_band

client = TestClient(app)

CREW = ["C001", "C002", "C003", "C004"]


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_health_deps_counts():
    r = client.get("/api/v1/health/deps")
    assert r.json()["counts"] == {"biomarkers": 252, "daily": 32}


def test_cri_formula():
    # perfect day -> 100; bad day -> well below 60
    assert compute_cri({"sleep_hours": 8, "hrv_ms": 70, "heart_rate": 65, "spo2": 99,
                        "mood": 9, "reaction_ms": 250, "temp_c": 36.7}) == 100.0
    bad = compute_cri({"sleep_hours": 5, "hrv_ms": 40, "heart_rate": 85, "spo2": 94,
                       "mood": 4, "reaction_ms": 340, "temp_c": 37.8})
    assert bad < 60
    assert cri_band(95) == "EXCELLENT" and cri_band(65) == "WATCH" and cri_band(30) == "URGENT"


def test_crew_list_has_4():
    r = client.get("/api/v1/crew")
    assert len(r.json()["crew"]) == 4


def test_crp_verified_values():
    """CRP L-3 -> R+1 must match the verified OSD-575 numbers exactly."""
    expected = {"C001": 107.3, "C002": -22.2, "C003": 95.2, "C004": 28.8}
    for cid, exp in expected.items():
        r = client.get(f"/api/v1/crew/{cid}/biomarkers")
        ch = {c["analyte"]: c["pct_change"] for c in r.json()["changes_l3_to_r1"]}
        assert ch["CRP"] == exp, (cid, ch["CRP"])


def test_c002_biomarker_fall():
    r = client.get("/api/v1/crew/C002/biomarkers")
    falls = [c for c in r.json()["changes_l3_to_r1"] if c["pct_change"] <= -50]
    assert len(falls) == 8, falls


def test_cri_endpoint_recomputed_matches():
    for cid in CREW:
        r = client.get(f"/api/v1/crew/{cid}/cri")
        assert r.json()["formula_matches_stored"] is True
        assert len(r.json()["series"]) == 8


def test_all_endpoints_200():
    for cid in CREW:
        for path in ["vitals", "cri", "trend", "biomarkers", "alerts"]:
            r = client.get(f"/api/v1/crew/{cid}/{path}")
            assert r.status_code == 200, (cid, path, r.status_code)
    assert client.get("/api/v1/mission/replay").status_code == 200
    assert client.get("/api/v1/mission/summary").status_code == 200
    assert client.get("/api/v1/radiation").status_code == 200
    assert client.get("/api/v1/crew/XXXX").status_code == 404


def test_alerts_have_why_action_escalation():
    r = client.get("/api/v1/crew/C002/alerts")
    alerts = r.json()["alerts"]
    assert len(alerts) >= 2
    for a in alerts:
        assert a["why"] and a["actions"] and a["escalation"] and a["level"] in ("WATCH", "ACT", "URGENT")


def test_replay_frames():
    r = client.get("/api/v1/mission/replay")
    j = r.json()
    assert j["sols"] == [140, 141, 142, 143, 144, 145, 146, 147]
    assert len(j["frames"]) == 8 and len(j["events"]) == 8
