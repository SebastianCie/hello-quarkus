import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doLogin } from '@/auth/auth'
import { BetaBattleLogo, Field, Input, PrimaryButton } from '@/components/FormUI'

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(138deg, #020231 53%, rgba(130,4,255,0.35) 100%)',
  backgroundAttachment: 'fixed',
  display: 'flex',
  flexDirection: 'column',
}

export function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await doLogin(form.email, form.password)
      // Reload → AuthProvider liest Refresh-Cookie und setzt authenticated state
      window.location.href = localStorage.getItem('bb_org_setup_done') ? '/dashboard' : '/setup'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <header style={{
        position: 'sticky', top: 0, backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(2,2,49,0.8)', zIndex: 10,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BetaBattleLogo />
          <span style={{ fontWeight: 700, color: '#e8ecf3', fontSize: 16 }}>Beta Battle</span>
          <span style={{ marginLeft: 8, background: '#16443a', color: '#6cf0c2', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.06em' }}>Admin</span>
        </div>
      </header>

      <div style={{ padding: '48px 24px 40px', textAlign: 'center' }}>
        <p style={{ color: '#6cf0c2', fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Beta Battle Platform
        </p>
        <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700 }}>Anmelden</h1>
        <p style={{ color: '#a6b0c3', margin: 0, fontSize: '1.05rem', maxWidth: 480, marginInline: 'auto' }}>
          Melde dich mit deinem BetaBattle-Konto an.
        </p>
      </div>

      <div style={{ flex: 1, maxWidth: 480, width: '100%', margin: '0 auto', padding: '8px 24px 64px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{
            background: '#121a2b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
            padding: 24, marginBottom: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="E-Mail-Adresse" required>
                <Input
                  type="email" value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="deine@email.de"
                  autoComplete="email" required
                />
              </Field>
              <Field label="Passwort" required>
                <Input
                  type="password" value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password" required
                />
              </Field>
            </div>
          </div>

          {error && <p style={{ color: '#ff5d6b', fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <PrimaryButton type="submit" disabled={loading} style={{ width: '100%', padding: '13px 20px', fontSize: 15 }}>
            {loading ? 'Anmelden…' : 'Anmelden'}
          </PrimaryButton>

          <p style={{ textAlign: 'center', marginTop: 20, color: '#a6b0c3', fontSize: 13 }}>
            Noch kein Konto?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              style={{ background: 'none', border: 'none', color: '#6cf0c2', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}
            >
              Jetzt registrieren
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
