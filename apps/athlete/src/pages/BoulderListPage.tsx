import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchRoutes, fetchScores, upsertScore } from '../api'
import type { ActiveRegistration, Score } from '../api'

const ACCENT = '#6cf0c2'

type Props = { reg: ActiveRegistration }

function MapModal({ compId, onClose }: { compId: string; onClose: () => void }) {
  const url = `/api/v1/competitions/${compId}/hall-map`
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(2,2,49,0.95)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Hallenmap</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#a6b0c3', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 4 }}
        >×</button>
      </div>
      <div
        onClick={e => e.stopPropagation()}
        style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px 16px' }}
      >
        <img
          src={url}
          alt="Hallenmap"
          style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, objectFit: 'contain' }}
        />
      </div>
    </div>
  )
}

type ScoreMap = Record<string, Score>

function disciplineLabel(d: string) {
  return d === 'BOULDERING' ? 'Bouldern' : d === 'LEAD' ? 'Lead' : d
}

function Header({ reg }: Props) {
  const comp = reg.competition
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0f1e 0%, #16443a 100%)',
      padding: '20px 16px 16px',
      borderBottom: '1px solid rgba(108,240,194,0.15)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: ACCENT, marginBottom: 4 }}>
        Beta Battle · {disciplineLabel(comp.discipline)}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{comp.name}</div>
      <div style={{ fontSize: 13, color: '#a6b0c3', marginTop: 2, display: 'flex', gap: 10 }}>
        {reg.category && <span>Kategorie: {reg.category.name}</span>}
        {reg.currentRound && (
          <span style={{ color: '#6cf0c2' }}>· {reg.currentRound.name}</span>
        )}
      </div>
    </div>
  )
}

function Counter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const btn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 7,
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
    color: '#e8ecf3', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={() => onChange(Math.max(0, value - 1))} style={btn}>−</button>
      <span style={{ fontSize: 16, fontWeight: 700, minWidth: 22, textAlign: 'center' }}>{value}</span>
      <button onClick={() => onChange(value + 1)} style={btn}>+</button>
    </div>
  )
}

function Toggle({ active, label, color, onClick }: {
  active: boolean; label: string; color: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 12px', borderRadius: 8,
        border: `2px solid ${active ? color : 'rgba(255,255,255,0.15)'}`,
        background: active ? color + '22' : 'transparent',
        color: active ? color : '#a6b0c3',
        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        letterSpacing: '0.04em', transition: 'all 0.15s', flexShrink: 0,
      }}
    >
      {active ? '✓ ' : ''}{label}
    </button>
  )
}

function RouteCard({ route, score, registrationId, athleteId, onSave }: {
  route: { id: string; routeNumber: string; name: string | null; grade: string | null }
  score: Score | undefined
  registrationId: string
  athleteId: string
  onSave: (s: Score) => void
}) {
  const [attempts, setAttempts] = useState(score?.attempts ?? 0)
  const [topped, setTopped] = useState(score?.topped ?? false)
  const [zoned, setZoned] = useState(score?.zoned ?? false)
  const [saving, setSaving] = useState(false)

  const save = useCallback(async (newAttempts: number, newTopped: boolean, newZoned: boolean) => {
    setSaving(true)
    try {
      const saved = await upsertScore({
        registrationId, routeId: route.id, athleteId,
        attempts: newAttempts, topped: newTopped, zoned: newZoned,
        bonusPoints: 0,
      })
      onSave(saved)
    } finally {
      setSaving(false)
    }
  }, [registrationId, route.id, athleteId, onSave])

  const handleTopped = () => {
    const next = !topped
    setTopped(next)
    if (next && !zoned) setZoned(true)
    save(attempts, next, next ? true : zoned)
  }

  const handleZoned = () => {
    if (topped) return
    const next = !zoned
    setZoned(next)
    save(attempts, topped, next)
  }

  const handleAttempts = (v: number) => {
    setAttempts(v)
    save(v, topped, zoned)
  }

  const name = route.name ?? `Boulder ${route.routeNumber}`

  return (
    <div style={{
      background: topped ? 'rgba(108,240,194,0.06)' : zoned ? 'rgba(255,196,0,0.06)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${topped ? 'rgba(108,240,194,0.3)' : zoned ? 'rgba(255,196,0,0.25)' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: 12, padding: '10px 12px',
      opacity: saving ? 0.7 : 1, transition: 'all 0.15s',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 8, columnGap: 10, alignItems: 'center' }}>
        {/* Zeile 1 links: Nr · Name · Grad */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <span style={{ fontSize: 12, color: '#a6b0c3', flexShrink: 0 }}>#{route.routeNumber}</span>
          <span style={{
            fontSize: 14, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</span>
          {route.grade && (
            <span style={{
              fontSize: 11, padding: '1px 6px',
              background: 'rgba(255,255,255,0.1)', borderRadius: 999,
              color: '#a6b0c3', flexShrink: 0,
            }}>{route.grade}</span>
          )}
        </div>

        {/* Zeile 1 rechts: Versuche-Label zentriert über Counter */}
        <span style={{ fontSize: 11, color: '#a6b0c3', textAlign: 'center' }}>Versuche</span>

        {/* Zeile 2 links: ZONE · TOP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Toggle active={zoned} label="ZONE" color="#ffc400" onClick={handleZoned} />
          <Toggle active={topped} label="TOP" color={ACCENT} onClick={handleTopped} />
        </div>

        {/* Zeile 2 rechts: − 0 + */}
        <Counter value={attempts} onChange={handleAttempts} />
      </div>
    </div>
  )
}

export function BoulderListPage({ reg }: Props) {
  const queryClient = useQueryClient()
  const categoryId = reg.registration.categoryId
  const roundId = reg.currentRound?.id ?? null
  const [mapOpen, setMapOpen] = useState(false)

  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ['routes', reg.competition.id, categoryId, roundId],
    queryFn: () => fetchRoutes(reg.competition.id, categoryId, roundId),
  })

  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ['scores', reg.registration.id],
    queryFn: () => fetchScores(reg.registration.id),
  })

  const scoreMap: ScoreMap = {}
  if (scores) {
    for (const s of scores) scoreMap[s.routeId] = s
  }

  const handleSave = useCallback((saved: Score) => {
    queryClient.setQueryData(['scores', reg.registration.id], (old: Score[] | undefined) => {
      if (!old) return [saved]
      const idx = old.findIndex(s => s.routeId === saved.routeId)
      if (idx >= 0) { const next = [...old]; next[idx] = saved; return next }
      return [...old, saved]
    })
  }, [queryClient, reg.registration.id])

  if (routesLoading || scoresLoading) {
    return (
      <>
        <Header reg={reg} />
        <div style={{ padding: 24, color: '#a6b0c3', fontSize: 14 }}>Lädt…</div>
      </>
    )
  }

  if (!routes || routes.length === 0) {
    return (
      <>
        <Header reg={reg} />
        <div style={{ padding: 24, textAlign: 'center', color: '#a6b0c3', fontSize: 14 }}>
          Noch keine Boulder für deine Kategorie eingetragen.
        </div>
      </>
    )
  }

  const topped = routes.filter(r => scoreMap[r.id]?.topped).length
  const zoned = routes.filter(r => scoreMap[r.id]?.zoned && !scoreMap[r.id]?.topped).length

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>
      <Header reg={reg} />

      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13 }}>
          <span style={{ color: ACCENT, fontWeight: 700 }}>{topped}</span>
          <span style={{ color: '#a6b0c3' }}> / {routes.length} TOP</span>
        </span>
        <span style={{ fontSize: 13 }}>
          <span style={{ color: '#ffc400', fontWeight: 700 }}>{zoned}</span>
          <span style={{ color: '#a6b0c3' }}> ZONE</span>
        </span>
        {reg.competition.hallMapAvailable && (
          <button
            onClick={() => setMapOpen(true)}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(108,240,194,0.1)', border: '1px solid rgba(108,240,194,0.3)',
              borderRadius: 8, padding: '5px 12px', color: ACCENT,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            🗺 Hallenmap
          </button>
        )}
      </div>

      {mapOpen && <MapModal compId={reg.competition.id} onClose={() => setMapOpen(false)} />}

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {routes.map(route => (
          <RouteCard
            key={route.id}
            route={route}
            score={scoreMap[route.id]}
            registrationId={reg.registration.id}
            athleteId={reg.registration.athleteId}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  )
}
