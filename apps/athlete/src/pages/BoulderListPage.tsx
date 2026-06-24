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

function CrossCircleIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function Toggle({ active, label, color, onClick }: {
  active: boolean; label: React.ReactNode; color: string; onClick: () => void
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
        display: 'flex', alignItems: 'center', gap: 5,
      }}
    >
      {active && <span>✓</span>}{label}
    </button>
  )
}

// "Keine Wertung" = attempts=1, topped=false, zoned=false
// Distinct from attempts=0 (not yet tried)
function isKeineWertung(score: Score | undefined) {
  return !!score && score.attempts > 0 && !score.topped && !score.zoned
}

type BoulderState = 'none' | 'zone' | 'top' | 'keineWertung'

function RouteCard({ route, score, registrationId, athleteId, onSave }: {
  route: { id: string; routeNumber: string; name: string | null; grade: string | null }
  score: Score | undefined
  registrationId: string
  athleteId: string
  onSave: (s: Score) => void
}) {
  const initState = (): BoulderState =>
    score?.topped ? 'top' : score?.zoned ? 'zone' : (score?.attempts ?? 0) > 0 ? 'keineWertung' : 'none'

  const [state, setState] = useState<BoulderState>(initState)
  const [attempts, setAttempts] = useState(score?.attempts ?? 0)
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

  const applyState = (next: BoulderState, currentAttempts: number) => {
    setState(next)
    switch (next) {
      case 'top': {
        const a = Math.max(1, currentAttempts)
        setAttempts(a)
        save(a, true, true)
        break
      }
      case 'zone': {
        const a = Math.max(1, currentAttempts)
        setAttempts(a)
        save(a, false, true)
        break
      }
      case 'keineWertung':
        setAttempts(1)
        save(1, false, false)
        break
      case 'none':
        setAttempts(0)
        save(0, false, false)
        break
    }
  }

  const handleTopped = () => applyState(state === 'top' ? 'none' : 'top', attempts)
  const handleZoned = () => applyState(state === 'zone' ? 'none' : 'zone', attempts)
  const handleKeineWertung = () => applyState(state === 'keineWertung' ? 'none' : 'keineWertung', attempts)
  const handleAttempts = (v: number) => {
    setAttempts(v)
    save(v, state === 'top', state === 'zone' || state === 'top')
  }

  const name = route.name ?? `Boulder ${route.routeNumber}`

  const cardBg = state === 'top'
    ? 'rgba(108,240,194,0.06)' : state === 'zone'
    ? 'rgba(255,196,0,0.06)' : state === 'keineWertung'
    ? 'rgba(255,93,107,0.05)' : 'rgba(255,255,255,0.04)'

  const cardBorder = state === 'top'
    ? 'rgba(108,240,194,0.3)' : state === 'zone'
    ? 'rgba(255,196,0,0.25)' : state === 'keineWertung'
    ? 'rgba(255,93,107,0.2)' : 'rgba(255,255,255,0.1)'

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${cardBorder}`,
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

        {/* Zeile 1 rechts: Versuche-Label (ausgeblendet bei Keine Wertung) */}
        {state !== 'keineWertung'
          ? <span style={{ fontSize: 11, color: '#a6b0c3', textAlign: 'center' }}>Versuche</span>
          : <span />
        }

        {/* Zeile 2 links: ZONE · TOP · ✕ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Toggle active={state === 'zone'} label="ZONE" color="#ffc400" onClick={handleZoned} />
          <Toggle active={state === 'top'} label="TOP" color={ACCENT} onClick={handleTopped} />
          <Toggle active={state === 'keineWertung'} label={<CrossCircleIcon size={15} color={state === 'keineWertung' ? '#ff5d6b' : '#a6b0c3'} />} color="#ff5d6b" onClick={handleKeineWertung} />
        </div>

        {/* Zeile 2 rechts: Versuchszähler (ausgeblendet bei Keine Wertung) */}
        {state !== 'keineWertung'
          ? <Counter value={attempts} onChange={handleAttempts} />
          : <span />
        }
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
  const keineWertungCount = routes.filter(r => isKeineWertung(scoreMap[r.id])).length

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>
      <Header reg={reg} />

      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13 }}>
            <span style={{ color: ACCENT, fontWeight: 700 }}>{topped}</span>
            <span style={{ color: '#a6b0c3' }}> / {routes.length} TOP</span>
          </span>
          <span style={{ fontSize: 13 }}>
            <span style={{ color: '#ffc400', fontWeight: 700 }}>{zoned}</span>
            <span style={{ color: '#a6b0c3' }}> ZONE</span>
          </span>
          {keineWertungCount > 0 && (
            <span style={{ fontSize: 13 }}>
              <span style={{ color: '#ff5d6b', fontWeight: 700 }}>{keineWertungCount}</span>
              <span style={{ color: '#a6b0c3' }}> Keine Wertung</span>
            </span>
          )}
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
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#4a5568' }}>
          <CrossCircleIcon size={12} color="#4a5568" />
          <span>= Keine Wertung (Boulder versucht, keine Zone/Top)</span>
        </div>
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
