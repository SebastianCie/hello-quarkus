import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { fetchScoreboard, fetchSettings, type AthleteEntry, type CategoryBoard, type ScoreboardData } from './api'
import { useSSE } from './useSSE'

const ACCENT = '#6cf0c2'
const DARK = '#020231'

// ── Page model ────────────────────────────────────────────────────────────────

type Page = {
  category: { id: string; name: string }
  athletes: AthleteEntry[]
  pageNum: number      // 1-based within category
  totalPages: number   // total pages for this category
}

function buildPages(data: ScoreboardData, perPage: number): Page[] {
  const pages: Page[] = []
  for (const board of data.categories) {
    const chunks = chunkAthletes(board, perPage)
    chunks.forEach((chunk, i) => {
      pages.push({
        category: board.category,
        athletes: chunk,
        pageNum: i + 1,
        totalPages: chunks.length,
      })
    })
  }
  return pages
}

function chunkAthletes(board: CategoryBoard, perPage: number): AthleteEntry[][] {
  const result: AthleteEntry[][] = []
  for (let i = 0; i < board.athletes.length; i += perPage) {
    result.push(board.athletes.slice(i, i + perPage))
  }
  return result.length > 0 ? result : [[]]
}

function calcDynamicPerPage(): number {
  const headerH = 88   // top bar
  const footerH = 44   // progress bar + footer
  const tableHeadH = 48
  const rowH = 58
  const padding = 32
  const available = window.innerHeight - headerH - footerH - tableHeadH - padding
  return Math.max(3, Math.floor(available / rowH))
}

// ── Score display helpers ─────────────────────────────────────────────────────

function hasZone(data: ScoreboardData) {
  return data.scoringConfig.some(c => c.eventType === 'ZONE' || c.eventType === 'ZONE_1' || c.eventType === 'ZONE_2')
}

function hasScoringConfig(data: ScoreboardData) {
  return data.scoringConfig.length > 0
}

function scoredCount(entry: AthleteEntry) {
  return entry.scores.filter(s => s.attempts > 0).length
}

function formatPoints(pts: number) {
  return pts === Math.floor(pts) ? pts.toString() : pts.toFixed(1)
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ intervalMs, pageKey }: { intervalMs: number; pageKey: string }) {
  return (
    <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', width: '100%' }}>
      <div
        key={pageKey}
        style={{
          height: '100%',
          background: ACCENT,
          width: '100%',
          transformOrigin: 'left',
          animation: `shrink ${intervalMs}ms linear forwards`,
        }}
      />
      <style>{`@keyframes shrink { from { transform: scaleX(1) } to { transform: scaleX(0) } }`}</style>
    </div>
  )
}

// ── Scoreboard table ─────────────────────────────────────────────────────────

function ScoreTable({ page, data }: { page: Page; data: ScoreboardData }) {
  const showZone = hasZone(data)
  const showPoints = hasScoringConfig(data)

  const thStyle: React.CSSProperties = {
    padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7890',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  }
  const tdStyle: React.CSSProperties = {
    padding: '14px 16px', fontSize: 18, borderBottom: '1px solid rgba(255,255,255,0.05)',
  }
  const numStyle: React.CSSProperties = { ...tdStyle, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, width: 64, textAlign: 'center' }}>Platz</th>
          <th style={thStyle}>Athlet</th>
          <th style={{ ...thStyle, textAlign: 'center' }}>Tops</th>
          {showZone && <th style={{ ...thStyle, textAlign: 'center' }}>Zonen</th>}
          {showPoints && <th style={{ ...thStyle, textAlign: 'right' }}>Punkte</th>}
          {data.totalRoutes > 0 && <th style={{ ...thStyle, textAlign: 'center' }}>Bewertet</th>}
        </tr>
      </thead>
      <tbody>
        {page.athletes.map((entry, i) => {
          const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
          const rankColor = entry.rank === 1 ? '#ffd700' : entry.rank === 2 ? '#c0c0c0' : entry.rank === 3 ? '#cd7f32' : '#e8ecf3'
          const scored = scoredCount(entry)

          return (
            <tr key={entry.registration.id} style={{ background: rowBg }}>
              <td style={{ ...numStyle, fontWeight: 700, fontSize: 20, color: rankColor }}>
                {entry.rank ?? '—'}
              </td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {entry.registration.startNumber && (
                    <span style={{ fontSize: 13, color: '#6b7890', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>
                      #{entry.registration.startNumber}
                    </span>
                  )}
                  <span style={{ fontWeight: 600 }}>
                    {entry.athlete.lastName}, {entry.athlete.firstName}
                  </span>
                </div>
              </td>
              <td style={{ ...numStyle, color: ACCENT, fontWeight: 700 }}>
                {entry.toppedCount > 0 ? entry.toppedCount : <span style={{ color: '#6b7890' }}>—</span>}
              </td>
              {showZone && (
                <td style={{ ...numStyle, color: '#ffc400', fontWeight: 700 }}>
                  {entry.zonedCount > 0 ? entry.zonedCount : <span style={{ color: '#6b7890' }}>—</span>}
                </td>
              )}
              {showPoints && (
                <td style={{ ...numStyle, textAlign: 'right', fontWeight: 700, color: entry.totalPoints > 0 ? '#e8ecf3' : '#6b7890', fontSize: 20 }}>
                  {entry.totalPoints > 0 ? formatPoints(entry.totalPoints) : '—'}
                </td>
              )}
              {data.totalRoutes > 0 && (
                <td style={{ ...numStyle, fontSize: 15 }}>
                  <span style={{ color: scored === data.totalRoutes ? ACCENT : '#a6b0c3', fontWeight: scored > 0 ? 600 : 400 }}>
                    {scored}
                  </span>
                  <span style={{ color: '#4a5568' }}> / {data.totalRoutes}</span>
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────

export function App() {
  const { slug, roundSlug } = useParams<{ slug: string; roundSlug?: string }>()
  const [data, setData] = useState<ScoreboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [intervalMs, setIntervalMs] = useState(5000)
  const [adminPerPage, setAdminPerPage] = useState(0)
  const [pageIdx, setPageIdx] = useState(0)
  const [dynamicPerPage, setDynamicPerPage] = useState(calcDynamicPerPage)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageIdxRef = useRef(0)

  // Load settings
  useEffect(() => {
    fetchSettings().then(s => {
      const interval = parseInt(s['scoreboard_interval_seconds'] ?? '5', 10)
      const perPage = parseInt(s['scoreboard_athletes_per_page'] ?? '0', 10)
      setIntervalMs(interval * 1000)
      setAdminPerPage(perPage)
    }).catch(() => {})
  }, [])

  // Load scoreboard data
  const load = useCallback(() => {
    if (!slug) return
    fetchScoreboard(slug, roundSlug)
      .then(d => { setData(d); setError(null) })
      .catch(e => setError(e.message))
  }, [slug, roundSlug])

  useEffect(() => { load() }, [load])

  // SSE with reconnect + 30s fallback poll
  useSSE(slug ? `/api/v1/scoreboard/${slug}/stream` : '', load)
  useEffect(() => {
    if (!slug) return
    const fallback = setInterval(load, 30_000)
    return () => clearInterval(fallback)
  }, [slug, load])

  // Recalculate dynamic per-page on resize
  useEffect(() => {
    const handler = () => setDynamicPerPage(calcDynamicPerPage())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Auto-rotate pages
  const perPage = adminPerPage > 0 ? adminPerPage : dynamicPerPage
  const pages = data ? buildPages(data, perPage) : []

  useEffect(() => {
    if (pages.length === 0) return
    pageIdxRef.current = 0
    setPageIdx(0)
  }, [data?.competition.id, perPage])

  useEffect(() => {
    if (pages.length <= 1) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const next = (pageIdxRef.current + 1) % pages.length
      pageIdxRef.current = next
      setPageIdx(next)
    }, intervalMs)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [pageIdx, pages.length, intervalMs])

  // ── Render states ─────────────────────────────────────────────────────────

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
      <div style={{ fontSize: 48 }}>⚠</div>
      <div style={{ color: '#ff5d6b', fontSize: 18 }}>{error}</div>
      <button onClick={load} style={{ marginTop: 8, padding: '8px 20px', background: 'rgba(108,240,194,0.1)', border: '1px solid rgba(108,240,194,0.3)', color: ACCENT, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
        Neu laden
      </button>
    </div>
  )

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#a6b0c3', fontSize: 18 }}>
      Lädt…
    </div>
  )

  if (pages.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: ACCENT }}>{data.competition.name}</div>
      <div style={{ fontSize: 24, color: '#a6b0c3' }}>Noch keine bestätigten Anmeldungen</div>
    </div>
  )

  const currentPage = pages[Math.min(pageIdx, pages.length - 1)]
  const pageKey = `${currentPage.category.id}-${currentPage.pageNum}`
  const totalAllPages = pages.length
  const currentGlobalPage = Math.min(pageIdx, pages.length - 1) + 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0f1e 0%, #16443a 100%)',
        borderBottom: '1px solid rgba(108,240,194,0.15)',
        padding: '0 32px',
        height: 88,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: ACCENT, marginBottom: 4 }}>
            Beta Battle · {data.competition.name}
            {data.round && ` · ${data.round.name}`}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>
            {currentPage.category.name}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {currentPage.totalPages > 1 && (
            <div style={{ fontSize: 13, color: '#a6b0c3', marginBottom: 4 }}>
              Seite {currentPage.pageNum} / {currentPage.totalPages}
            </div>
          )}
          {totalAllPages > 1 && (
            <div style={{ fontSize: 12, color: '#6b7890' }}>
              {currentGlobalPage} / {totalAllPages}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 16px' }}>
        <ScoreTable key={pageKey} page={currentPage} data={data} />
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ padding: '6px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#6b7890' }}>Live</span>
          <span style={{ fontSize: 11, color: data.competition.status === 'ACTIVE' ? ACCENT : '#6b7890' }}>
            {data.competition.status === 'ACTIVE' ? '● Aktiv' : data.competition.status}
          </span>
        </div>
        {pages.length > 1 && <ProgressBar key={pageKey} intervalMs={intervalMs} pageKey={pageKey} />}
      </div>
    </div>
  )
}
