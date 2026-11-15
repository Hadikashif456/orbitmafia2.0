# Competitor analysis — Vitalis vs Orbit Mafia 2.0

Studied 2026-11-15 from the public repo https://github.com/QURSAM-70179225/vitalis
and the live site https://vitalis-eta-lac.vercel.app/#/dashboard.
No Vitalis code was copied. This file records what it does well, where it is
weak, and what Orbit Mafia 2.0 does differently.

## What Vitalis is

An offline-first astronaut health app (React + Vite + TypeScript, Supabase
optional). 90-day Mars-transit demo, crew of 4, seeded story: illness,
sleep deficit, EVA, solar storm on day 42 (real Curiosity RAD data),
mood decline, rising blood pressure ending in a SANS alert.

## What Vitalis does well (features we matched or answered)

| Vitalis feature | Orbit Mafia 2.0 answer |
|---|---|
| Dashboard with status banner + comm-delay explainer | Dashboard + DelayBanner on every alert page; 12-min one-way delay in every escalation line |
| Body map (tap a body system, see why it flagged) | Astronaut Detail: CRI drivers with plain-language "why" per factor + biomarker table |
| Triage engine: thresholds + personal baseline + combination rules, every alert with why | Rule-based triage in `backend/alerts.py`: biomarker rules + vitals rules; every alert carries why, actions, escalation |
| Status levels GOOD / WATCH / ACT / URGENT | CRI bands EXCELLENT / GOOD / WATCH / ACT / URGENT, same plain-words idea |
| Health Journey replay (40 days, press play) | Mission Replay: Sol 140–147 slider + play, 8 dated events, per-Sol crew CRI |
| Real NASA data chart (Curiosity RAD, solar storm 8 Mar 2012) | Real NASA OSD-575 blood biomarkers (252 rows); radiation honestly labelled synthetic instead of claimed |
| Daily check-in + report scanner (OCR) | Daily Check-in with live CRI computation, browser-only storage; no OCR (out of scope, honestly omitted) |
| Live Monitor with alarms + EVA simulator | Live Monitor page with simulated stream, labelled simulated |
| Ground Console (Mission Control, Supabase realtime) | Not built — a ground console needs accounts + a live backend; we do not fake one. Mission summary endpoint serves the same numbers instead |
| Offline-first, installable app, outbox sync | Committed SQLite DB, cached copilot, browser-stored check-ins, labelled snapshot fallback; no silent mock fallback |
| Guided tour (`?demo=1&tour=1`) | "Judges: start here" 3-minute tour in README + landing page |
| Assistant (on-device) | Copilot with cached human-written answers — explicitly NOT a live AI |
| Tests (vitest, engine tests) | pytest suite, 10 tests, including verified CRP values |

## Where Vitalis is weaker — our edge

1. **No real blood/lab data.** Vitalis's health story is seeded check-ins and real
   *radiation* data. Orbit Mafia 2.0 is built on real **OSD-575 blood biomarkers**:
   CRP +107.3% in C001 after landing is a real lab finding, not a scripted story.
2. **One opaque-seeming score vs one checkable score.** Vitalis's triage is a
   large rules engine. Our CRI is a 7-line published formula the API recomputes
   and verifies on every request (`formula_matches_stored: true`).
3. **Honesty gaps we refused to copy.** Vitalis's demo story is presented as a
   mission; its radiation is real but its crew vitals are seeded. We label real
   vs synthetic on every screen, in the API, and in the data files — and we
   explicitly do NOT claim real radiation data we do not have.
4. **Scope discipline.** Vitalis ships ~20 pages including auth, lock screen,
   settings, achievements, camera/OCR, Bluetooth device pairing. Several of
   those need accounts, hardware, or a cloud project to be real. Orbit Mafia 2.0
   ships 12 pages that all work with zero setup, zero accounts, zero keys.

## What we deliberately did not copy

- No Supabase, no auth, no lock screen, no gamification/achievements.
- No OCR report scanner, no Bluetooth pairing, no ground console.
- No Vitalis code, copy, or design. The design direction here is
  overworldaudio.com / cyera.com (dark, cinematic, huge type), not Vitalis's UI.
- No fake live AI. Vitalis's assistant is on-device logic; ours is cached
  answers and says so.

## Verdict

Vitalis wins on breadth and offline engineering. Orbit Mafia 2.0 wins on
**real lab evidence, a verifiable score, and honesty about what is real** —
the three things a judge can check in three minutes without trusting a story.
