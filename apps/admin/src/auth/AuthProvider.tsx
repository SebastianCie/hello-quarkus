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

export function getAuthHeader(): Record<string, string> {
  const auth = useAuth()
  if (auth.status === 'authenticated') {
    return { Authorization: `Bearer ${auth.token}` }
  }
  return {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    if (DEV_MODE) {
      // Local dev: skip Keycloak, treat as anonymous (API allows unauthenticated in dev)
      setAuth({ status: 'authenticated', token: '', userId: 'dev-user', name: 'Dev User' })
      return
    }

    keycloak!.init({ onLoad: 'login-required', checkLoginIframe: false })
      .then((authenticated) => {
        if (authenticated) {
          setAuth({
            status: 'authenticated',
            token: keycloak!.token!,
            userId: keycloak!.subject!,
            name: (keycloak!.tokenParsed as Record<string, string>)?.preferred_username ?? '',
          })

          // Refresh token before it expires
          setInterval(() => {
            keycloak!.updateToken(30).catch(() => keycloak!.logout())
          }, 30_000)
        } else {
          keycloak!.login()
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
