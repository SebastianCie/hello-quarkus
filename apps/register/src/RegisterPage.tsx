import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { keycloak, getToken } from './auth/keycloak'

const BASE = '/api/v1'

type Competition = {
  id: string; name: string; discipline: string; startDate: string | null; endDate: string | null
}
type Category = { id: string; name: string; gender: string | null }
type PublicView = { competition: Competition; categories: Category[] }

type ExistingAthlete = {
  id: string; firstName: string; lastName: string; dateOfBirth: string | null
  gender: string | null; club: string | null; nation: string | null; licenseNumber: string | null
}
type ExistingRegistration = { id: string; categoryId: string | null; status: string } | null

type ProfileData = {
  firstName: string; lastName: string; dateOfBirth: string
  gender: string; club: string; nation: string; licenseNumber: string; categoryId: string
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

// ── Step 1: Konto / Login ────────────────────────────────────────────────────

function LoginStep({ comp, disciplineLabel }: { comp: Competition; disciplineLabel: string }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <CompHeader comp={comp} disciplineLabel={disciplineLabel} />
      <div style={{ padding: '32px 20px', maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Zuerst anmelden</h2>
        <p style={{ color: '#a6b0c3', fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>
          Um dich für <strong style={{ color: '#e8ecf3' }}>{comp.name}</strong> anzumelden,
          benötigst du ein Beta Battle-Konto. Du kannst dich mit deinem Google- oder
          GitHub-Konto anmelden oder ein neues Konto erstellen.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => keycloak.login({ redirectUri: window.location.href })}
            style={{
              width: '100%', padding: '15px 24px', borderRadius: 12,
              background: '#6cf0c2', color: '#020231', border: 'none',
              fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Anmelden / Konto erstellen
          </button>
          <p style={{ fontSize: 12, color: '#6b7890', textAlign: 'center', margin: 0 }}>
            Du wirst zu Keycloak weitergeleitet. Dort kannst du dich mit<br />
            Google, GitHub oder E-Mail + Passwort anmelden.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Already registered screen ────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; hint: string }> = {
  PENDING: {
    label: 'Ausstehend',
    color: '#ffc400',
    bg: 'rgba(255,196,0,0.08)',
    border: 'rgba(255,196,0,0.25)',
    hint: 'Deine Anmeldung ist eingegangen und wartet auf die Bestätigung durch den Veranstalter.',
  },
  CONFIRMED: {
    label: 'Bestätigt',
    color: '#6cf0c2',
    bg: 'rgba(108,240,194,0.10)',
    border: 'rgba(108,240,194,0.25)',
    hint: 'Du wurdest vom Veranstalter bestätigt und nimmst offiziell am Wettkampf teil.',
  },
  REJECTED: {
    label: 'Abgelehnt',
    color: '#ff5d6b',
    bg: 'rgba(255,93,107,0.10)',
    border: 'rgba(255,93,107,0.25)',
    hint: 'Deine Anmeldung wurde leider nicht angenommen. Bitte kontaktiere den Veranstalter.',
  },
}

function AlreadyRegistered({ comp, disciplineLabel, athlete, categories, categoryId, status, onEdit }: {
  comp: Competition; disciplineLabel: string; athlete: ExistingAthlete
  categories: Category[]; categoryId: string | null; status: string; onEdit: () => void
}) {
  const catName = categories.find(c => c.id === categoryId)?.name ?? null
  const st = STATUS_CONFIG[status] ?? STATUS_CONFIG['PENDING']

  return (
    <div style={{ minHeight: '100vh' }}>
      <CompHeader comp={comp} disciplineLabel={disciplineLabel} />

      <div style={{ padding: '36px 20px 48px', maxWidth: 440, margin: '0 auto' }}>

        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(108,240,194,0.12)',
            border: '2px solid rgba(108,240,194,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, marginBottom: 20,
          }}>
            ✓
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>
            Du bist angemeldet!
          </h2>
          <p style={{ color: '#a6b0c3', fontSize: 14, margin: 0, textAlign: 'center', lineHeight: 1.6, maxWidth: 300 }}>
            Wir freuen uns auf dich bei <strong style={{ color: '#e8ecf3' }}>{comp.name}</strong>.
          </p>
        </div>

        {/* Athlete card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 14, overflow: 'hidden', marginBottom: 12,
        }}>
          <DataRow icon="👤" label="Name" value={`${athlete.firstName} ${athlete.lastName}`} first />
          {catName && <DataRow icon="🏷️" label="Kategorie" value={catName} />}
          {athlete.club && <DataRow icon="🏔️" label="Verein" value={athlete.club} />}
          {athlete.nation && <DataRow icon="🌍" label="Nation" value={athlete.nation} />}
        </div>

        {/* Status card */}
        <div style={{
          borderRadius: 14, overflow: 'hidden',
          border: `1px solid ${st.border}`,
          background: st.bg,
          marginBottom: 28,
        }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${st.border}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: st.color, flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: st.color }}>
              Status: {st.label}
            </span>
          </div>
          <div style={{ padding: '12px 18px' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#a6b0c3', lineHeight: 1.6 }}>
              {st.hint}
            </p>
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={onEdit}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 12,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#a6b0c3', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#e8ecf3' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#a6b0c3' }}
        >
          <span style={{ fontSize: 15 }}>✎</span>
          Daten bearbeiten
        </button>
      </div>
    </div>
  )
}

function DataRow({ icon, label, value, first }: { icon: string; label: string; value: string; first?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 18px',
      borderTop: first ? 'none' : '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, width: 22, textAlign: 'center' }}>{icon}</span>
      <span style={{ fontSize: 12, color: '#6b7890', minWidth: 72, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#e8ecf3' }}>{value}</span>
    </div>
  )
}

// ── Step 2: Athletenprofil ───────────────────────────────────────────────────

function ProfileStep({ token, comp, categories, disciplineLabel }: {
  token: string; comp: Competition; categories: Category[]; disciplineLabel: string
}) {
  const [form, setForm] = useState<ProfileData>({
    firstName: '', lastName: '', dateOfBirth: '', gender: '',
    club: '', nation: '', licenseNumber: '', categoryId: '',
  })
  const [loadingMe, setLoadingMe] = useState(true)
  const [alreadyRegistered, setAlreadyRegistered] = useState<{
    athlete: ExistingAthlete; registration: ExistingRegistration
  } | null>(null)
  const [editing, setEditing] = useState(false)
  const [success, setSuccess] = useState(false)

  // Load existing profile / registration
  useEffect(() => {
    const bearerToken = getToken()
    if (!bearerToken) {
      // Fall back to Keycloak token data only
      const parsed = keycloak.tokenParsed as Record<string, string> | undefined
      if (parsed) {
        setForm(p => ({
          ...p,
          firstName: parsed.given_name ?? p.firstName,
          lastName: parsed.family_name ?? p.lastName,
        }))
      }
      setLoadingMe(false)
      return
    }

    fetch(`${BASE}/competitions/by-token/${token}/me`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { athlete: ExistingAthlete | Record<string, never>; registration: ExistingRegistration | Record<string, never> } | null) => {
        if (!data) {
          // No profile yet — use Keycloak data
          const parsed = keycloak.tokenParsed as Record<string, string> | undefined
          setForm(p => ({
            ...p,
            firstName: parsed?.given_name ?? p.firstName,
            lastName: parsed?.family_name ?? p.lastName,
          }))
          return
        }

        const athlete = 'id' in data.athlete ? data.athlete as ExistingAthlete : null
        const registration = data.registration && 'id' in data.registration
          ? data.registration as ExistingRegistration
          : null

        if (athlete) {
          // Pre-fill form in all cases (needed for the "edit" flow)
          setForm({
            firstName: athlete.firstName ?? '',
            lastName: athlete.lastName ?? '',
            dateOfBirth: athlete.dateOfBirth ?? '',
            gender: athlete.gender ?? '',
            club: athlete.club ?? '',
            nation: athlete.nation ?? '',
            licenseNumber: athlete.licenseNumber ?? '',
            categoryId: registration?.categoryId ?? '',
          })
          // Already registered for this competition
          if (registration) {
            setAlreadyRegistered({ athlete, registration })
            return
          }
        } else {
          // No athlete profile — use Keycloak data
          const parsed = keycloak.tokenParsed as Record<string, string> | undefined
          setForm(p => ({
            ...p,
            firstName: parsed?.given_name ?? p.firstName,
            lastName: parsed?.family_name ?? p.lastName,
          }))
        }
      })
      .catch(() => {
        const parsed = keycloak.tokenParsed as Record<string, string> | undefined
        setForm(p => ({
          ...p,
          firstName: parsed?.given_name ?? p.firstName,
          lastName: parsed?.family_name ?? p.lastName,
        }))
      })
      .finally(() => setLoadingMe(false))
  }, [token])

  const register = useMutation({
    mutationFn: async () => {
      const bearerToken = getToken()
      const headers = {
        'Content-Type': 'application/json',
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      }

      // Update existing athlete + registration
      if (alreadyRegistered?.athlete && alreadyRegistered?.registration) {
        const athleteRes = await fetch(`${BASE}/athletes/${alreadyRegistered.athlete.id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            dateOfBirth: form.dateOfBirth || null,
            gender: form.gender || null,
            club: form.club || null,
            nation: form.nation || null,
            licenseNumber: form.licenseNumber || null,
          }),
        })
        if (!athleteRes.ok) throw new Error('Fehler beim Speichern der Athletendaten')

        const regRes = await fetch(`${BASE}/registrations/${alreadyRegistered.registration.id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ categoryId: form.categoryId || null }),
        })
        if (!regRes.ok) throw new Error('Fehler beim Speichern der Kategorie')

        return { updated: true }
      }

      // New registration
      const res = await fetch(`${BASE}/competitions/by-token/${token}/register`, {
        method: 'POST', headers,
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          club: form.club || null,
          nation: form.nation || null,
          licenseNumber: form.licenseNumber || null,
          categoryId: form.categoryId || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? 'Fehler bei der Anmeldung')
      }
      return res.json()
    },
    onSuccess: (result) => {
      if (result?.updated && alreadyRegistered) {
        // Refresh the displayed data and go back to confirmation screen
        setAlreadyRegistered(prev => prev ? {
          ...prev,
          athlete: {
            ...prev.athlete,
            firstName: form.firstName,
            lastName: form.lastName,
            dateOfBirth: form.dateOfBirth || null,
            gender: form.gender || null,
            club: form.club || null,
            nation: form.nation || null,
            licenseNumber: form.licenseNumber || null,
          },
          registration: prev.registration
            ? { ...prev.registration, categoryId: form.categoryId || null }
            : prev.registration,
        } : prev)
        setEditing(false)
      } else {
        setSuccess(true)
      }
    },
  })

  if (loadingMe) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a6b0c3', fontSize: 15 }}>
        Lädt…
      </div>
    )
  }

  if (alreadyRegistered && !editing) {
    return (
      <AlreadyRegistered
        comp={comp}
        disciplineLabel={disciplineLabel}
        athlete={alreadyRegistered.athlete}
        categories={categories}
        categoryId={alreadyRegistered.registration?.categoryId ?? null}
        status={alreadyRegistered.registration?.status ?? 'PENDING'}
        onEdit={() => setEditing(true)}
      />
    )
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Anmeldung erfolgreich!</h1>
        <p style={{ color: '#a6b0c3', fontSize: 15, textAlign: 'center', maxWidth: 340 }}>
          Du bist für <strong style={{ color: '#e8ecf3' }}>{comp.name}</strong> angemeldet. Viel Erfolg!
        </p>
      </div>
    )
  }

  const valid = !!(form.firstName.trim() && form.lastName.trim())

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

          <Field text="Geschlecht">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.gender}
              onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
              {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>

          {categories.length > 0 && (
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
            {register.isPending
              ? (editing ? 'Speichern…' : 'Anmeldung läuft…')
              : (editing ? 'Änderungen speichern' : 'Jetzt anmelden')}
          </button>

          {editing && (
            <button
              onClick={() => { setEditing(false); register.reset() }}
              style={{
                padding: '10px 24px', borderRadius: 12, background: 'none',
                border: 'none', color: '#6b7890', fontSize: 14,
                cursor: 'pointer', fontFamily: 'inherit', width: '100%',
              }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function RegisterPage() {
  const { token } = useParams<{ token: string }>()
  const [kcReady, setKcReady] = useState(false)
  const [kcAuthenticated, setKcAuthenticated] = useState(false)

  useEffect(() => {
    keycloak.init({ onLoad: 'check-sso', checkLoginIframe: false })
      .then(authenticated => {
        setKcAuthenticated(authenticated)
        setKcReady(true)
        if (authenticated) {
          setInterval(() => keycloak.updateToken(30).catch(() => {}), 30_000)
        }
      })
      .catch(() => setKcReady(true))
  }, [])

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

  if (!kcReady || isLoading) {
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

  if (!kcAuthenticated) {
    return <LoginStep comp={comp} disciplineLabel={disciplineLabel} />
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
