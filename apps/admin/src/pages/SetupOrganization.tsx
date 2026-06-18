import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { BetaBattleLogo, SectionLabel, Field, Input, PrimaryButton } from '@/components/FormUI'

type FormData = {
  orgName: string; slug: string; email: string; logoUrl: string
  locationName: string; city: string; address: string
}

function slugify(value: string) {
  return value.toLowerCase().trim()
    .replace(/[äöü]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c] ?? c))
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function SetupOrganization() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>({ orgName: '', slug: '', email: '', logoUrl: '', locationName: '', city: '', address: '' })
  const [slugManual, setSlugManual] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.organizations.setup({
      name: data.orgName, slug: data.slug, contactEmail: data.email || null, logoUrl: data.logoUrl || null,
      locationName: data.locationName, locationCity: data.city || null, locationAddress: data.address || null,
    }),
    onSuccess: () => { localStorage.setItem('bb_org_setup_done', '1'); navigate('/dashboard') },
  })

  function set(field: keyof FormData, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'orgName' && !slugManual) { next.slug = slugify(value); if (!next.locationName) next.locationName = value }
      return next
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(138deg, #020231 53%, rgba(130,4,255,0.35) 100%)',
      backgroundAttachment: 'fixed',
      display: 'flex', flexDirection: 'column',
    }}>
      <header style={{
        position: 'sticky', top: 0, backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(2,2,49,0.8)', zIndex: 10,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BetaBattleLogo />
          <span style={{ fontWeight: 700, color: '#e8ecf3', fontSize: 16 }}>Beta Battle</span>
          <span style={{ marginLeft: 8, background: '#16443a', color: '#6cf0c2', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>Admin</span>
        </div>
      </header>

      <div style={{ padding: '48px 24px 40px', textAlign: 'center' }}>
        <p style={{ color: '#6cf0c2', fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Beta Battle Platform
        </p>
        <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700 }}>{t('org.register.title')}</h1>
        <p style={{ color: '#a6b0c3', margin: 0, fontSize: '1.05rem', maxWidth: 560, marginInline: 'auto' }}>{t('org.register.subtitle')}</p>
      </div>

      <div style={{ flex: 1, maxWidth: 600, width: '100%', margin: '0 auto', padding: '40px 24px 64px' }}>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form) }}>

          <div style={{ background: '#121a2b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
            <SectionLabel>{t('org.register.orgSection')}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label={t('org.register.name')} required>
                <Input value={form.orgName} onChange={e => set('orgName', e.target.value)} placeholder={t('org.register.namePlaceholder')} required />
              </Field>
              <Field label={t('org.register.slug')} hint={t('org.register.slugHint')} required>
                <Input value={form.slug} onChange={e => { setSlugManual(true); set('slug', e.target.value) }} placeholder={t('org.register.slugPlaceholder')} pattern="[a-z0-9-]+" required />
              </Field>
              <Field label={t('org.register.email')}>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder={t('org.register.emailPlaceholder')} />
              </Field>
              <Field label={t('org.register.logoUrl')}>
                <Input type="url" value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder={t('org.register.logoUrlPlaceholder')} />
              </Field>
            </div>
          </div>

          <div style={{ background: '#121a2b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
            <SectionLabel>{t('org.register.locationSection')}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label={t('org.register.locationName')} required>
                <Input value={form.locationName} onChange={e => set('locationName', e.target.value)} placeholder={t('org.register.locationNamePlaceholder')} required />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label={t('org.register.city')} required>
                  <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder={t('org.register.cityPlaceholder')} required />
                </Field>
                <Field label={t('org.register.address')}>
                  <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder={t('org.register.addressPlaceholder')} />
                </Field>
              </div>
            </div>
          </div>

          {mutation.isError && (
            <p style={{ color: '#ff5d6b', fontSize: 13, marginBottom: 16 }}>
              {mutation.error instanceof Error ? mutation.error.message : t('org.register.errorMessage')}
            </p>
          )}

          <PrimaryButton type="submit" disabled={mutation.isPending} style={{ width: '100%', padding: '13px 20px', fontSize: 15 }}>
            {mutation.isPending ? t('common.loading') : t('org.register.submit')}
          </PrimaryButton>
        </form>
      </div>
    </div>
  )
}
