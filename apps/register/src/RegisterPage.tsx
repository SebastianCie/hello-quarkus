import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'

const BASE = '/api/v1'

async function fetchSettings(): Promise<Record<string, string>> {
  const res = await fetch(`${BASE}/settings`)
  return res.ok ? res.json() : {}
}

type Competition = {
  id: string; name: string; discipline: string; startDate: string | null; endDate: string | null
  registrationOpensAt: string | null; registrationClosesAt: string | null
  genderBasedCategories: boolean
}
type Category = { id: string; name: string; gender: string | null }
type PublicView = { competition: Competition; categories: Category[] }

type ProfileData = {
  firstName: string; lastName: string; dateOfBirth: string
  gender: string; club: string; nation: string; licenseNumber: string; categoryId: string
  email: string; password: string; passwordConfirm: string
}

const GENDERS = [
  { value: '', label: '— bitte wählen —' },
  { value: 'FEMALE', label: 'Weiblich' },
  { value: 'MALE', label: 'Männlich' },
  { value: 'DIVERSE', label: 'Divers' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 10, color: '#e8ecf3', fontSize: 16, padding: '13px 14px', outline: 'none',
  WebkitAppearance: 'none', appearance: 'none', fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: '#a6b0c3', marginBottom: 6,
}

function Field({ children, text, required }: { children: React.ReactNode; text: string; required?: boolean }) {
  return (
    <div>
      <label style={labelStyle}>{text}{required && <span style={{ color: '#ff5d6b', marginLeft: 3 }}>*</span>}</label>
      {children}
    </div>
  )
}

function CompHeader({ comp, disciplineLabel }: { comp: Competition; disciplineLabel: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0f1e 0%, #16443a 100%)',
      padding: '28px 20px 24px',
      borderBottom: '1px solid rgba(108,240,194,0.15)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6cf0c2', marginBottom: 6 }}>
        Beta Battle · {disciplineLabel}
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>{comp.name}</h1>
      {comp.startDate && (
        <p style={{ color: '#a6b0c3', fontSize: 13, margin: 0 }}>
          {new Date(comp.startDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}

// ── Profile Form ─────────────────────────────────────────────────────────────

function ProfileStep({ token, comp, categories, disciplineLabel }: {
  token: string; comp: Competition; categories: Category[]; disciplineLabel: string
}) {
  const [form, setForm] = useState<ProfileData>({
    firstName: '', lastName: '', dateOfBirth: '', gender: '',
    club: '', nation: '', licenseNumber: '', categoryId: '',
    email: '', password: '', passwordConfirm: '',
  })
  const [success, setSuccess] = useState(false)
  const [registeredName, setRegisteredName] = useState('')

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  })

  const register = useMutation({
    mutationFn: async () => {
      if (!form.email.includes('@')) throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.')
      if (form.password.length < 8) throw new Error('Das Passwort muss mindestens 8 Zeichen lang sein.')
      if (form.password !== form.passwordConfirm) throw new Error('Die Passwörter stimmen nicht überein.')

      const res = await fetch(`${BASE}/competitions/by-token/${token}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          club: form.club || null,
          nation: form.nation || null,
          licenseNumber: form.licenseNumber || null,
          categoryId: form.categoryId || null,
          email: form.email.trim(),
          password: form.password,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? 'Fehler bei der Anmeldung')
      }
      return res.json()
    },
    onSuccess: () => {
      setRegisteredName(`${form.firstName} ${form.lastName}`)
      setSuccess(true)
    },
  })

  if (success) {
    const athleteBase = settings?.['athlete_base_url'] || window.location.origin
    const athleteUrl = athleteBase.replace(/\/$/, '')

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Anmeldung erfolgreich!</h1>
        <p style={{ color: '#a6b0c3', fontSize: 15, textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
          <strong style={{ color: '#e8ecf3' }}>{registeredName}</strong> ist für{' '}
          <strong style={{ color: '#e8ecf3' }}>{comp.name}</strong> angemeldet. Viel Erfolg!
        </p>
        <div style={{
          marginTop: 24, padding: '14px 18px', borderRadius: 12,
          background: 'rgba(108,240,194,0.08)', border: '1px solid rgba(108,240,194,0.25)',
          maxWidth: 340, width: '100%', textAlign: 'center',
        }}>
          <p style={{ color: '#6cf0c2', fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>Konto erstellt</p>
          <p style={{ color: '#a6b0c3', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
            Melde dich in der Athleten-App mit deiner E-Mail und deinem Passwort an, um deine Ergebnisse einzutragen.
          </p>
          <a
            href={athleteUrl}
            style={{
              display: 'block', padding: '13px 24px', borderRadius: 10,
              background: '#6cf0c2', color: '#020231',
              fontWeight: 700, fontSize: 15, textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Zur Athleten-App →
          </a>
        </div>
      </div>
    )
  }

  const genderRequired = comp.genderBasedCategories

  const valid = !!(
    form.firstName.trim() && form.lastName.trim() &&
    (!genderRequired || form.gender) &&
    form.email.includes('@') && form.password.length >= 8 &&
    form.password === form.passwordConfirm
  )

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 48 }}>
      <CompHeader comp={comp} disciplineLabel={disciplineLabel} />
      <div style={{ padding: '28px 20px', maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Dein Athletenprofil</h2>
        <p style={{ color: '#a6b0c3', fontSize: 13, margin: '0 0 24px' }}>
          Diese Daten werden für die Wettkampfauswertung verwendet.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field text="Vorname" required>
              <input style={inputStyle} value={form.firstName} placeholder="Max"
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
            </Field>
            <Field text="Nachname" required>
              <input style={inputStyle} value={form.lastName} placeholder="Mustermann"
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
            </Field>
          </div>

          <Field text="Geburtsdatum">
            <input style={inputStyle} type="date" value={form.dateOfBirth}
              onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))} />
          </Field>

          <Field text="Geschlecht" required={genderRequired}>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.gender}
              onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
              {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>

          {!comp.genderBasedCategories && categories.length > 0 && (
            <Field text="Kategorie">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.categoryId}
                onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">— Kategorie wählen —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}

          <Field text="Verein">
            <input style={inputStyle} value={form.club} placeholder="z.B. DAV München"
              onChange={e => setForm(p => ({ ...p, club: e.target.value }))} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
            <Field text="Nation">
              <input style={inputStyle} value={form.nation} placeholder="DE" maxLength={3}
                onChange={e => setForm(p => ({ ...p, nation: e.target.value.toUpperCase() }))} />
            </Field>
            <Field text="Lizenznummer">
              <input style={inputStyle} value={form.licenseNumber} placeholder="optional"
                onChange={e => setForm(p => ({ ...p, licenseNumber: e.target.value }))} />
            </Field>
          </div>

          {/* Account-Erstellung */}
          <div style={{
            marginTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: 20,
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#6cf0c2', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Konto erstellen
            </p>
            <p style={{ fontSize: 13, color: '#a6b0c3', margin: '0 0 14px', lineHeight: 1.5 }}>
              Damit kannst du deine Ergebnisse selbst in der Athleten-App eintragen.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field text="E-Mail" required>
                <input
                  style={inputStyle} type="email" value={form.email}
                  placeholder="deine@email.de"
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field text="Passwort" required>
                  <input
                    style={inputStyle} type="password" value={form.password}
                    placeholder="min. 8 Zeichen"
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  />
                </Field>
                <Field text="Wiederholen" required>
                  <input
                    style={inputStyle} type="password" value={form.passwordConfirm}
                    placeholder="••••••••"
                    onChange={e => setForm(p => ({ ...p, passwordConfirm: e.target.value }))}
                  />
                </Field>
              </div>
            </div>
          </div>

          {register.isError && (
            <div style={{ background: 'rgba(255,93,107,0.12)', border: '1px solid rgba(255,93,107,0.3)', borderRadius: 10, padding: '12px 14px', color: '#ff5d6b', fontSize: 14 }}>
              {register.error instanceof Error ? register.error.message : 'Fehler bei der Anmeldung'}
            </div>
          )}

          <button
            onClick={() => register.mutate()}
            disabled={!valid || register.isPending}
            style={{
              marginTop: 8, padding: '15px 24px', borderRadius: 12,
              background: valid && !register.isPending ? '#6cf0c2' : 'rgba(108,240,194,0.3)',
              color: valid && !register.isPending ? '#020231' : 'rgba(2,2,49,0.5)',
              border: 'none', fontSize: 16, fontWeight: 700,
              cursor: valid ? 'pointer' : 'not-allowed',
              width: '100%', fontFamily: 'inherit', transition: 'background 0.15s',
            }}
          >
            {register.isPending ? 'Anmeldung läuft…' : 'Jetzt anmelden'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function RegisterPage() {
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, isError } = useQuery<PublicView>({
    queryKey: ['by-token', token],
    queryFn: async () => {
      const res = await fetch(`${BASE}/competitions/by-token/${token}`)
      if (!res.ok) throw new Error('Ungültiger Link')
      return res.json()
    },
    enabled: !!token,
    retry: false,
  })

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#a6b0c3', fontSize: 15 }}>Lädt…</div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🧗</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Link ungültig</h1>
        <p style={{ color: '#a6b0c3', fontSize: 15, textAlign: 'center' }}>
          Bitte den QR-Code erneut scannen oder den Veranstalter fragen.
        </p>
      </div>
    )
  }

  const comp = data.competition
  const categories = data.categories
  const disciplineLabel = comp.discipline === 'BOULDERING' ? 'Bouldern'
    : comp.discipline === 'LEAD' ? 'Lead'
    : comp.discipline === 'SPEED' ? 'Speed'
    : comp.discipline

  const now = new Date()
  const opensAt = comp.registrationOpensAt ? new Date(comp.registrationOpensAt) : null
  const closesAt = comp.registrationClosesAt ? new Date(comp.registrationClosesAt) : null
  const registrationClosed = (opensAt && now < opensAt) || (closesAt && now > closesAt)

  if (registrationClosed) {
    const fmt = (d: Date) => d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr'
    const range = opensAt && closesAt
      ? `vom ${fmt(opensAt)} bis ${fmt(closesAt)}`
      : opensAt
        ? `ab ${fmt(opensAt)}`
        : closesAt
          ? `bis ${fmt(closesAt)}`
          : ''
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>{comp.name}</h1>
        <p style={{ color: '#a6b0c3', fontSize: 15, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
          Die Anmeldung ist {range} möglich.
        </p>
      </div>
    )
  }

  return (
    <ProfileStep
      token={token!}
      comp={comp}
      categories={categories}
      disciplineLabel={disciplineLabel}
    />
  )
}
