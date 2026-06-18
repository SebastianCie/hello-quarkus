import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'

type FormData = {
  orgName: string
  slug: string
  email: string
  logoUrl: string
  locationName: string
  city: string
  address: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c] ?? c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        'disabled:opacity-50',
        props.className,
      )}
    />
  )
}

export function RegisterOrganization() {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormData>({
    orgName: '', slug: '', email: '', logoUrl: '',
    locationName: '', city: '', address: '',
  })
  const [slugManual, setSlugManual] = useState(false)
  const [done, setDone] = useState(false)

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const org = await api.organizations.create({
        name: data.orgName,
        slug: data.slug,
        contactEmail: data.email || null,
        logoUrl: data.logoUrl || null,
      })
      await api.locations.create({
        orgId: org.id,
        name: data.locationName,
        city: data.city || null,
        address: data.address || null,
        country: 'DE',
      })
      return org
    },
    onSuccess: () => setDone(true),
  })

  function set(field: keyof FormData, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'orgName' && !slugManual) {
        next.slug = slugify(value)
        if (!next.locationName) next.locationName = value
      }
      return next
    })
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="max-w-md w-full rounded-xl border bg-card p-8 text-center shadow-sm">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold mb-2">{t('org.register.successTitle')}</h2>
          <p className="text-muted-foreground">{t('org.register.successMessage')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t('org.register.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('org.register.subtitle')}</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }}
          className="rounded-xl border bg-card shadow-sm divide-y divide-border"
        >
          {/* Organisation */}
          <div className="p-6 flex flex-col gap-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {t('org.register.orgSection')}
            </h2>

            <Field label={t('org.register.name')} required>
              <Input
                value={form.orgName}
                onChange={(e) => set('orgName', e.target.value)}
                placeholder={t('org.register.namePlaceholder')}
                required
              />
            </Field>

            <Field label={t('org.register.slug')} hint={t('org.register.slugHint')} required>
              <Input
                value={form.slug}
                onChange={(e) => { setSlugManual(true); set('slug', e.target.value) }}
                placeholder={t('org.register.slugPlaceholder')}
                pattern="[a-z0-9-]+"
                required
              />
            </Field>

            <Field label={t('org.register.email')}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder={t('org.register.emailPlaceholder')}
              />
            </Field>

            <Field label={t('org.register.logoUrl')}>
              <Input
                type="url"
                value={form.logoUrl}
                onChange={(e) => set('logoUrl', e.target.value)}
                placeholder={t('org.register.logoUrlPlaceholder')}
              />
            </Field>
          </div>

          {/* Erster Standort */}
          <div className="p-6 flex flex-col gap-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {t('org.register.locationSection')}
            </h2>

            <Field label={t('org.register.locationName')} required>
              <Input
                value={form.locationName}
                onChange={(e) => set('locationName', e.target.value)}
                placeholder={t('org.register.locationNamePlaceholder')}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('org.register.city')} required>
                <Input
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder={t('org.register.cityPlaceholder')}
                  required
                />
              </Field>
              <Field label={t('org.register.address')}>
                <Input
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder={t('org.register.addressPlaceholder')}
                />
              </Field>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 flex flex-col gap-3">
            {mutation.isError && (
              <p className="text-sm text-destructive">{t('org.register.errorMessage')}</p>
            )}
            <button
              type="submit"
              disabled={mutation.isPending}
              className={cn(
                'w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium',
                'hover:opacity-90 transition-opacity',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {mutation.isPending ? t('common.loading') : t('org.register.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
