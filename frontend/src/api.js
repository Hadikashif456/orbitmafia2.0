// API client. NEVER silently falls back to mock data.
// If the backend is unreachable, every page shows a clear error state and
// offers an EXPLICIT, labelled built-in snapshot button instead.
const BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function api(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`)
  return res.json()
}

export const BAND_COLOR = { EXCELLENT: '#34d399', GOOD: '#2dd4bf', WATCH: '#fbbf24', ACT: '#fb923c', URGENT: '#f87171' }
export const LEVEL_COLOR = { WATCH: '#fbbf24', ACT: '#fb923c', URGENT: '#f87171' }
