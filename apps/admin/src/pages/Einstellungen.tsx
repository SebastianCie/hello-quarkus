import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, SectionLabel, PrimaryButton } from '@/components/FormUI'

function NumberRow({ label, description, value, onChange, min, unit }: {
  label: string
  description: string
  value: string
  onChange: (v: string) => void
  min?: number
  unit?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#e8ecf3', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: '#6b7890' }}>{description}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <input
          type="number"
          min={min ?? 0}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: 80, background: '#1a2235', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, color: '#e8ecf3', fontSize: 15, padding: '8px 12px',
            textAlign: 'center', fontFamily: 'inherit',
          }}
        />
        {unit && <span style={{ fontSize: 13, color: '#a6b0c3' }}>{unit}</span>}
      </div>
    </div>
  )
}

function UrlRow({ label, description, value, placeholder, onChange }: {
  label: string
  description: string
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#e8ecf3', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#6b7890', marginBottom: 10 }}>{description}</div>
      <input
        type="url"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', background: '#1a2235', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, color: '#e8ecf3', fontSize: 13, padding: '8px 12px',
          fontFamily: 'monospace', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export function Einstellungen() {
  const qc = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.getAll,
  })

  const [interval, setInterval] = useState<string | null>(null)
  const [perPage, setPerPage] = useState<string | null>(null)
  const [scoreboardUrl, setScoreboardUrl] = useState<string | null>(null)
  const [registerUrl, setRegisterUrl] = useState<string | null>(null)
  const [athleteUrl, setAthleteUrl] = useState<string | null>(null)

  const intervalVal = interval ?? (settings?.['scoreboard_interval_seconds'] ?? '5')
  const perPageVal = perPage ?? (settings?.['scoreboard_athletes_per_page'] ?? '0')
  const scoreboardUrlVal = scoreboardUrl ?? (settings?.['scoreboard_base_url'] ?? '')
  const registerUrlVal = registerUrl ?? (settings?.['register_base_url'] ?? '')
  const athleteUrlVal = athleteUrl ?? (settings?.['athlete_base_url'] ?? '')

  const save = useMutation({
    mutationFn: async () => {
      await api.settings.update('scoreboard_interval_seconds', intervalVal)
      await api.settings.update('scoreboard_athletes_per_page', perPageVal)
      await api.settings.update('scoreboard_base_url', scoreboardUrlVal)
      await api.settings.update('register_base_url', registerUrlVal)
      await api.settings.update('athlete_base_url', athleteUrlVal)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setInterval(null)
      setPerPage(null)
      setScoreboardUrl(null)
      setRegisterUrl(null)
      setAthleteUrl(null)
    },
  })

  const isDirty = interval !== null || perPage !== null || scoreboardUrl !== null || registerUrl !== null || athleteUrl !== null
  const origin = window.location.origin

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: '#6cf0c2', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Konfiguration
        </p>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Einstellungen</h1>
        <p style={{ color: '#a6b0c3', fontSize: 14, margin: '10px 0 0' }}>
          Globale Konfiguration für Liveanzeige und App-URLs.
        </p>
      </div>

      <Card>
        <SectionLabel>Liveanzeige (Scoreboard)</SectionLabel>
        <div style={{ marginTop: 8 }}>
          <NumberRow
            label="Seitenwechsel-Intervall"
            description="Wie lange eine Seite angezeigt wird, bevor automatisch zur nächsten gewechselt wird."
            value={intervalVal}
            onChange={setInterval}
            min={1}
            unit="Sekunden"
          />
          <NumberRow
            label="Athleten pro Seite"
            description="Wie viele Athleten pro Seite angezeigt werden. 0 = automatisch anhand der Bildschirmhöhe berechnen."
            value={perPageVal}
            onChange={setPerPage}
            min={0}
            unit="Athleten (0 = auto)"
          />
        </div>
      </Card>

      <Card style={{ marginTop: 24 }}>
        <SectionLabel>App-URLs</SectionLabel>
        <p style={{ fontSize: 13, color: '#a6b0c3', margin: '12px 0 4px' }}>
          Basis-URLs der einzelnen Apps. Leer lassen = gleiche Domain wie diese Admin-App (<code style={{ color: '#6cf0c2', fontSize: 12 }}>{origin}</code>).
        </p>
        <div style={{ marginTop: 8 }}>
          <UrlRow
            label="Scoreboard-URL"
            description="Basis-URL der Scoreboard-App. Wird für Links auf der Wettkampf-Detailseite verwendet."
            value={scoreboardUrlVal}
            placeholder={origin}
            onChange={setScoreboardUrl}
          />
          <UrlRow
            label="Selbstregistrierungs-URL"
            description="Basis-URL der Register-App. Wird für QR-Code-Links auf der Wettkampf-Detailseite verwendet."
            value={registerUrlVal}
            placeholder={origin}
            onChange={setRegisterUrl}
          />
          <UrlRow
            label="Athleten-App-URL"
            description="Basis-URL der Athleten-App. Wird nach der Selbstregistrierung als Weiterleitung angezeigt."
            value={athleteUrlVal}
            placeholder={origin}
            onChange={setAthleteUrl}
          />
        </div>
      </Card>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
        <PrimaryButton onClick={() => save.mutate()} disabled={save.isPending || !isDirty}>
          {save.isPending ? 'Speichert…' : 'Speichern'}
        </PrimaryButton>
        {!isDirty && !save.isPending && (
          <span style={{ fontSize: 12, color: '#6b7890' }}>Keine Änderungen</span>
        )}
        {save.isError && (
          <span style={{ fontSize: 12, color: '#ff5d6b' }}>
            {save.error instanceof Error ? save.error.message : 'Fehler'}
          </span>
        )}
      </div>
    </div>
  )
}
