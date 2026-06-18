import { createContext, useContext, useEffect, useState } from 'react'
import { keycloak, DEV_MODE } from './keycloak'

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; token: string; userId: string; name: string }
  | { status: 'unauthenticated' }

const AuthContext = createContext<AuthState>({ status: 'loading' })

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    if (DEV_MODE) {
      // Dev-User UUID entspricht dem Seed in db/dev/V100__dev_seed.sql
      localStorage.setItem('bb_org_setup_done', '1')
      setAuth({ status: 'authenticated', token: '', userId: '00000000-0000-0000-0000-000000000001', name: 'Dev User' })
      return
    }

    // check-sso: detects existing session without forcing a redirect for unauthenticated users
    keycloak!.init({ onLoad: 'check-sso', checkLoginIframe: false })
      .then((authenticated) => {
        if (authenticated) {
          setAuth({
            status: 'authenticated',
            token: keycloak!.token!,
            userId: keycloak!.subject!,
            name: (keycloak!.tokenParsed as Record<string, string>)?.preferred_username ?? '',
          })
          setInterval(() => {
            keycloak!.updateToken(30)
              .then((refreshed) => {
                if (refreshed) {
                  setAuth((prev) => prev.status === 'authenticated'
                    ? { ...prev, token: keycloak!.token! }
                    : prev)
                }
              })
              .catch(() => keycloak!.logout())
          }, 30_000)
        } else {
          setAuth({ status: 'unauthenticated' })
        }
      })
      .catch(() => setAuth({ status: 'unauthenticated' }))
  }, [])

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
