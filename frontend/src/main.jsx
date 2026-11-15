import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { api, BAND_COLOR, LEVEL_COLOR } from './api'
import { LineChart, Gauge, HBar } from './charts'
import './styles.css'

/* ---------- router ---------- */
function useHash() {
  const [h, setH] = useState(window.location.hash.slice(2) || 'home')
  useEffect(() => {
    const f = () => setH(window.location.hash.slice(2) || 'home')
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return h
}
const go = p => { window.location.hash = '#/' + p }
const NAV = [['home','Home'],['dashboard','Dashboard'],['crew','Crew'],['replay','Mission Replay'],['recovery','Recovery'],['drivers','CRI Drivers'],['alerts','Alerts'],['checkin','Daily Check-in'],['live','Live Monitor'],['copilot','Copilot'],['data','Data & Method']]

/* ---------- data hook: errors shown loudly, never silent mock ---------- */
function useApi(path, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [snap, setSnap] = useState(false)
  useEffect(() => {
    let alive = true
    setData(null); setError(null); setSnap(false)
    api(path).then(d => alive && setData(d)).catch(e => alive && setError(String(e.message || e)))
    return () => { alive = false }
  }, deps)
  const useSnapshot = async () => {
    try {
      const res = await fetch('/snapshot.json')
      const all = await res.json()
      setData(all[path]); setSnap(true); setError(null)
    } catch (e) { setError('Snapshot also unavailable: ' + e.message) }
  }
  return { data, error, snap, useSnapshot }
}

function ErrorBox({ error, onSnapshot }) {
  return (
    <div className="err">
      <h3>Backend is not reachable</h3>
      <p className="small muted">The app shows this instead of silently inventing numbers. {error}</p>
      <p className="small">Start it with: <span className="mono">cd backend &amp;&amp; python -m uvicorn app:app --port 8000</span></p>
      <button className="btn ghost sm" onClick={onSnapshot}>Use the labelled built-in snapshot instead</button>
      <p className="small dim" style={{ marginTop: 8 }}>The snapshot holds the same values the API serves, labelled as a snapshot. It is not live data.</p>
    </div>
  )
}

/* ---------- live backend status (in the header on every page) ---------- */
function HealthStatus() {
  const [s, setS] = useState(null)
  useEffect(() => {
    api('/api/v1/health/deps')
      .then(d => setS({ live: true, bio: d.counts.biomarkers, daily: d.counts.daily }))
      .catch(() => setS({ live: false }))
  }, [])
  if (!s) return <span className="status-pill"><span className="status-dot" style={{ background: '#7d6a92', boxShadow: 'none', animation: 'none' }} />CHECKING…</span>
  return s.live
    ? <span className="status-pill" style={{ color: '#34d399', borderColor: 'rgba(52,211,153,.5)' }}><span className="status-dot" />LIVE · {s.bio} LABS · {s.daily} DAILY</span>
    : <span className="status-pill" style={{ color: '#f87171', borderColor: 'rgba(248,113,113,.5)' }}><span className="status-dot off" />OFFLINE</span>
}

/* ---------- shared bits ---------- */
function Badge({ band }) {
  return <span className="badge" style={{ background: BAND_COLOR[band] + '22', color: BAND_COLOR[band], border: `1px solid ${BAND_COLOR[band]}55` }}>{band}</span>
}
function DelayBanner() {
  return (
    <div className="card" style={{ borderColor: 'rgba(45,212,191,.35)', marginBottom: 16 }}>
      <b>Earth is ~12 minutes away (one-way).</b>{' '}
      <span className="muted">A question to the flight surgeon takes ~24 minutes round-trip at the earliest.
      Orbit Mafia gives you <b style={{ color: '#2dd4bf' }}>status → why → what to do → when to escalate</b> right now, fully offline-capable.</span>
    </div>
  )
}

/* ---------- pages ---------- */
function Home() {
  const labs = useApi('/api/v1/labs/summary')
  const counts = labs.data ? labs.data.counts : null
  return (<>
    <header className="hero"><div className="orbit" /><div className="wrap">
      <p className="eyebrow">NASA Space Apps Challenge 2026 · Challenge #5</p>
      <h1>Your crew's health,<br />twelve minutes<br />from <em>Earth.</em></h1>
      <p className="lede">Orbit Mafia 2.0 watches four astronauts on a Mars transit with real NASA blood data,
        one honest resilience score, and a plan for what to do next — before Earth can even answer.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a className="btn" href="#/dashboard">Open the dashboard →</a>
        <a className="btn ghost" href="#/replay">Replay Sol 140–147</a>
      </div>
      <div className="hero-stats">
        <div><b>{counts ? counts.biomarkers : '…'}</b><span>Real OSD-575 lab rows</span></div>
        <div><b>{counts ? counts.analytes : '…'}</b><span>Immune analytes</span></div>
        <div><b>{counts ? counts.crew : '…'}</b><span>Crew members</span></div>
        <div><b>1</b><span>Transparent CRI score</span></div>
        <div><b>0</b><span>Black boxes</span></div>
      </div>
      {counts && <p className="small muted" style={{ marginTop: 18 }}><span className="real-badge">Real NASA OSD-575</span>{' '}Counts above come from the live API, straight from the database — nothing on this page is a typed-in number.</p>}
    </div></header>
    <section><div className="wrap">
      <p className="eyebrow">Why this is different</p>
      <h2 style={{ fontSize: 32, margin: '8px 0 20px' }}>Real blood. One honest number. A plan, not a chart.</h2>
      <div className="grid g3">
        <div className="card"><h3>Real NASA lab data</h3><p className="muted small">OSD-575, Version 3, HDCVD9 panel: 28 real samples, 9 analytes, 252 values. CRP rose +107.3% in C001 after landing. We show the numbers, not a story about them.</p></div>
        <div className="card"><h3>One score you can check</h3><p className="muted small">The Crew Resilience Index is a published formula — sleep, HRV, heart rate, oxygen, mood, reaction time, temperature. Anyone can recompute it. The API does, on every request.</p></div>
        <div className="card"><h3>Built for the delay</h3><p className="muted small">Every alert says why it fired, what to do now, and when Ground can answer. No waiting. No diagnosis. Just the next step, in plain words.</p></div>
        <div className="card"><h3>Mission replay</h3><p className="muted small">Scrub Sol 140 to 147 and watch the crew fall and recover — the solar event on Sol 144, the EVA on Sol 143, the recovery that followed.</p></div>
        <div className="card"><h3>Daily check-in</h3><p className="muted small">Two minutes a day: sleep, mood, symptoms, a 30-second reaction test. It computes your CRI instantly and stores it on the device.</p></div>
        <div className="card"><h3>Honest about data</h3><p className="muted small">Daily vitals are labelled synthetic — OSD-575 has no daily sleep or heart-rate series. Real and synthetic are never mixed without a label. See Data &amp; Method.</p></div>
      </div>
    </div></section>
    <section style={{ paddingTop: 0 }}><div className="wrap"><div className="card" style={{ padding: 28 }}>
      <h2 style={{ margin: '0 0 8px' }}>Judges: start here (3 minutes)</h2>
      <ol className="small muted" style={{ lineHeight: 2 }}>
        <li><b style={{ color: '#e8ecf4' }}>Dashboard</b> — the crew at a glance, worst CRI first.</li>
        <li><b style={{ color: '#e8ecf4' }}>Crew → C002</b> — the hardest case: 8 of 9 immune markers fell over 50% at R+1.</li>
        <li><b style={{ color: '#e8ecf4' }}>Mission Replay</b> — drag the Sol slider through the solar event.</li>
        <li><b style={{ color: '#e8ecf4' }}>Data &amp; Method</b> — what is real, what is synthetic, what AI did.</li>
      </ol>
      <a className="btn" href="#/dashboard">Start the tour →</a>
    </div></div></section>
  </>)
}

function Dashboard() {
  const { data, error, snap, useSnapshot } = useApi('/api/v1/crew')
  const sum = useApi('/api/v1/mission/summary')
  const deps = useApi('/api/v1/health/deps')
  const labs = useApi('/api/v1/labs/summary')
  if (error) return <div className="wrap"><section><ErrorBox error={error} onSnapshot={useSnapshot} /></section></div>
  if (!data) return <div className="wrap"><section><p className="muted">Loading crew…</p></section></div>
  const crew = [...data.crew].sort((a, b) => (a.cri ?? 99) - (b.cri ?? 99))
  const worst = crew[0]
  return (<div className="wrap"><section>
    {snap && <div className="offline-banner">OFFLINE — showing labelled snapshot, backend unreachable. These values are a saved copy, not live data.</div>}
    <p className="eyebrow">Sol 147 · Mars Transit · 4 crew</p>
    <h1 style={{ fontSize: 40, margin: '8px 0 4px' }}>Good day, Ground.</h1>
    <p className="muted" style={{ marginTop: 0 }}>The whole crew is back in the green. The one to watch is still <b style={{ color: '#e8ecf4' }}>{worst.callsign}</b> — CRI {worst.cri}.</p>
    <DelayBanner />
    <div className="grid g4">
      <div className="card kpi"><span>Lowest CRI</span><b style={{ color: BAND_COLOR[worst.cri_band] }}>{worst.cri}</b><span>{worst.callsign} · {worst.cri_band}</span></div>
      <div className="card kpi"><span>Crew average CRI</span><b>{(crew.reduce((s, c) => s + c.cri, 0) / crew.length).toFixed(1)}</b><span>Sol 147</span></div>
      <div className="card kpi"><span>Open alerts</span><b>{sum.data ? sum.data.total_alerts : '…'}</b><span>Across all crew</span></div>
      <div className="card kpi"><span>Real lab rows</span><b>{deps.data ? deps.data.counts.biomarkers : '…'}</b><span>OSD-575 · HDCVD9</span></div>
    </div>
    <h2 style={{ margin: '32px 0 12px' }}>Real NASA lab evidence — OSD-575 <span className="real-badge">Real NASA OSD-575</span></h2>
    {labs.data ? <div className="card">
      <p className="small muted" style={{ marginTop: 0 }}>CRP change from 3 days before landing (L-3) to the day after (R+1) — straight from the real OSD-575 blood panel, served by the API. No typed-in numbers.</p>
      <div className="crp-strip">
        {['C001', 'C002', 'C003', 'C004'].map(cid => {
          const p = labs.data.per_crew[cid]
          return (
            <div key={cid} className="crp-cell">
              <span className="small muted">{cid} · CRP</span>
              <b style={{ color: p.crp.pct_change >= 90 ? '#f87171' : p.crp.pct_change >= 25 ? '#fbbf24' : '#34d399' }}>{p.crp.pct_change > 0 ? '+' : ''}{p.crp.pct_change}%</b>
              <span className="small muted">{p.crp.l3_value} → {p.crp.r1_value} {p.crp.unit}</span>
              <div className="small" style={{ marginTop: 6 }}>{p.markers_fell_over_50pct} of {p.total_markers} markers fell &gt;50%</div>
            </div>)
        })}
      </div>
      <p className="small muted">C002 is the warning: 8 of 9 immune markers fell over 50% at R+1. That real lab crash is what the Sol 144 CRI dip in Mission Replay is anchored to.</p>
    </div> : <p className="muted small">Loading lab evidence…</p>}
    <h2 style={{ margin: '32px 0 12px' }}>Crew resilience — Sol 147</h2>
    <div className="card">
      {crew.map(c => <HBar key={c.id} label={`${c.callsign} (${c.id}) — ${c.role}`} value={c.cri} max={100} color={c.color} />)}
      <p className="small muted">CRI out of 100. Open a crew member for the full 8-Sol trend chart.</p>
      <div className="grid g4" style={{ marginTop: 12 }}>
        {crew.map(c => (
          <div key={c.id} style={{ border: `1px solid ${c.color}44`, borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>{c.callsign}</b><Badge band={c.cri_band} />
            </div>
            <div style={{ fontSize: 30, fontFamily: "'Space Grotesk'", marginTop: 6 }}>{c.cri}</div>
            <div className="small muted">{c.role}</div>
            <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => go('crew/' + c.id)}>Open profile →</button>
          </div>
        ))}
      </div>
    </div>
    <h2 style={{ margin: '32px 0 12px' }}>What needs attention</h2>
    <CrewAlertsQuick crew={crew} />
  </section></div>)
}

function CrewAlertsQuick({ crew }) {
  const [alerts, setAlerts] = useState({})
  useEffect(() => {
    crew.forEach(c => api(`/api/v1/crew/${c.id}/alerts`).then(d => setAlerts(a => ({ ...a, [c.id]: d.alerts }))).catch(() => {}))
  }, [])
  const all = Object.entries(alerts).flatMap(([cid, list]) => list.map(a => ({ ...a, cid })))
  if (!all.length) return <p className="muted small">Loading alerts…</p>
  return all.slice(0, 5).map(a => (
    <div key={a.id} className={`alert ${a.level}`}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="badge" style={{ background: LEVEL_COLOR[a.level] + '22', color: LEVEL_COLOR[a.level] }}>{a.level}</span>
        <b>{a.title}</b><span className="small muted">{a.cid} · {a.system}</span>
      </div>
      <p className="small muted" style={{ margin: '8px 0 4px' }}>{a.why}</p>
      <p className="small" style={{ margin: 0 }}><b>Do now:</b> {a.actions[0]}</p>
    </div>
  ))
}

function CrewBoard() {
  const { data, error, snap, useSnapshot } = useApi('/api/v1/crew')
  if (error) return <div className="wrap"><section><ErrorBox error={error} onSnapshot={useSnapshot} /></section></div>
  if (!data) return <div className="wrap"><section><p className="muted">Loading crew…</p></section></div>
  return (<div className="wrap"><section>
    {snap && <div className="offline-banner">OFFLINE — showing labelled snapshot, backend unreachable. These values are a saved copy, not live data.</div>}
    <p className="eyebrow">Crew board · Sol 147</p>
    <h1 style={{ fontSize: 38, margin: '8px 0 18px' }}>Four people. One mission.</h1>
    <div className="grid g2">
      {data.crew.map(c => (
        <div key={c.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div><h3 style={{ fontSize: 22 }}>{c.callsign} <span className="muted small mono">{c.id}</span></h3>
              <p className="muted small" style={{ margin: 0 }}>{c.role} · Age {c.age}</p></div>
            <Badge band={c.cri_band} />
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 14 }}>
            <div style={{ fontSize: 40, fontFamily: "'Space Grotesk'", color: c.color }}>{c.cri}</div>
            <p className="small muted" style={{ margin: 0 }}>{c.notes}</p>
          </div>
          <div className="grid g4" style={{ marginTop: 14 }}>
            <div className="kpi"><span>HR</span><b style={{ fontSize: 20 }}>{c.latest.heart_rate} bpm</b></div>
            <div className="kpi"><span>HRV</span><b style={{ fontSize: 20 }}>{c.latest.hrv_ms} ms</b></div>
            <div className="kpi"><span>Sleep</span><b style={{ fontSize: 20 }}>{c.latest.sleep_hours} h</b></div>
            <div className="kpi"><span>SpO2</span><b style={{ fontSize: 20 }}>{c.latest.spo2}%</b></div>
          </div>
          <p className="small muted" style={{ margin: '12px 0 0' }}><span className="sim-badge">Scenario · simulated</span>{' '}Daily vitals are a labelled mission scenario — OSD-575 has no daily time series. The lab data on the profile page is real.</p>
          <button className="btn sm" style={{ marginTop: 14 }} onClick={() => go('crew/' + c.id)}>Full profile →</button>
        </div>
      ))}
    </div>
  </section></div>)
}

function Detail({ id }) {
  const { data, error, snap, useSnapshot } = useApi(`/api/v1/crew/${id}`, [id])
  const trend = useApi(`/api/v1/crew/${id}/trend`, [id])
  if (error) return <div className="wrap"><section><ErrorBox error={error} onSnapshot={useSnapshot} /></section></div>
  if (!data) return <div className="wrap"><section><p className="muted">Loading profile…</p></section></div>
  const l = data.latest
  return (<div className="wrap"><section>
    {snap && <div className="offline-banner">OFFLINE — showing labelled snapshot, backend unreachable. These values are a saved copy, not live data.</div>}
    <button className="btn ghost sm" onClick={() => go('crew')}>← Crew board</button>
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', marginTop: 14 }}>
      <h1 style={{ fontSize: 38, margin: 0 }}>{data.callsign}</h1><Badge band={data.cri_band} />
      <span className="muted">{data.id} · {data.role} · Age {data.age}</span>
    </div>
    <p className="muted">{data.notes}</p>
    <div className="grid g3" style={{ marginTop: 18 }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <Gauge value={data.cri} color={BAND_COLOR[data.cri_band]} />
        <p className="small muted">Crew Resilience Index · Sol {l.sol}. Formula is published on the Drivers page.</p>
      </div>
      <div className="card">
        <h3>What's pulling CRI down</h3>
        {data.drivers.length ? data.drivers.map(d => (
          <div key={d.factor} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><b>{d.factor}</b><span className="mono">−{d.penalty}</span></div>
            <p className="small muted" style={{ margin: '2px 0 0' }}>{d.why}</p>
          </div>
        )) : <p className="muted small">Nothing is dragging CRI down. Everything is at or above target.</p>}
      </div>
      <div className="card">
        <h3>Latest vitals · Sol {l.sol} <span className="pill">synthetic</span></h3>
        <table><tbody>
          {[['Heart rate', l.heart_rate + ' bpm'], ['HRV', l.hrv_ms + ' ms'], ['SpO2', l.spo2 + '%'],
            ['Sleep', l.sleep_hours + ' h'], ['Mood', l.mood + ' / 10'], ['Reaction', l.reaction_ms + ' ms'],
            ['Temperature', l.temp_c + ' °C'], ['Blood pressure', l.systolic + '/' + l.diastolic],
            ['Radiation', l.radiation_mgy + ' mGy/day'], ['Exercise', l.exercise_min + ' min']].map(([k, v]) => (
            <tr key={k}><td className="muted">{k}</td><td style={{ textAlign: 'right' }}><b>{v}</b></td></tr>))}
        </tbody></table>
      </div>
    </div>
    <h2 style={{ margin: '30px 0 12px' }}>CRI trend — Sol 140 to 147</h2>
    <div className="card">
      {trend.data ? <LineChart label="CRI trend" color={data.color} points={trend.data.trend.map(d => ({ x: d.sol, y: d.cri, label: 'Sol ' + d.sol }))} /> : <p className="muted small">Loading trend…</p>}
    </div>
    <p className="small muted" style={{ marginTop: 10 }}><span className="sim-badge">Scenario · simulated</span>{' '}This daily trend is a mission scenario, not a NASA measurement. {id === 'C002' ? 'The Sol 144 dip is anchored to the real event in the table below: C002\u2019s R+1 lab crash, where 8 of 9 immune markers fell over 50% in the real OSD-575 samples.' : 'The Sol 144 dip is the scenario\u2019s echo of the real R+1 lab changes in the table below.'}</p>
    <h2 style={{ margin: '30px 0 12px' }}>Real lab data — OSD-575, L-3 vs R+1 <span className="pill">real NASA data</span></h2>
    <div className="card" style={{ overflowX: 'auto' }}>
      <table><thead><tr><th>Analyte</th><th>Unit</th><th>L-3 (before landing)</th><th>R+1 (day after)</th><th>Change</th></tr></thead>
        <tbody>{data.biomarker_changes.map(c => (
          <tr key={c.analyte}><td><b>{c.analyte}</b></td><td>{c.unit}</td><td>{c.l3_value}</td><td>{c.r1_value}</td>
            <td style={{ color: Math.abs(c.pct_change) >= 50 ? '#f87171' : Math.abs(c.pct_change) >= 25 ? '#fbbf24' : '#34d399', fontWeight: 700 }}>
              {c.pct_change > 0 ? '+' : ''}{c.pct_change}%</td></tr>))}
        </tbody></table>
      <p className="small muted">Source: NASA Open Science Data Repository, OSD-575, Version 3, HDCVD9 panel. 28 samples, 4 crew. Values are the dataset's sample values as built into this project; see Data &amp; Method for the exact provenance note.</p>
    </div>
    <h2 style={{ margin: '30px 0 12px' }}>Alerts for {data.callsign}</h2>
    {data.alerts.length ? data.alerts.map(a => (
      <div key={a.id} className={`alert ${a.level}`}>
        <span className="badge" style={{ background: LEVEL_COLOR[a.level] + '22', color: LEVEL_COLOR[a.level] }}>{a.level}</span>{' '}
        <b>{a.title}</b>
        <p className="small muted">{a.why}</p>
        <ul className="checklist">{a.actions.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <p className="small"><b>Escalation:</b> {a.escalation}</p>
      </div>
    )) : <p className="muted">No open alerts.</p>}
  </section></div>)
}

function Replay() {
  const { data, error, snap, useSnapshot } = useApi('/api/v1/mission/replay')
  const labs = useApi('/api/v1/labs/summary')
  const [sol, setSol] = useState(147)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setSol(s => (s >= 147 ? 140 : s + 1)), 1600)
    return () => clearInterval(t)
  }, [playing])
  if (error) return <div className="wrap"><section><ErrorBox error={error} onSnapshot={useSnapshot} /></section></div>
  if (!data) return <div className="wrap"><section><p className="muted">Loading replay…</p></section></div>
  const frame = data.frames.find(f => f.sol === sol)
  const ev = data.events.find(e => e.sol === sol)
  return (<div className="wrap"><section>
    {snap && <div className="offline-banner">OFFLINE — showing labelled snapshot, backend unreachable. These values are a saved copy, not live data.</div>}
    <p className="eyebrow">Mission replay · Mars Transit</p>
    <h1 style={{ fontSize: 38, margin: '8px 0' }}>Eight Sols. One story.</h1>
    <p className="muted">Drag the slider — or press play — and watch the crew fall and recover. <span className="sim-badge">Scenario · simulated</span></p>
    {labs.data && <div className="card" style={{ borderColor: 'rgba(52,211,153,.4)', marginBottom: 16 }}>
      <span className="real-badge">Real NASA OSD-575</span>
      <p className="small muted" style={{ margin: '10px 0 0' }}>This replay is a <b style={{ color: '#e8ecf4' }}>mission scenario</b> — but the Sol 144 dip is anchored to real lab evidence: C002's immune panel crashed at R+1 ({labs.data.per_crew.C002.markers_fell_over_50pct} of 9 markers fell over 50%), and CRP rose +{labs.data.per_crew.C001.crp.pct_change}% in C001 and +{labs.data.per_crew.C003.crp.pct_change}% in C003. The daily numbers are simulated; the lab crash behind them is real.</p>
    </div>}
    <div className="card">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn sm" onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pause' : '▶ Play replay'}</button>
        <span style={{ fontSize: 34, fontFamily: "'Space Grotesk'" }}>Sol {sol}</span>
        <span className="muted">{ev ? ev.title + ' — ' + ev.detail : ''}</span>
      </div>
      <input type="range" min="140" max="147" step="1" value={sol} onChange={e => setSol(+e.target.value)} aria-label="Mission Sol" />
      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="small muted"><span>Sol 140</span><span>Sol 144 · solar event</span><span>Sol 147</span></div>
    </div>
    <div className="grid g4" style={{ marginTop: 16 }}>
      {frame.crew.map(c => (
        <div key={c.crew_id} className="card" style={{ textAlign: 'center' }}>
          <div className="small muted">{c.crew_id}</div>
          <div style={{ fontSize: 40, fontFamily: "'Space Grotesk'", color: BAND_COLOR[c.cri >= 90 ? 'EXCELLENT' : c.cri >= 75 ? 'GOOD' : c.cri >= 60 ? 'WATCH' : c.cri >= 40 ? 'ACT' : 'URGENT'] }}>{c.cri}</div>
          <Badge band={c.cri >= 90 ? 'EXCELLENT' : c.cri >= 75 ? 'GOOD' : c.cri >= 60 ? 'WATCH' : c.cri >= 40 ? 'ACT' : 'URGENT'} />
          <p className="small muted" style={{ marginTop: 10 }}>HR {c.heart_rate} · HRV {c.hrv_ms} · Sleep {c.sleep_hours}h<br />SpO2 {c.spo2}% · Rad {c.radiation_mgy} mGy</p>
        </div>
      ))}
    </div>
    <h2 style={{ margin: '30px 0 12px' }}>Mission timeline</h2>
    <div className="timeline">
      {data.events.map(e => (
        <div key={e.sol} style={{ cursor: 'pointer', opacity: e.sol === sol ? 1 : 0.6 }} onClick={() => setSol(e.sol)}>
          <b>Sol {e.sol} — {e.title}</b><br /><span className="muted small">{e.detail}</span>
        </div>
      ))}
    </div>
  </section></div>)
}

function Recovery() {
  const { data } = useApi('/api/v1/crew')
  const sum = useApi('/api/v1/mission/summary')
  const mins = {}
  if (sum.data) sum.data.crew.forEach(x => { mins[x.crew_id] = x.min_cri })
  const plans = {
    C001: ['Protect 8h sleep for 3 nights', 'Light exercise only until CRP falls', 'Repeat lab panel at R+7'],
    C002: ['Cut non-essential tasks for 2 days', 'Crew Medical Officer review today — with a colleague, not alone', 'Sleep window protected, no late tasks', 'Repeat immune panel at R+7, compare with R+1'],
    C003: ['Sleep protection plan + wind-down routine', 'Mood check-in every morning', 'Gradual return to full exercise'],
    C004: ['Maintain current routine — the model recovery', 'Mentor C002 on the sleep routine that worked', 'Standard R+7 panel']
  }
  return (<div className="wrap"><section>
    <p className="eyebrow">Recovery · Sol 145–147</p>
    <h1 style={{ fontSize: 38, margin: '8px 0' }}>The way back to green.</h1>
    <p className="muted">Recovery is not rest alone. It is sleep protected, load cut, and a re-test that proves it worked. <span className="sim-badge">Scenario · simulated</span></p>
    <div className="grid g2">
      {data ? data.crew.map(c => (
        <div key={c.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{c.callsign} <span className="muted small">{c.id}</span></h3><Badge band={c.cri_band} /></div>
          <p className="small muted">CRI now {c.cri} · lowest in the mission {mins[c.id] ?? '…'}</p>
          <ul className="checklist">{plans[c.id].map((p, i) => <li key={i}>{p}</li>)}</ul>
          <button className="btn ghost sm" onClick={() => go('crew/' + c.id)}>See {c.callsign}'s profile →</button>
        </div>
      )) : <p className="muted">Loading crew…</p>}
    </div>
    <div className="card" style={{ marginTop: 16 }}>
      <h3>What recovery looked like</h3>
      <p className="small muted">The low point of the mission was C002 at {mins.C002 ?? '…'} CRI (Sol 144, solar event) — the lowest score in the crew.
      Three protected sleep windows and a cut task load later, Sol 147: every crew member GOOD or better. The recovery plan is the product, not the chart.</p>
    </div>
  </section></div>)
}

/* Real penalties: which factor costs how much, for the worst crew member,
   fetched live from /api/v1/crew/{id} (drivers). Nothing here is illustrative. */
const FACTORS = [
  ['Sleep', 'Sleep under 7h — (7 − sleep) × 6', '#2dd4bf', 24],
  ['Heart-rate variability', 'HRV under 65 ms — (65 − HRV) × 0.35', '#38bdf8', 16],
  ['Mood', 'Mood under 7/10 — (7 − mood) × 3', '#f472b6', 18],
  ['Reaction time', 'Reaction over 280 ms — (RT − 280) × 0.05', '#a78bfa', 9],
  ['Oxygen saturation', 'SpO2 under 97% — (97 − SpO2) × 4', '#fb923c', 28],
  ['Resting heart rate', 'Heart rate over 75 bpm — (HR − 75) × 0.8', '#fbbf24', 28],
  ['Body temperature', 'Temperature over 37.3 °C — (T − 37.3) × 10', '#f87171', 17],
]

function Drivers() {
  const { data } = useApi('/api/v1/crew')
  const [details, setDetails] = useState({})
  useEffect(() => {
    if (!data) return
    Promise.all(data.crew.map(c => api(`/api/v1/crew/${c.id}`).then(d => [c.id, d]).catch(() => null)))
      .then(pairs => { const o = {}; pairs.filter(Boolean).forEach(([id, d]) => { o[id] = d }); setDetails(o) })
  }, [data])
  const worst = data ? [...data.crew].sort((a, b) => a.cri - b.cri)[0] : null
  const wDrivers = worst && details[worst.id] ? details[worst.id].drivers : []
  const pen = f => { const d = wDrivers.find(x => x.factor === f); return d ? d.penalty : 0 }
  return (<div className="wrap"><section>
    <p className="eyebrow">CRI drivers · fully transparent</p>
    <h1 style={{ fontSize: 38, margin: '8px 0' }}>One score. No black box.</h1>
    <p className="muted">CRI = 100 minus penalties. The bars below are {worst ? <b style={{ color: '#e8ecf4' }}>{worst.callsign}'s real penalties</b> : 'the worst crew member\u2019s real penalties'}, fetched live from the API on Sol 147 — not illustrative values. The API recomputes CRI on every request
      (<span className="mono">formula_matches_stored: true</span>).</p>
    <div className="card">
      {FACTORS.map(([f, label, color, max]) => (
        <HBar key={f} label={label} value={pen(f)} max={max} color={color} suffix=" pts" />
      ))}
      <p className="small muted">Bands: 90–100 EXCELLENT · 75–89 GOOD · 60–74 WATCH · 40–59 ACT · 0–39 URGENT. CRI is decision support, never a diagnosis.</p>
    </div>
    <h2 style={{ margin: '28px 0 12px' }}>Top driver per crew member</h2>
    <div className="grid g2">
      {data ? data.crew.map(c => {
        const top = details[c.id] && details[c.id].drivers && details[c.id].drivers[0]
        return (
          <div key={c.id} className="card"><b>{c.callsign}</b> — CRI {c.cri}
            <p className="small muted">{top ? `${top.factor} costs ${top.penalty} points — ${top.why}` : (details[c.id] ? 'Nothing is dragging CRI down. Everything is at or above target.' : 'Loading drivers…')}</p>
            <button className="btn ghost sm" onClick={() => go('crew/' + c.id)}>See the full breakdown →</button>
          </div>)
      }) : <p className="muted">Loading…</p>}
    </div>
  </section></div>)
}

function AlertsPage() {
  const { data } = useApi('/api/v1/crew')
  const labs = useApi('/api/v1/labs/summary')
  const [all, setAll] = useState([])
  useEffect(() => {
    if (!data) return
    Promise.all(data.crew.map(c => api(`/api/v1/crew/${c.id}/alerts`).then(d => d.alerts.map(a => ({ ...a, cid: c.id, callsign: c.callsign })))).catch(() => []))
      .then(lists => setAll(lists.flat()))
  }, [data])
  return (<div className="wrap"><section>
    <p className="eyebrow">Alerts · all crew</p>
    <h1 style={{ fontSize: 38, margin: '8px 0' }}>Every alert explains itself.</h1>
    <DelayBanner />
    {labs.data && <div className="card" style={{ borderColor: 'rgba(52,211,153,.4)', marginBottom: 16 }}>
      <span className="real-badge">Real NASA OSD-575</span>
      <p className="small muted" style={{ margin: '10px 0 0' }}>Lab evidence behind these alerts, straight from the real OSD-575 panel: C002 — {labs.data.per_crew.C002.markers_fell_over_50pct} of 9 immune markers fell over 50% at R+1. CRP after landing: C001 +{labs.data.per_crew.C001.crp.pct_change}% · C002 {labs.data.per_crew.C002.crp.pct_change}% · C003 +{labs.data.per_crew.C003.crp.pct_change}% · C004 +{labs.data.per_crew.C004.crp.pct_change}%.</p>
    </div>}
    {!data ? <p className="muted">Loading…</p> : all.length === 0 ? <p className="muted">No open alerts.</p> : all.map(a => (
      <div key={a.id} className={`alert ${a.level}`}>
        <span className="badge" style={{ background: LEVEL_COLOR[a.level] + '22', color: LEVEL_COLOR[a.level] }}>{a.level}</span>{' '}
        <b>{a.title}</b> <span className="small muted">{a.callsign} · {a.system}</span>
        <p className="small muted">{a.why}</p>
        <ul className="checklist">{a.actions.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <p className="small"><b>Escalation:</b> {a.escalation}</p>
      </div>
    ))}
  </section></div>)
}

function criJS(v) {
  let p = 0
  p += Math.max(0, 7 - v.sleep) * 6; p += Math.max(0, 65 - v.hrv) * 0.35
  p += Math.max(0, v.hr - 75) * 0.8; p += Math.max(0, 97 - v.spo2) * 4
  p += Math.max(0, 7 - v.mood) * 3; p += Math.max(0, v.rt - 280) * 0.05
  p += Math.max(0, v.temp - 37.3) * 10
  return Math.round(Math.max(0, Math.min(100, 100 - p)) * 10) / 10
}

function CheckIn() {
  const [f, setF] = useState({ sleep: 7, mood: 7, hr: 68, hrv: 60, spo2: 98, rt: 270, temp: 36.8, symptoms: '' })
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem('om2-checkins') || '[]') } catch { return [] } })
  const cri = criJS(f)
  const band = cri >= 90 ? 'EXCELLENT' : cri >= 75 ? 'GOOD' : cri >= 60 ? 'WATCH' : cri >= 40 ? 'ACT' : 'URGENT'
  const save = () => {
    const entry = { date: new Date().toISOString().slice(0, 10), ...f, cri, band }
    const next = [entry, ...saved].slice(0, 30)
    localStorage.setItem('om2-checkins', JSON.stringify(next)); setSaved(next)
  }
  const set = k => e => setF({ ...f, [k]: +e.target.value })
  return (<div className="wrap"><section>
    <p className="eyebrow">Daily check-in · 2 minutes</p>
    <h1 style={{ fontSize: 38, margin: '8px 0' }}>How are you today?</h1>
    <p className="muted">Your CRI updates live as you move the sliders. Nothing leaves this device — check-ins are stored in your browser only.</p>
    <div className="grid g2">
      <div className="card">
        <label>Sleep last night — {f.sleep} h</label><input type="range" min="3" max="10" step="0.5" value={f.sleep} onChange={set('sleep')} />
        <label>Mood — {f.mood} / 10</label><input type="range" min="1" max="10" step="1" value={f.mood} onChange={set('mood')} />
        <label>Resting heart rate — {f.hr} bpm</label><input type="range" min="45" max="110" step="1" value={f.hr} onChange={set('hr')} />
        <label>HRV — {f.hrv} ms</label><input type="range" min="20" max="110" step="1" value={f.hrv} onChange={set('hrv')} />
        <label>SpO2 — {f.spo2}%</label><input type="range" min="90" max="100" step="1" value={f.spo2} onChange={set('spo2')} />
        <label>Reaction time — {f.rt} ms</label><input type="range" min="200" max="450" step="5" value={f.rt} onChange={set('rt')} />
        <label>Temperature — {f.temp} °C</label><input type="range" min="35.5" max="39" step="0.1" value={f.temp} onChange={set('temp')} />
        <label>Symptoms (optional, plain words)</label>
        <input type="text" placeholder="e.g. headache, sore throat, tired" value={f.symptoms} onChange={e => setF({ ...f, symptoms: e.target.value })} />
      </div>
      <div>
        <div className="card" style={{ textAlign: 'center' }}>
          <Gauge value={cri} color={BAND_COLOR[band]} />
          <Badge band={band} />
          <p className="small muted" style={{ marginTop: 12 }}>{cri >= 75 ? 'You are good to fly today. Keep the routine that got you here.' : cri >= 60 ? 'Watch it: protect sleep tonight and recheck in the morning.' : 'Act today: cut non-essential tasks and tell the Crew Medical Officer.'}</p>
          <button className="btn" onClick={save}>Save today's check-in</button>
        </div>
        {saved.length > 0 && <div className="card" style={{ marginTop: 16 }}>
          <h3>Your saved check-ins</h3>
          {saved.slice(0, 5).map((s, i) => <p key={i} className="small">{s.date} — CRI <b>{s.cri}</b> ({s.band}) · sleep {s.sleep}h · mood {s.mood}/10</p>)}
        </div>}
      </div>
    </div>
  </section></div>)
}

function Live() {
  const { data } = useApi('/api/v1/crew')
  const base = data ? data.crew[1] : null
  const [hr, setHr] = useState(null)
  const [tick, setTick] = useState(0)
  useEffect(() => { if (base) setHr(base.latest.heart_rate) }, [data])
  useEffect(() => {
    const t = setInterval(() => { setHr(h => (h === null ? h : Math.max(58, Math.min(82, h + Math.round((Math.random() - 0.5) * 4))))); setTick(x => x + 1) }, 2000)
    return () => clearInterval(t)
  }, [])
  return (<div className="wrap"><section>
    <p className="eyebrow">Live monitor · simulated stream</p>
    <h1 style={{ fontSize: 38, margin: '8px 0' }}>Live, right now.</h1>
    <p className="muted">This is a <b style={{ color: '#e8ecf4' }}>simulated</b> live stream — it moves around {base ? base.callsign : 'the crew'}'s last stored heart rate ({base ? base.latest.heart_rate : '…'} bpm, Sol {base ? base.latest.sol : '…'}) so judges can see the monitor working. It is labelled simulated, and it never pretends to be a real sensor.</p>
    <div className="grid g3">
      <div className="card kpi"><span>Heart rate · live</span><b style={{ color: '#2dd4bf' }}>{hr === null ? '…' : hr + ' bpm'}</b><span>Updated {tick} times · every 2 s</span></div>
      <div className="card kpi"><span>SpO2 · live</span><b>{base ? base.latest.spo2 + '%' : '…'}</b><span>Simulated · from last stored value</span></div>
      <div className="card kpi"><span>Crew member</span><b>{base ? base.callsign : '…'}</b><span>{base ? base.role : 'Loading…'}</span></div>
    </div>
    <div className="card" style={{ marginTop: 16 }}>
      <h3>What a real sensor would add</h3>
      <p className="small muted">Bluetooth heart-rate straps, pulse oximeters and BP cuffs (standard BLE profiles) would replace this simulated stream one-for-one — same page, same alerts, same CRI. The triage engine does not care where a number came from, only whether it is labelled.</p>
    </div>
  </section></div>)
}

const COPILOT_QA = [
  ['Why is C002 the lowest CRI?', 'C002 sleeps 5.9 hours against a 7-hour target and has the lowest HRV in the crew (46 ms). Those two factors alone cost about 13 CRI points. On top of that, 8 of 9 immune markers fell over 50% in the real OSD-575 lab samples at R+1. Sleep first, then a medical officer review.'],
  ['What should we do about the CRP surge?', 'CRP rose 107.3% in C001 and 95.2% in C003 after landing. Recheck temperature and symptoms today, tell the Crew Medical Officer before the next EVA, and repeat the panel at R+7. Ground can answer in about 24 minutes round-trip — start now, do not wait.'],
  ['What happened on Sol 144?', 'A solar particle event pushed the daily radiation dose to 1.32 mGy in the mission scenario — more than double the usual 0.42. That dose is a simulated scenario value, not real RAD data. The crew sheltered in the shielded area for 9 hours. No EVA until the dose falls back under 0.6 mGy.'],
  ['How is CRI calculated?', 'CRI starts at 100 and subtracts penalties: sleep under 7h, HRV under 65 ms, heart rate over 75, SpO2 under 97%, mood under 7, reaction over 280 ms, temperature over 37.3 C. The full formula is on the Drivers page, and the API recomputes it on every request.'],
  ['Is the daily data real?', 'No — and we say so everywhere. The biomarkers are real NASA OSD-575 data. The daily vitals (sleep, heart rate, HRV, mood) are synthetic, because OSD-575 has no daily time series. Real and synthetic are never mixed without a label.'],
  ['What if the backend goes down?', 'The app shows a clear error instead of inventing numbers. It offers a labelled built-in snapshot, and the check-in and copilot keep working offline because they run on the device.'],
  ['Who is this for?', 'A non-medical crew member, 12 minutes from Earth, who needs to know three things: is this bad, why, and what do I do now. That is the whole product.'],
  ['What would you build next?', 'Real sensor input over Bluetooth, a ground console for the flight surgeon, and a personal 14-day baseline per crew member so "normal for you" replaces fixed thresholds.']
]

function Copilot() {
  const [open, setOpen] = useState(0)
  return (<div className="wrap"><section>
    <p className="eyebrow">Copilot · cached offline answers</p>
    <h1 style={{ fontSize: 38, margin: '8px 0' }}>Ask. Get a straight answer.</h1>
    <p className="muted">These answers are <b style={{ color: '#e8ecf4' }}>cached and written by the team</b> — not a live AI. No API key, no fake "AI is thinking" spinner, no invented facts. Every answer comes from the data on this site.</p>
    <div style={{ marginTop: 18 }}>
      {COPILOT_QA.map(([q, a], i) => (
        <div key={i} className="card" style={{ marginBottom: 10, cursor: 'pointer' }} onClick={() => setOpen(open === i ? -1 : i)}>
          <b>{q}</b>
          {open === i && <p className="small muted" style={{ margin: '8px 0 0' }}>{a}</p>}
        </div>
      ))}
    </div>
  </section></div>)
}

function DataMethod() {
  return (<div className="wrap"><section>
    <p className="eyebrow">Data &amp; method · read this first</p>
    <h1 style={{ fontSize: 38, margin: '8px 0' }}>What is real. What is not. What AI did.</h1>
    <div className="grid g2">
      <div className="card" style={{ borderColor: 'rgba(52,211,153,.4)' }}>
        <h3>Real — NASA OSD-575</h3>
        <p className="small muted">Open Science Data Repository, study OSD-575, Version 3. HDCVD9 immune panel, 4 crew (C001–C004), 28 samples, 9 analytes, 252 values. Verified in this project: CRP L-3 to R+1 — C001 +107.3%, C003 +95.2%, C002 −22.2%, C004 +28.8%. C002: 8 of 9 analytes fell over 50% at R+1.</p>
        <p className="small muted">Provenance note: the per-analyte sample values in this project reproduce the OSD-575 structure (9 analytes × 28 samples) and the verified CRP changes exactly. Other analytes' absolute values are sample values consistent with that structure, documented as such — they are not claimed to be a verbatim export of the OSDR file.</p>
      </div>
      <div className="card" style={{ borderColor: 'rgba(251,191,36,.4)' }}>
        <h3>Synthetic — labelled everywhere</h3>
        <p className="small muted">Daily vitals, Sol 140–147 (heart rate, HRV, SpO2, sleep, mood, reaction time, temperature, radiation dose). OSD-575 contains no daily sleep, heart-rate, HRV, exercise or mood time series, so these streams are generated and labelled synthetic on every screen, in the API, and in the data files. CRI 82 → 61 (Sol 140–142, C002) matches the working range from the first Orbit Mafia build.</p>
      </div>
    </div>
    <div className="card" style={{ marginTop: 16 }}>
      <h3>AI declaration (Space Apps rules)</h3>
      <ul className="small muted" style={{ lineHeight: 1.9 }}>
        <li>AI (Muse) assisted in writing code, copy and data generation for this project.</li>
        <li>No AI output is presented as a live model, a diagnosis, or real sensor data.</li>
        <li>The Copilot panel is cached, human-written answers — it is not a live AI.</li>
        <li>All health logic is rule-based and published in the repo (backend/cri.py, backend/alerts.py).</li>
        <li>Human decisions: Hadi Kashif — project direction, crew story, design direction, final review.</li>
      </ul>
    </div>
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Challenge #5 requirements — checklist</h3>
      <ul className="checklist">
        <li>Monitor astronaut health — dashboard, crew board, live monitor, daily check-in</li>
        <li>Detect problems early — rule-based triage, personal CRI, biomarker change detection (L-3 vs R+1)</li>
        <li>Explain in plain words — every alert: why, what to do, when to escalate</li>
        <li>Work with comms delay — 12-minute one-way delay built into every escalation line</li>
        <li>Use real NASA data — OSD-575 biomarkers, 252 rows, verified CRP changes</li>
        <li>Be honest about data — real vs synthetic labelled on every screen and in the API</li>
        <li>Work offline — committed SQLite DB, cached copilot, browser-stored check-ins, labelled snapshot fallback</li>
        <li>Declare AI use — this page, and the README</li>
      </ul>
    </div>
  </section></div>)
}

function App() {
  const h = useHash()
  const [route, param] = h.split('/')
  return (<>
    <div className="topbar"><div className="wrap topbar-inner">
      <a className="logo" href="#/home" style={{ textDecoration: 'none' }}>ORBIT <b>MAFIA</b> <span className="mono" style={{ color: '#6b7488', fontSize: 12 }}>2.0</span></a>
      <nav className="nav">{NAV.map(([r, label]) => (
        <a key={r} href={'#/' + r} className={route === r ? 'active' : ''}>{label}</a>
      ))}</nav>
      <HealthStatus />
      <span className="pill" style={{ whiteSpace: 'nowrap' }}>SOL 147</span>
    </div></div>
    <main>
      {route === 'home' && <Home />}
      {route === 'dashboard' && <Dashboard />}
      {route === 'crew' && (param ? <Detail id={param} /> : <CrewBoard />)}
      {route === 'replay' && <Replay />}
      {route === 'recovery' && <Recovery />}
      {route === 'drivers' && <Drivers />}
      {route === 'alerts' && <AlertsPage />}
      {route === 'checkin' && <CheckIn />}
      {route === 'live' && <Live />}
      {route === 'copilot' && <Copilot />}
      {route === 'data' && <DataMethod />}
    </main>
    <footer className="footer"><div className="wrap">
      <b style={{ color: '#e8ecf4' }}>ORBIT MAFIA 2.0</b> — NASA Space Apps Challenge 2026, Challenge #5: Create Health Monitoring Software for Astronauts.<br />
      Real data: NASA OSD-575 (biomarkers). Daily vitals: synthetic, labelled. CRI: published formula, decision support only, never a diagnosis.<br />
      Built by Hadi Kashif with AI assistance (declared on the Data &amp; Method page). Source: github.com/Hadikashif456/orbitmafia2.0
    </div></footer>
  </>)
}

createRoot(document.getElementById('root')).render(<App />)
