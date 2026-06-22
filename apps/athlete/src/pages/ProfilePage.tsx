import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMe, updateAthlete } from '../api'
import type { Athlete } from '../api'

const ACCENT = '#6cf0c2'
const DARK = '#020231'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  color: '#e8ecf3',
  fontSize: 15,
  padding: '12px 14px',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#a6b0c3', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <span style={{ fontSize: 13, color: '#a6b0c3' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: value ? '#e8ecf3' : '#4a5568' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

type FormState = {
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
  club: string
  nation: string
  licenseNumber: string
}

function toForm(a: Athlete): FormState {
  return {
    firstName: a.firstName,
    lastName: a.lastName,
    dateOfBirth: a.dateOfBirth ?? '',
    gender: a.gender ?? '',
    club: a.club ?? '',
    nation: a.nation ?? '',
    licenseNumber: a.licenseNumber ?? '',
  }
}

export function ProfilePage() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [saved, setSaved] = useState(false)

  const athlete = data?.athlete
  if (!athlete) return null

  const startEdit = () => {
    setForm(toForm(athlete))
    setEditing(true)
    setSaved(false)
  }

  const cancel = () => {
    setEditing(false)
    setForm(null)
  }

  const save = useMutation({
    mutationFn: (f: FormState) => updateAthlete(athlete.id, {
      orgId: athlete.orgId,
      firstName: f.firstName,
      lastName: f.lastName,
      dateOfBirth: f.dateOfBirth || null,
      gender: f.gender || null,
      club: f.club || null,
      nation: f.nation || null,
      licenseNumber: f.licenseNumber || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      setEditing(false)
      setForm(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => prev ? { ...prev, [key]: e.target.value } : prev)

  const genderLabel = (g: string | null) =>
    g === 'MALE' ? 'Männlich' : g === 'FEMALE' ? 'Weiblich' : g === 'OTHER' ? 'Divers' : null

  return (
    <div style={{ padding: '24px 16px 32px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Mein Profil</h2>
        {!editing && (
          <button
            onClick={startEdit}
            style={{
              padding: '8px 18px', borderRadius: 8,
              background: 'rgba(108,240,194,0.12)', border: `1px solid ${ACCENT}44`,
              color: ACCENT, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Bearbeiten
          </button>
        )}
      </div>

      {saved && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(108,240,194,0.12)', border: `1px solid ${ACCENT}44`,
          color: ACCENT, fontSize: 13, fontWeight: 600,
        }}>
          Profil gespeichert ✓
        </div>
      )}

      {!editing ? (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '0 16px' }}>
          <InfoRow label="Vorname" value={athlete.firstName} />
          <InfoRow label="Nachname" value={athlete.lastName} />
          <InfoRow label="Geburtsdatum" value={athlete.dateOfBirth
            ? new Date(athlete.dateOfBirth).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : null}
          />
          <InfoRow label="Geschlecht" value={genderLabel(athlete.gender)} />
          <InfoRow label="Verein" value={athlete.club} />
          <InfoRow label="Nation" value={athlete.nation} />
          <InfoRow label="Lizenznummer" value={athlete.licenseNumber} />
        </div>
      ) : form && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Vorname">
              <input style={inputStyle} value={form.firstName} onChange={set('firstName')} placeholder="Vorname" />
            </Field>
            <Field label="Nachname">
              <input style={inputStyle} value={form.lastName} onChange={set('lastName')} placeholder="Nachname" />
            </Field>
          </div>

          <Field label="Geburtsdatum">
            <input style={inputStyle} type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
          </Field>

          <Field label="Geschlecht">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.gender} onChange={set('gender')}>
              <option value="">— nicht angegeben —</option>
              <option value="MALE">Männlich</option>
              <option value="FEMALE">Weiblich</option>
              <option value="OTHER">Divers</option>
            </select>
          </Field>

          <Field label="Verein">
            <input style={inputStyle} value={form.club} onChange={set('club')} placeholder="Verein (optional)" />
          </Field>

          <Field label="Nation">
            <input style={inputStyle} value={form.nation} onChange={set('nation')} placeholder="z. B. GER (optional)" />
          </Field>

          <Field label="Lizenznummer">
            <input style={inputStyle} value={form.licenseNumber} onChange={set('licenseNumber')} placeholder="Lizenznummer (optional)" />
          </Field>

          {save.isError && (
            <p style={{ color: '#ff5d6b', fontSize: 13, margin: 0 }}>
              Fehler beim Speichern. Bitte versuche es erneut.
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              onClick={() => form && save.mutate(form)}
              disabled={save.isPending || !form.firstName || !form.lastName}
              style={{
                flex: 1, padding: '14px', borderRadius: 12,
                background: save.isPending ? 'rgba(108,240,194,0.4)' : ACCENT,
                color: DARK, border: 'none', fontSize: 15, fontWeight: 700,
                cursor: save.isPending ? 'default' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {save.isPending ? 'Speichern…' : 'Speichern'}
            </button>
            <button
              onClick={cancel}
              disabled={save.isPending}
              style={{
                padding: '14px 20px', borderRadius: 12,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#a6b0c3', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
