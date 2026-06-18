import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { keycloak, DEV_MODE } from '@/auth/keycloak'
import { BetaBattleLogo, Field, Input, PrimaryButton } from '@/components/FormUI'

type FormData = { username: string; email: string; password: string; confirmPassword: string }

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
  const [form, setForm] = useState<FormData>({ username: '', email: '', password: '', confirmPassword: '' })
  const [validationError, setValidationError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api.account.register({ username: data.username, email: data.email || undefined, password: data.password }),
    onSuccess: () => {
      if (DEV_MODE) setDone(true)
      else keycloak!.login({ redirectUri: `${window.location.origin}/setup` })
    },
  })

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setValidationError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { setValidationError(t('register.passwordMismatch')); return }
    if (form.password.length < 8) { setValidationError(t('register.passwordTooShort')); return }
    mutation.mutate(form)
  }

  if (done) {
    return (
      <div style={{ ...pageStyle, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{
          background: '#121a2b', border: '1px solid rgba(108,240,194,0.3)', borderRadius: 20,
          padding: 48, maxWidth: 440, width: '100%', textAlign: 'center',
          boxShadow: '0 0 0 1px rgba(108,240,194,0.1), 0 20px 50px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ color: '#6cf0c2', margin: '0 0 8px', fontSize: 22 }}>{t('register.successTitle')}</h2>
          <p style={{ color: '#a6b0c3', margin: '0 0 24px' }}>{t('register.successMessage')}</p>
          <PrimaryButton onClick={() => navigate('/setup')}>{t('register.continue')}</PrimaryButton>
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
              <Field label={t('register.username')} required>
                <Input value={form.username} onChange={e => set('username', e.target.value)} placeholder={t('register.usernamePlaceholder')} autoComplete="username" required />
              </Field>
              <Field label={t('register.email')}>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder={t('register.emailPlaceholder')} autoComplete="email" />
              </Field>
              <Field label={t('register.password')} required>
                <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
              </Field>
              <Field label={t('register.confirmPassword')} required>
                <Input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
              </Field>
            </div>
          </div>

          {(validationError || mutation.isError) && (
            <p style={{ color: '#ff5d6b', fontSize: 13, marginBottom: 16 }}>
              {validationError ?? (mutation.error instanceof Error ? mutation.error.message : t('register.errorMessage'))}
            </p>
          )}

          <PrimaryButton type="submit" disabled={mutation.isPending} style={{ width: '100%', padding: '13px 20px', fontSize: 15 }}>
            {mutation.isPending ? t('common.loading') : t('register.submit')}
          </PrimaryButton>

          <p style={{ textAlign: 'center', marginTop: 20, color: '#a6b0c3', fontSize: 13 }}>
            {t('register.alreadyHaveAccount')}{' '}
            <button
              type="button"
              onClick={() => DEV_MODE ? navigate('/setup') : keycloak!.login({ redirectUri: `${window.location.origin}/dashboard` })}
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
