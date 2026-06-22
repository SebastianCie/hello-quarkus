import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { DEV_MODE, parseJwtClaims, refreshAccessToken, setAccessToken } from './auth'

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; token: string; userId: string; name: string }
  | { status: 'unauthenticated' }

const AuthContext = createContext<AuthState>({ status: 'loading' })

export function useAuth() {
  return useContext(AuthContext)
}

function stateFromToken(token: string): Extract<AuthState, { status: 'authenticated' }> {
  const claims = parseJwtClaims(token)
  return {
    status: 'authenticated',
    token,
    userId: (claims?.sub as string) ?? '',
    name: (claims?.email as string) ?? '',
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (DEV_MODE) {
      localStorage.setItem('bb_org_setup_done', '1')
      setAuth({ status: 'authenticated', token: '', userId: '00000000-0000-0000-0000-000000000001', name: 'Dev User' })
      return
    }

    refreshAccessToken().then(token => {
      if (!token) { setAuth({ status: 'unauthenticated' }); return }
      setAuth(stateFromToken(token))

      // Proaktiv kurz vor Ablauf (Token lebt 15 min) erneuern
      intervalRef.current = setInterval(async () => {
        const next = await refreshAccessToken()
        if (!next) {
          clearInterval(intervalRef.current!)
          setAuth({ status: 'unauthenticated' })
        } else {
          setAuth(stateFromToken(next))
        }
      }, 14 * 60 * 1000)
    })

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // Login-Seite setzt Token per window.location.href → vollständiger Reload → useEffect läuft neu
  // Logout per doLogout() + window.location.href → dasselbe Muster

  if (auth.status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(138deg, #020231 53%, rgba(130,4,255,0.35) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#a6b0c3', fontSize: 14,
      }}>
        Authentifizierung…
      </div>
    )
  }

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

// Hilfsfunktion für Seiten die explizit den Token nach Login setzen wollen (ohne Reload)
export function applyLoginToken(token: string) {
  setAccessToken(token)
}
