import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { keycloak, DEV_MODE } from '@/auth/keycloak'
import { BetaBattleLogo } from './FormUI'

const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: '/dashboard', label: 'Übersicht', end: true },
  { to: '/dashboard/organisation', label: 'Organisation & Standorte' },
  { to: '/dashboard/wettkampfe', label: 'Wettkämpfe' },
  { to: '/dashboard/athleten', label: 'Athleten' },
  { to: '/dashboard/hilfe', label: 'Hilfe & FAQ' },
]

export function DashboardLayout() {
  const auth = useAuth()
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('bb_org_setup_done')
    if (DEV_MODE) { navigate('/register'); return }
    keycloak!.logout({ redirectUri: window.location.origin + '/register' })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#020231' }}>

      {/* Sidebar */}
      <aside style={{
        width: 230,
        flexShrink: 0,
        background: '#0a0f1e',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BetaBattleLogo size={24} />
          <span style={{ fontWeight: 700, color: '#e8ecf3', fontSize: 15 }}>Beta Battle</span>
          <span style={{
            background: '#16443a', color: '#6cf0c2', fontSize: 10, fontWeight: 700,
            padding: '2px 7px', borderRadius: 999, letterSpacing: '0.06em',
          }}>Admin</span>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 16px' }} />

        {/* Nav */}
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'block',
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#6cf0c2' : '#a6b0c3',
                background: isActive ? 'rgba(108,240,194,0.08)' : 'transparent',
                textDecoration: 'none',
                marginBottom: 2,
                transition: 'background 0.15s, color 0.15s',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User / Logout */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {auth.status === 'authenticated' && (
            <div style={{ fontSize: 12, color: '#a6b0c3', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {auth.name}
            </div>
          )}
          <button
            onClick={logout}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)', color: '#a6b0c3',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
        {/* Top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(2,2,49,0.9)', backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '14px 32px',
        }}>
          <div style={{ fontSize: 12, color: '#a6b0c3' }}>Beta Battle Admin</div>
        </div>

        <div style={{
          minHeight: 'calc(100vh - 53px)',
          background: 'linear-gradient(160deg, #020231 0%, #060d1a 60%, rgba(130,4,255,0.08) 100%)',
          padding: '32px',
        }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
