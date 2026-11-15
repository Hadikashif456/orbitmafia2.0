import React from 'react'

export function LineChart({ points, color = '#2dd4bf', height = 180, label = '' }) {
  const W = 640, H = height, P = 28
  const xs = points.map(p => p.x), ys = points.map(p => p.y)
  const xmin = Math.min(...xs), xmax = Math.max(...xs)
  const ymin = Math.min(...ys, 0), ymax = Math.max(...ys)
  const X = x => P + ((x - xmin) / (xmax - xmin || 1)) * (W - 2 * P)
  const Y = y => H - P - ((y - ymin) / (ymax - ymin || 1)) * (H - 2 * P)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')
  const area = `${line} L${X(points[points.length - 1].x).toFixed(1)},${H - P} L${X(points[0].x).toFixed(1)},${H - P} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={label}>
      <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={P} x2={W - P} y1={H * f} y2={H * f} stroke="#ffffff" strokeOpacity="0.06" />
      ))}
      <path d={area} fill="url(#lg)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}><circle cx={X(p.x)} cy={Y(p.y)} r="4" fill="#05070d" stroke={color} strokeWidth="2" />
          <text x={X(p.x)} y={H - 6} fontSize="11" fill="#8b93a7" textAnchor="middle">{p.label}</text>
          <text x={X(p.x)} y={Y(p.y) - 10} fontSize="11" fill="#e8ecf4" textAnchor="middle">{p.y}</text></g>
      ))}
    </svg>
  )
}

export function Gauge({ value, color }) {
  const r = 78, c = 2 * Math.PI * r, frac = Math.max(0, Math.min(1, value / 100))
  return (
    <div style={{ position: 'relative', width: 190, height: 190, margin: '0 auto' }}>
      <svg viewBox="0 0 200 200" style={{ width: '100%' }}>
        <circle cx="100" cy="100" r={r} fill="none" stroke="#1c2436" strokeWidth="14" />
        <circle cx="100" cy="100" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 100 100)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 44, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 12, color: '#8b93a7', letterSpacing: '0.18em' }}>CRI / 100</span>
      </div>
    </div>
  )
}

export function HBar({ label, value, max, color, suffix = '%' }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span>{label}</span><span className="mono">{value}{suffix}</span>
      </div>
      <div style={{ height: 8, background: '#1c2436', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.abs(value) / max * 100)}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
    </div>
  )
}
