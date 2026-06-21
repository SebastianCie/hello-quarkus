import { useState, useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { keycloak } from './auth/keycloak'
import { fetchMe } from './api'
import type { ActiveRegistration } from './api'
import { BoulderListPage } from './pages/BoulderListPage'
import { CompetitionSelectPage } from './pages/CompetitionSelectPage'
import { ScoreboardPage } from './pages/ScoreboardPage'

const queryClient = new QueryClient()

const ACCENT = '#6cf0c2'
const DARK = '#020231'

// ── Login Screen ─────────────────────────────────────────────────────────────

function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: ACCENT, marginBottom: 24 }}>
        Beta Battle
      </div>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🧗</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Athleten-App</h1>
      <p style={{ color: '#a6b0c3', fontSize: 14, textAlign: 'center', marginBottom: 32, maxWidth: 300, lineHeight: 1.6 }}>
        Melde dich mit deinem Beta Battle-Konto an, um deine Wettkampfergebnisse einzutragen.
      </p>
      <button
        onClick={() => keycloak.login({ redirectUri: window.location.href })}
        style={{
          padding: '15px 32px', borderRadius: 12,
          background: ACCENT, color: DARK,
          border: 'none', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', width: '100%', maxWidth: 320,
        }}
      >
        Anmelden
      </button>
    </div>
  )
}

// ── No Active Competition ─────────────────────────────────────────────────────

function NoCompetitionPage({ firstName }: { firstName: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏔️</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Hallo, {firstName}!</h1>
      <p style={{ color: '#a6b0c3', fontSize: 14, textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
        Du bist aktuell für keinen aktiven Wettkampf angemeldet.
      </p>
    </div>
  )
}

// ── No Profile Page ───────────────────────────────────────────────────────────

function NoProfilePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🪪</div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Kein Athletenprofil</h1>
      <p style={{ color: '#a6b0c3', fontSize: 14, textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
        Du hast noch kein Athletenprofil. Melde dich über den QR-Code einer Veranstaltung an.
      </p>
      <button
        onClick={() => keycloak.logout()}
        style={{
          marginTop: 24, padding: '12px 24px', borderRadius: 10,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#a6b0c3', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Abmelden
      </button>
    </div>
  )
}

// ── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({ name }: { name: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(2,2,49,0.92)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', height: 48,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT }}>
        Beta Battle
      </span>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 20, padding: '5px 12px 5px 8px',
            color: '#e8ecf3', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
          }}
        >
          <span style={{
            width: 24, height: 24, borderRadius: '50%',
            background: ACCENT, color: DARK,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {name.charAt(0).toUpperCase()}
          </span>
          {name}
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            background: '#0e1432', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, overflow: 'hidden', minWidth: 160,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            <button
              onClick={() => keycloak.logout({ redirectUri: window.location.origin })}
              style={{
                width: '100%', padding: '12px 16px', background: 'none',
                border: 'none', color: '#ff5d6b', fontSize: 14,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span>↩</span> Abmelden
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────

type Tab = 'boulder' | 'rangliste'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'boulder',
    label: 'Boulder',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'rangliste',
    label: 'Rangliste',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="13" width="5" height="9" rx="1" />
        <rect x="9.5" y="8" width="5" height="14" rx="1" />
        <rect x="17" y="10" width="5" height="12" rx="1" />
      </svg>
    ),
  },
]

function BottomTabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(2,2,49,0.97)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      height: 57,
    }}>
      {TABS.map(tab => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: isActive ? ACCENT : '#6b7890',
              fontFamily: 'inherit',
              borderTop: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
              transition: 'color 0.15s',
              paddingBottom: 2,
            }}
          >
            {tab.icon}
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, letterSpacing: '0.04em' }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Swipe hook ────────────────────────────────────────────────────────────────

function useSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null || startY.current === null) return
      const dx = e.changedTouches[0].clientX - startX.current
      const dy = e.changedTouches[0].clientY - startY.current
      // Only trigger if horizontal swipe is dominant and long enough
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) onLeft()
        else onRight()
      }
      startX.current = null
      startY.current = null
    },
  }
}

// ── Competition Shell (with tabs) ────────────────────────────────────────────

function CompetitionShell({ reg }: { reg: ActiveRegistration }) {
  const [tab, setTab] = useState<Tab>('boulder')

  const swipe = useSwipe(
    () => setTab('rangliste'),   // swipe left → rangliste
    () => setTab('boulder'),     // swipe right → boulder
  )

  return (
    <div style={{ paddingTop: 48, paddingBottom: 57 }} {...swipe}>
      {tab === 'boulder'
        ? <BoulderListPage reg={reg} />
        : <ScoreboardPage reg={reg} />
      }
      <BottomTabBar active={tab} onChange={setTab} />
    </div>
  )
}

// ── Authenticated Shell ───────────────────────────────────────────────────────

function AuthenticatedApp() {
  const [selectedReg, setSelectedReg] = useState<ActiveRegistration | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
  })

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a6b0c3', fontSize: 14 }}>
        Lädt…
      </div>
    )
  }

  if (isError) {
    const is404 = error instanceof Error && error.message.includes('404')
    if (is404) return <NoProfilePage />
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff5d6b', fontSize: 14, padding: 24, textAlign: 'center' }}>
        Verbindung zur API nicht möglich.<br />
        <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e8ecf3', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
          Neu laden
        </button>
      </div>
    )
  }

  if (!data) return null

  const { athlete, registrations } = data
  const fullName = `${athlete.firstName} ${athlete.lastName}`

  if (registrations.length === 0) {
    return (
      <>
        <TopBar name={fullName} />
        <div style={{ paddingTop: 48 }}><NoCompetitionPage firstName={athlete.firstName} /></div>
      </>
    )
  }

  const active = selectedReg ?? (registrations.length === 1 ? registrations[0] : null)

  if (!active) {
    return (
      <>
        <TopBar name={fullName} />
        <div style={{ paddingTop: 48 }}>
          <CompetitionSelectPage
            firstName={athlete.firstName}
            registrations={registrations}
            onSelect={setSelectedReg}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar name={fullName} />
      <CompetitionShell reg={active} />
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

function Root() {
  const [kcReady, setKcReady] = useState(false)
  const [kcAuthenticated, setKcAuthenticated] = useState(false)

  useEffect(() => {
    keycloak.init({ onLoad: 'check-sso', checkLoginIframe: false })
      .then(authenticated => {
        setKcAuthenticated(authenticated)
        setKcReady(true)
        if (authenticated) {
          setInterval(() => keycloak.updateToken(30).catch(() => {}), 30_000)
        }
      })
      .catch(() => setKcReady(true))
  }, [])

  if (!kcReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a6b0c3', fontSize: 14 }}>
        Lädt…
      </div>
    )
  }

  if (!kcAuthenticated) return <LoginPage />

  return <AuthenticatedApp />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  )
}
