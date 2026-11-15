"""Alert engine: rule-based triage from biomarkers + latest daily vitals.

Every alert carries: level, why (plain language), what to do (checklist),
and escalation with the real comms delay (Mars transit, one-way ~12 min at
this distance — stated as an assumption, not a live measurement).
Decision support only — never a diagnosis.
"""
COMM_DELAY_ONE_WAY_MIN = 12


def build_alerts(crew_id: str, latest: dict, biomarker_changes: list) -> list:
    alerts = []
    # 1. CRP surge from real OSD-575 lab data
    for ch in biomarker_changes:
        if ch["analyte"] == "CRP" and ch["pct_change"] is not None:
            pc = ch["pct_change"]
            if pc >= 90:
                alerts.append({
                    "id": f"{crew_id}-crp-surge", "level": "ACT", "system": "Immune / Inflammation",
                    "title": f"CRP up {pc:+.1f}% after landing (L-3 to R+1)",
                    "why": f"C-reactive protein rose from {ch['l3_value']} to {ch['r1_value']} {ch['unit']} in the real OSD-575 lab samples. That is a strong inflammation signal after return to gravity.",
                    "actions": ["Recheck temperature and symptoms today", "Log any pain, fever or fatigue in the daily check-in",
                                 "Tell the Crew Medical Officer before the next EVA", "Repeat the lab panel at R+7 if symptoms continue"],
                    "escalation": f"Ground (flight surgeon) can answer in ~{COMM_DELAY_ONE_WAY_MIN * 2} min round-trip at the earliest. Start these steps now, do not wait."})
            elif pc >= 25:
                alerts.append({
                    "id": f"{crew_id}-crp-rise", "level": "WATCH", "system": "Immune / Inflammation",
                    "title": f"CRP up {pc:+.1f}% after landing (L-3 to R+1)",
                    "why": f"C-reactive protein rose from {ch['l3_value']} to {ch['r1_value']} {ch['unit']} in OSD-575. Mild inflammation after landing is common, but watch it.",
                    "actions": ["Recheck at the next scheduled panel", "Note any fever or soreness in the check-in"],
                    "escalation": f"Ground reply in ~{COMM_DELAY_ONE_WAY_MIN * 2} min round-trip. No need to wait for it."})
    # 2. Broad biomarker fall (C002 pattern: 8 of 9 analytes fell >50% at R+1)
    big_falls = [c for c in biomarker_changes if c["pct_change"] is not None and c["pct_change"] <= -50]
    if len(big_falls) >= 5:
        alerts.append({
            "id": f"{crew_id}-biomarker-fall", "level": "ACT", "system": "Immune / Inflammation",
            "title": f"{len(big_falls)} of 9 immune markers fell over 50% at R+1",
            "why": "In the real OSD-575 samples almost the whole immune panel dropped sharply in the first day back in gravity. That pattern needs a medical officer review, not just watching.",
            "actions": ["Crew Medical Officer review today", "Hold strenuous exercise until reviewed",
                        "Repeat the panel at R+7 and compare", "Log energy and appetite daily"],
            "escalation": f"Ground can answer in ~{COMM_DELAY_ONE_WAY_MIN * 2} min round-trip. Start the review now."})
    # 3. Daily vitals rules (synthetic daily stream, labelled as such)
    if latest:
        if latest["sleep_hours"] < 6:
            alerts.append({"id": f"{crew_id}-sleep", "level": "WATCH", "system": "Sleep",
                "title": f"Sleep only {latest['sleep_hours']}h on Sol {latest['sol']}",
                "why": "Sleep under 6 hours is the single biggest drag on the Crew Resilience Index.",
                "actions": ["Protect the next sleep window — no late tasks", "Dim lights 1 hour before sleep", "Recheck tomorrow morning"],
                "escalation": "No ground escalation needed unless it lasts 3 nights in a row."})
        if latest["spo2"] < 96:
            alerts.append({"id": f"{crew_id}-spo2", "level": "ACT", "system": "Respiratory",
                "title": f"SpO2 {latest['spo2']}% on Sol {latest['sol']}",
                "why": "Oxygen saturation below 96% needs a sensor recheck first, then rest and monitoring.",
                "actions": ["Recheck the sensor on another finger", "Rest, sit down, breathe slowly", "Recheck in 15 minutes"],
                "escalation": f"If it stays under 94%, treat as URGENT and start the emergency checklist. Ground reply ~{COMM_DELAY_ONE_WAY_MIN * 2} min round-trip."})
        if latest["cri"] is not None and latest["cri"] < 60:
            alerts.append({"id": f"{crew_id}-cri", "level": "ACT" if latest["cri"] >= 40 else "URGENT",
                "system": "Overall resilience",
                "title": f"Crew Resilience Index {latest['cri']} — lowest in the crew",
                "why": f"CRI {latest['cri']} on Sol {latest['sol']} is driven by sleep, HRV and reaction time together, not one bad number.",
                "actions": ["Cut non-essential tasks today", "Do the guided recovery plan (see Recovery page)",
                            "Crew Medical Officer check-in today"],
                "escalation": f"Ground reply in ~{COMM_DELAY_ONE_WAY_MIN * 2} min round-trip. Act now, do not wait for Earth."})
        if latest["radiation_mgy"] and latest["radiation_mgy"] > 1.0:
            alerts.append({"id": f"{crew_id}-rad", "level": "WATCH", "system": "Radiation",
                "title": f"Radiation dose {latest['radiation_mgy']} mGy on Sol {latest['sol']} — solar event",
                "why": "Daily dose more than doubled during the Sol 144 solar particle event. Sheltering kept the crew safe.",
                "actions": ["Stay in the shielded area until the all-clear", "Log dose in the daily check-in", "No EVA until dose falls back under 0.6 mGy"],
                "escalation": "Ground radiation team is notified automatically on the next downlink."})
    order = {"URGENT": 0, "ACT": 1, "WATCH": 2}
    return sorted(alerts, key=lambda a: order.get(a["level"], 3))
