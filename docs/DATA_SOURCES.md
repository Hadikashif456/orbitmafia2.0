# Data sources

## Real — NASA OSD-575 (biomarkers)

- Source: NASA Open Science Data Repository (OSDR), study **OSD-575**, Version 3.
- Panel: HDCVD9 (9 immune analytes): CRP, IL-6, TNF-alpha, IL-1beta, IL-10, MCP-1, IL-8, VEGF-A, Cortisol.
- Structure: 4 crew (C001–C004) × 7 timepoints (L-180, L-90, L-30, L-3, R+0, R+1, R+7) = 28 samples × 9 analytes = **252 values**.
- File: `data/osd575_biomarkers.csv`. Rebuild the DB: `python backend/seed.py`.
- Verified values (CRP, L-3 → R+1): C001 +107.3%, C003 +95.2%, C002 −22.2%, C004 +28.8%.
  C002: 8 of 9 analytes fell over 50% at R+1. These are enforced by tests in `backend/test_app.py`.
- Provenance note: the per-analyte sample values reproduce the OSD-575 structure and the
  verified CRP changes exactly. Other analytes' absolute values are sample values consistent
  with that structure, documented as such — not claimed to be a verbatim export of the OSDR file.

## Synthetic — labelled everywhere (daily vitals)

- File: `data/synthetic_daily.csv`, 32 rows: Sol 140–147 × 4 crew.
- Fields: heart rate, HRV, SpO2, sleep, mood, reaction time, temperature, blood pressure,
  radiation dose, exercise, body mass, CRI (computed by the published formula in `backend/cri.py`).
- Why synthetic: OSD-575 contains no daily sleep, heart-rate, HRV, exercise or mood time series.
  Daily streams therefore had to be generated. They are labelled "synthetic" on every screen,
  in every API response (`"source": "synthetic daily vitals (labelled)"`), and in this file.
- Radiation dose values are also synthetic and labelled. This project does not claim real
  Curiosity RAD data.

## What is not used

- No live sensor data, no Bluetooth data, no user health data.
- Check-ins are stored only in the visitor's own browser (localStorage).
