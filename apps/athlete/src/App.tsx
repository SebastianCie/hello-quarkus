import { useState, useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { refreshAccessToken, doLogin, doLogout } from './auth/auth'
import { fetchMe } from './api'
import type { ActiveRegistration } from './api'
import { BoulderListPage } from './pages/BoulderListPage'
import { CompetitionSelectPage } from './pages/CompetitionSelectPage'
import { ScoreboardPage } from './pages/ScoreboardPage'
import { ProfilePage } from './pages/ProfilePage'

const queryClient = new QueryClient()

const ACCENT = '#6cf0c2'
const DARK = '#020231'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  color: '#e8ecf3',
  fontSize: 15,
  padding: '12px 14px',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  outline: 'none',
}

// ── Login Page ────────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await doLogin(email, password)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

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
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        {error && (
          <p style={{ color: '#ff5d6b', fontSize: 13, margin: 0, textAlign: 'center' }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            padding: '15px 32px', borderRadius: 12,
            background: loading ? 'rgba(108,240,194,0.4)' : ACCENT, color: DARK,
            border: 'none', fontSize: 16, fontWeight: 700,
            cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', width: '100%',
          }}
        >
          {loading ? 'Anmelden…' : 'Anmelden'}
        </button>
      </form>
    </div>
  )
}

// ── Pending / Rejected Registration ──────────────────────────────────────────

function RegistrationStatusPage({ reg }: { reg: ActiveRegistration }) {
  const isPending = reg.registration.status === 'PENDING'
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{isPending ? '⏳' : '🚫'}</div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: ACCENT, marginBottom: 8 }}>
        {reg.competition.name}
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        {isPending ? 'Anmeldung ausstehend' : 'Anmeldung abgelehnt'}
      </h1>
      <p style={{ color: '#a6b0c3', fontSize: 14, maxWidth: 300, lineHeight: 1.7, margin: 0 }}>
        {isPending
          ? 'Warte bis der Veranstalter dich für den Wettkampf bestätigt hat.'
          : 'Deine Anmeldung wurde vom Veranstalter abgelehnt. Bei Fragen wende dich direkt an den Veranstalter.'}
      </p>
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

function NoProfilePage({ onLogout }: { onLogout: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🪪</div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Kein Athletenprofil</h1>
      <p style={{ color: '#a6b0c3', fontSize: 14, textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
        Du hast noch kein Athletenprofil. Melde dich über den QR-Code einer Veranstaltung an.
      </p>
      <button
        onClick={onLogout}
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

function TopBar({ name, onLogout }: { name: string; onLogout: () => void }) {
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
              onClick={onLogout}
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

type Tab = 'boulder' | 'rangliste' | 'profil'

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
  {
    id: 'profil',
    label: 'Profil',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fillRule="evenodd" />
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

const TAB_ORDER: Tab[] = ['boulder', 'rangliste', 'profil']

function CompetitionShell({ reg }: { reg: ActiveRegistration }) {
  const [tab, setTab] = useState<Tab>('boulder')

  const swipe = useSwipe(
    () => {
      const idx = TAB_ORDER.indexOf(tab)
      if (idx < TAB_ORDER.length - 1) setTab(TAB_ORDER[idx + 1])
    },
    () => {
      const idx = TAB_ORDER.indexOf(tab)
      if (idx > 0) setTab(TAB_ORDER[idx - 1])
    },
  )

  return (
    <div style={{ paddingTop: 48, paddingBottom: 57 }} {...swipe}>
      {tab === 'boulder' && <BoulderListPage reg={reg} />}
      {tab === 'rangliste' && <ScoreboardPage reg={reg} />}
      {tab === 'profil' && <ProfilePage />}
      <BottomTabBar active={tab} onChange={setTab} />
    </div>
  )
}

// ── Authenticated Shell ───────────────────────────────────────────────────────

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient()
  const [selectedReg, setSelectedReg] = useState<ActiveRegistration | null>(null)

  const handleLogout = async () => {
    await doLogout()
    qc.clear()
    onLogout()
  }

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
    if (is404) return <NoProfilePage onLogout={handleLogout} />
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
        <TopBar name={fullName} onLogout={handleLogout} />
        <div style={{ paddingTop: 48 }}><NoCompetitionPage firstName={athlete.firstName} /></div>
      </>
    )
  }

  const active = selectedReg ?? (registrations.length === 1 ? registrations[0] : null)

  if (!active) {
    return (
      <>
        <TopBar name={fullName} onLogout={handleLogout} />
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

  const status = active.registration.status
  if (status === 'PENDING' || status === 'REJECTED') {
    return (
      <>
        <TopBar name={fullName} onLogout={handleLogout} />
        <div style={{ paddingTop: 48 }}><RegistrationStatusPage reg={active} /></div>
      </>
    )
  }

  return (
    <>
      <TopBar name={fullName} onLogout={handleLogout} />
      <CompetitionShell reg={active} />
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

function Root() {
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    refreshAccessToken().then(token => {
      setStatus(token ? 'authenticated' : 'unauthenticated')
    })
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    const id = setInterval(() => refreshAccessToken(), 14 * 60 * 1000)
    return () => clearInterval(id)
  }, [status])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a6b0c3', fontSize: 14 }}>
        Lädt…
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <LoginPage onLogin={() => setStatus('authenticated')} />
  }

  return <AuthenticatedApp onLogout={() => setStatus('unauthenticated')} />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  )
}
