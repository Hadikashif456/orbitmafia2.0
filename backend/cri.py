"""Orbit Mafia 2.0 — Crew Resilience Index (CRI) engine.

Transparent, rule-based, fully documented. No black box, no diagnosis.
CRI is a 0-100 decision-support score computed from the latest synthetic
daily vitals (Sol 140-147). Real NASA OSD-575 biomarkers are NOT part of
the CRI formula; they are shown separately as lab evidence.

Formula (penalties from 100):
  sleep < 7h          : (7 - sleep) * 6
  HRV < 65 ms         : (65 - hrv) * 0.35
  heart rate > 75 bpm : (hr - 75) * 0.8
  SpO2 < 97%          : (97 - spo2) * 4
  mood < 7 / 10       : (7 - mood) * 3
  reaction > 280 ms   : (rt - 280) * 0.05
  temp > 37.3 C       : (temp - 37.3) * 10
Result clamped to 0-100, rounded to 1 decimal.

Bands: 90-100 EXCELLENT (green), 75-89 GOOD (green), 60-74 WATCH (amber),
40-59 ACT (orange), 0-39 URGENT (red).
"""

def compute_cri(vitals: dict) -> float:
    p = 0.0
    p += max(0.0, 7.0 - vitals["sleep_hours"]) * 6.0
    p += max(0.0, 65.0 - vitals["hrv_ms"]) * 0.35
    p += max(0.0, vitals["heart_rate"] - 75.0) * 0.8
    p += max(0.0, 97.0 - vitals["spo2"]) * 4.0
    p += max(0.0, 7.0 - vitals["mood"]) * 3.0
    p += max(0.0, vitals["reaction_ms"] - 280.0) * 0.05
    p += max(0.0, vitals["temp_c"] - 37.3) * 10.0
    return round(max(0.0, min(100.0, 100.0 - p)), 1)


def cri_band(cri: float) -> str:
    if cri >= 90:
        return "EXCELLENT"
    if cri >= 75:
        return "GOOD"
    if cri >= 60:
        return "WATCH"
    if cri >= 40:
        return "ACT"
    return "URGENT"


def cri_drivers(vitals: dict) -> list:
    """Return the top factors pulling CRI down, with plain-language reasons."""
    drivers = []
    if vitals["sleep_hours"] < 7:
        drivers.append({"factor": "Sleep", "value": vitals["sleep_hours"],
                        "penalty": round(max(0, 7 - vitals["sleep_hours"]) * 6, 1),
                        "why": f"Only {vitals['sleep_hours']}h sleep — below the 7h target."})
    if vitals["hrv_ms"] < 65:
        drivers.append({"factor": "Heart-rate variability", "value": vitals["hrv_ms"],
                        "penalty": round(max(0, 65 - vitals["hrv_ms"]) * 0.35, 1),
                        "why": f"HRV {vitals['hrv_ms']} ms is below the 65 ms baseline — recovery is incomplete."})
    if vitals["mood"] < 7:
        drivers.append({"factor": "Mood", "value": vitals["mood"],
                        "penalty": round(max(0, 7 - vitals["mood"]) * 3, 1),
                        "why": f"Mood {vitals['mood']}/10 — low mood drags resilience down."})
    if vitals["reaction_ms"] > 280:
        drivers.append({"factor": "Reaction time", "value": vitals["reaction_ms"],
                        "penalty": round(max(0, vitals["reaction_ms"] - 280) * 0.05, 1),
                        "why": f"Reaction {vitals['reaction_ms']} ms is slower than the 280 ms baseline — possible fatigue."})
    if vitals["spo2"] < 97:
        drivers.append({"factor": "Oxygen saturation", "value": vitals["spo2"],
                        "penalty": round(max(0, 97 - vitals["spo2"]) * 4, 1),
                        "why": f"SpO2 {vitals['spo2']}% is below 97% — recheck the sensor, then rest."})
    if vitals["heart_rate"] > 75:
        drivers.append({"factor": "Resting heart rate", "value": vitals["heart_rate"],
                        "penalty": round(max(0, vitals["heart_rate"] - 75) * 0.8, 1),
                        "why": f"Resting heart rate {vitals['heart_rate']} bpm is above 75 bpm."})
    if vitals["temp_c"] > 37.3:
        drivers.append({"factor": "Body temperature", "value": vitals["temp_c"],
                        "penalty": round(max(0, vitals["temp_c"] - 37.3) * 10, 1),
                        "why": f"Temperature {vitals['temp_c']} C is above 37.3 C — possible fever."})
    drivers.sort(key=lambda d: d["penalty"], reverse=True)
    return drivers
