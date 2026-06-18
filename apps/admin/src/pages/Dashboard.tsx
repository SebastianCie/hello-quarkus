import { useAuth } from '@/auth/AuthProvider'
import { keycloak, DEV_MODE } from '@/auth/keycloak'

function BetaBattleLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ color: '#6cf0c2' }}>
      <path d="M14 2L26 8v12l-12 6L2 20V8L14 2z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M14 2v24M2 8l12 6 12-6" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    </svg>
  )
}

export function Dashboard() {
  const auth = useAuth()

  function logout() {
    if (DEV_MODE) return
    keycloak!.logout({ redirectUri: window.location.origin + '/register' })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(138deg, #020231 53%, rgba(130,4,255,0.35) 100%)',
      backgroundAttachment: 'fixed',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <header style={{
        position: 'sticky', top: 0,
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(2,2,49,0.8)',
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '14px 24px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <BetaBattleLogo />
          <span style={{ fontWeight: 700, color: '#e8ecf3', fontSize: 16 }}>Beta Battle</span>
          <span style={{
            marginLeft: 8, background: '#16443a', color: '#6cf0c2', fontSize: 11,
            fontWeight: 600, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.06em',
          }}>Admin</span>
          <div style={{ flex: 1 }} />
          {auth.status === 'authenticated' && (
            <span style={{ color: '#a6b0c3', fontSize: 13, marginRight: 12 }}>
              {auth.name}
            </span>
          )}
          {!DEV_MODE && (
            <button
              onClick={logout}
              style={{
                background: 'rgba(255,255,255,0.06)', color: '#a6b0c3', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: '#6cf0c2', fontWeight: 700, fontSize: 11,
            letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 16px',
          }}>
            Beta Battle Admin
          </p>
          <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700 }}>
            Willkommen{auth.status === 'authenticated' && auth.name ? `, ${auth.name}` : ''}!
          </h1>
          <p style={{ color: '#a6b0c3', fontSize: '1.05rem' }}>
            Das Dashboard wird gerade aufgebaut. Schau bald wieder vorbei.
          </p>
        </div>
      </div>
    </div>
  )
}
