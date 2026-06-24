import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchScoreboard } from '../api'
import type { ActiveRegistration, ScoreboardEntry } from '../api'
import { useSSE } from '../useSSE'

const ACCENT = '#6cf0c2'

type Props = { reg: ActiveRegistration }

function formatPoints(pts: number) {
  return pts === Math.floor(pts) ? pts.toString() : pts.toFixed(1)
}

export function ScoreboardPage({ reg }: Props) {
  const qc = useQueryClient()
  const slug = reg.competition.slug
  const myRegId = reg.registration.id
  const myCategoryId = reg.registration.categoryId ?? ''
  const myRowRef = useRef<HTMLTableRowElement>(null)
  const scrolledRef = useRef(false)

  const { data, isLoading } = useQuery({
    queryKey: ['athlete-scoreboard', slug],
    queryFn: () => fetchScoreboard(slug),
    refetchInterval: 30_000,
  })

  // Category selection — default to athlete's own category
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  useEffect(() => {
    if (data && selectedCatId === null) {
      // Try by categoryId first (manual categories), then fall back to finding
      // the board that actually contains this athlete (gender-based categories
      // store null categoryId on the registration)
      let myBoard = myCategoryId
        ? data.categories.find(c => c.category.id === myCategoryId)
        : data.categories.find(c => c.category.id === '')
      if (!myBoard) {
        myBoard = data.categories.find(c =>
          c.athletes.some(a => a.registration.id === myRegId)
        )
      }
      setSelectedCatId(myBoard?.category.id ?? data.categories[0]?.category.id ?? null)
    }
  }, [data, selectedCatId, myCategoryId, myRegId])

  // SSE with reconnect
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['athlete-scoreboard', slug] })
  }, [qc, slug])
  useSSE(`/api/v1/scoreboard/${slug}/stream`, invalidate)

  // Scroll to own row when switching back to own category
  useEffect(() => {
    scrolledRef.current = false
  }, [selectedCatId])

  const myActualCatId = data?.categories.find(c =>
    myCategoryId
      ? c.category.id === myCategoryId
      : c.athletes.some(a => a.registration.id === myRegId)
  )?.category.id ?? data?.categories[0]?.category.id

  useEffect(() => {
    if (data && myRowRef.current && !scrolledRef.current && selectedCatId === myActualCatId) {
      scrolledRef.current = true
      myRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [data, selectedCatId, myActualCatId])

  const activeBoard = data?.categories.find(c => c.category.id === selectedCatId)
    ?? data?.categories[0]

  const hasPoints = (data?.scoringConfig.length ?? 0) > 0
  const hasZone = data?.scoringConfig.some(c =>
    c.eventType === 'ZONE' || c.eventType === 'ZONE_1' || c.eventType === 'ZONE_2'
  ) ?? false

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7890',
    borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap',
  }

  function rankColor(rank: number | null) {
    if (rank === 1) return '#ffd700'
    if (rank === 2) return '#c0c0c0'
    if (rank === 3) return '#cd7f32'
    return '#e8ecf3'
  }

  function renderRow(entry: ScoreboardEntry, isMe: boolean) {
    const td: React.CSSProperties = {
      padding: '13px 12px', fontSize: 15,
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      color: isMe ? '#e8ecf3' : '#c8cdd8',
    }
    return (
      <tr
        key={entry.registration.id}
        ref={isMe ? myRowRef : undefined}
        style={{
          background: isMe ? 'rgba(108,240,194,0.10)' : 'transparent',
          borderLeft: isMe ? `3px solid ${ACCENT}` : '3px solid transparent',
        }}
      >
        <td style={{ ...td, fontWeight: 700, fontSize: 16, color: rankColor(entry.rank), textAlign: 'center', width: 48 }}>
          {entry.rank ?? '—'}
        </td>
        <td style={{ ...td, fontWeight: isMe ? 700 : 500 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {entry.registration.startNumber && (
              <span style={{ fontSize: 11, color: '#6b7890', flexShrink: 0 }}>
                #{entry.registration.startNumber}
              </span>
            )}
            <span>{entry.athlete.lastName}, {entry.athlete.firstName}</span>
            {isMe && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                background: 'rgba(108,240,194,0.2)', color: ACCENT,
                letterSpacing: '0.06em', flexShrink: 0,
              }}>ICH</span>
            )}
          </div>
        </td>
        <td style={{ ...td, textAlign: 'center', color: isMe ? ACCENT : '#6cf0c2aa', fontWeight: 700 }}>
          {entry.toppedCount > 0 ? entry.toppedCount : <span style={{ color: '#3a4060' }}>—</span>}
        </td>
        {hasZone && (
          <td style={{ ...td, textAlign: 'center', color: isMe ? '#ffc400' : '#ffc400aa', fontWeight: 700 }}>
            {entry.zonedCount > 0 ? entry.zonedCount : <span style={{ color: '#3a4060' }}>—</span>}
          </td>
        )}
        {hasPoints && (
          <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: isMe ? '#e8ecf3' : '#a6b0c3' }}>
            {entry.totalPoints > 0 ? formatPoints(entry.totalPoints) : <span style={{ color: '#3a4060' }}>—</span>}
          </td>
        )}
      </tr>
    )
  }

  const categories = data?.categories ?? []
  const showCategoryPicker = categories.length > 1

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0f1e 0%, #16443a 100%)',
        borderBottom: '1px solid rgba(108,240,194,0.15)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ padding: '20px 16px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: ACCENT, marginBottom: 4 }}>
            Rangliste · {reg.competition.name}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {activeBoard?.category.name ?? 'Alle Kategorien'}
          </div>
        </div>

        {/* Category picker */}
        {showCategoryPicker && (
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 12px',
            scrollbarWidth: 'none',
          }}>
            {categories.map(board => {
              const isActive = board.category.id === selectedCatId
              const isMycat = board.category.id === myActualCatId
              return (
                <button
                  key={board.category.id}
                  onClick={() => setSelectedCatId(board.category.id)}
                  style={{
                    flexShrink: 0,
                    padding: '6px 14px',
                    borderRadius: 999,
                    border: isActive
                      ? `1.5px solid ${ACCENT}`
                      : '1.5px solid rgba(255,255,255,0.12)',
                    background: isActive ? 'rgba(108,240,194,0.12)' : 'rgba(255,255,255,0.04)',
                    color: isActive ? ACCENT : '#a6b0c3',
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.15s',
                  }}
                >
                  {board.category.name}
                  {isMycat && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: isActive ? ACCENT : 'rgba(108,240,194,0.5)',
                      flexShrink: 0,
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ padding: 24, color: '#a6b0c3', fontSize: 14 }}>Lädt…</div>
      ) : !activeBoard || activeBoard.athletes.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#a6b0c3', fontSize: 14 }}>
          Noch keine Wertungen vorhanden.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'center', width: 48 }}>Pl.</th>
                <th style={thStyle}>Athlet</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Tops</th>
                {hasZone && <th style={{ ...thStyle, textAlign: 'center' }}>Zonen</th>}
                {hasPoints && <th style={{ ...thStyle, textAlign: 'right' }}>Pkt.</th>}
              </tr>
            </thead>
            <tbody>
              {activeBoard.athletes.map(entry =>
                renderRow(entry, entry.registration.id === myRegId)
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ height: 80 }} />
    </div>
  )
}
