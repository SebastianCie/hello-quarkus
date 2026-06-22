import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BetaBattleLogo, Field, Input, PrimaryButton } from '@/components/FormUI'

type FormData = { displayName: string; email: string; password: string; confirmPassword: string }

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(138deg, #020231 53%, rgba(130,4,255,0.35) 100%)',
  backgroundAttachment: 'fixed',
  display: 'flex',
  flexDirection: 'column',
}

export function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>({ displayName: '', email: '', password: '', confirmPassword: '' })
  const [validationError, setValidationError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setValidationError(null)
    setServerError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { setValidationError(t('register.passwordMismatch')); return }
    if (form.password.length < 8) { setValidationError(t('register.passwordTooShort')); return }
    if (!form.email.includes('@')) { setValidationError('Bitte eine gültige E-Mail-Adresse angeben.'); return }

    setLoading(true)
    setServerError(null)
    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, displayName: form.displayName || undefined }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { setServerError(body.message ?? t('register.errorMessage')); return }
      setDone(true)
    } catch {
      setServerError(t('register.errorMessage'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ ...pageStyle, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{
          background: '#121a2b', border: '1px solid rgba(108,240,194,0.3)', borderRadius: 20,
          padding: 48, maxWidth: 440, width: '100%', textAlign: 'center',
          boxShadow: '0 0 0 1px rgba(108,240,194,0.1), 0 20px 50px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
          <h2 style={{ color: '#6cf0c2', margin: '0 0 8px', fontSize: 22 }}>E-Mail bestätigen</h2>
          <p style={{ color: '#a6b0c3', margin: '0 0 8px' }}>
            Wir haben dir eine Bestätigungs-E-Mail an <strong style={{ color: '#e8ecf3' }}>{form.email}</strong> geschickt.
          </p>
          <p style={{ color: '#a6b0c3', margin: '0 0 24px', fontSize: 13 }}>
            Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
          </p>
          <PrimaryButton onClick={() => navigate('/login')}>Zum Login</PrimaryButton>
        </div>
      </div>
    )
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
        <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700 }}>{t('register.title')}</h1>
        <p style={{ color: '#a6b0c3', margin: 0, fontSize: '1.05rem', maxWidth: 480, marginInline: 'auto' }}>{t('register.subtitle')}</p>
      </div>

      <div style={{ flex: 1, maxWidth: 480, width: '100%', margin: '0 auto', padding: '8px 24px 64px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{
            background: '#121a2b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
            padding: 24, marginBottom: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label={t('register.username')}>
                <Input value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder={t('register.usernamePlaceholder')} autoComplete="name" />
              </Field>
              <Field label={t('register.email')} required>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder={t('register.emailPlaceholder')} autoComplete="email" required />
              </Field>
              <Field label={t('register.password')} required>
                <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
              </Field>
              <Field label={t('register.confirmPassword')} required>
                <Input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
              </Field>
            </div>
          </div>

          {(validationError || serverError) && (
            <p style={{ color: '#ff5d6b', fontSize: 13, marginBottom: 16 }}>
              {validationError ?? serverError}
            </p>
          )}

          <PrimaryButton type="submit" disabled={loading} style={{ width: '100%', padding: '13px 20px', fontSize: 15 }}>
            {loading ? t('common.loading') : t('register.submit')}
          </PrimaryButton>

          <p style={{ textAlign: 'center', marginTop: 20, color: '#a6b0c3', fontSize: 13 }}>
            {t('register.alreadyHaveAccount')}{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{ background: 'none', border: 'none', color: '#6cf0c2', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}
            >
              {t('register.login')}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
