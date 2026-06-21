import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Card, SectionLabel, PrimaryButton } from '@/components/FormUI'

function SettingRow({ label, description, value, onChange, min, unit }: {
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

export function Liveanzeige() {
  const qc = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.getAll,
  })

  const [interval, setInterval] = useState<string | null>(null)
  const [perPage, setPerPage] = useState<string | null>(null)

  const intervalVal = interval ?? (settings?.['scoreboard_interval_seconds'] ?? '5')
  const perPageVal = perPage ?? (settings?.['scoreboard_athletes_per_page'] ?? '0')

  const save = useMutation({
    mutationFn: async () => {
      await api.settings.update('scoreboard_interval_seconds', intervalVal)
      await api.settings.update('scoreboard_athletes_per_page', perPageVal)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setInterval(null)
      setPerPage(null)
    },
  })

  const isDirty = interval !== null || perPage !== null

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: '#6cf0c2', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Konfiguration
        </p>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Liveanzeige</h1>
        <p style={{ color: '#a6b0c3', fontSize: 14, margin: '10px 0 0' }}>
          Einstellungen für das Scoreboard das auf dem Beamer in der Halle läuft.
        </p>
      </div>

      <Card>
        <SectionLabel>Seitensteuerung</SectionLabel>
        <div style={{ marginTop: 8 }}>
          <SettingRow
            label="Seitenwechsel-Intervall"
            description="Wie lange eine Seite angezeigt wird, bevor automatisch zur nächsten gewechselt wird."
            value={intervalVal}
            onChange={setInterval}
            min={1}
            unit="Sekunden"
          />
          <SettingRow
            label="Athleten pro Seite"
            description="Wie viele Athleten pro Seite angezeigt werden. 0 = automatisch anhand der Bildschirmhöhe berechnen."
            value={perPageVal}
            onChange={setPerPage}
            min={0}
            unit="Athleten (0 = auto)"
          />
        </div>

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
      </Card>

      <Card style={{ marginTop: 24 }}>
        <SectionLabel>Scoreboard-URL</SectionLabel>
        <p style={{ fontSize: 13, color: '#a6b0c3', margin: '12px 0' }}>
          Das Scoreboard ist öffentlich zugänglich und benötigt keine Anmeldung. Die URL enthält den Wettkampf-Slug, den du im Wettkampf-Detail findest.
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '12px 16px', fontFamily: 'monospace',
          fontSize: 14, color: '#6cf0c2',
        }}>
          http://localhost:3003/<span style={{ color: '#ffc400' }}>wettkampf-slug</span>
        </div>
        <p style={{ fontSize: 12, color: '#6b7890', margin: '10px 0 0' }}>
          Den genauen Link findest du auf der Detailseite des jeweiligen Wettkampfs.
        </p>
      </Card>
    </div>
  )
}
