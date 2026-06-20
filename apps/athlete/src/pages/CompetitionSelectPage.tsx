import type { ActiveRegistration } from '../api'

type Props = {
  firstName: string
  registrations: ActiveRegistration[]
  onSelect: (reg: ActiveRegistration) => void
}

function disciplineLabel(d: string) {
  return d === 'BOULDERING' ? 'Bouldern' : d === 'LEAD' ? 'Lead' : d === 'SPEED' ? 'Speed' : d
}

export function CompetitionSelectPage({ firstName, registrations, onSelect }: Props) {
  return (
    <div style={{ minHeight: '100vh', padding: '32px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6cf0c2', marginBottom: 8 }}>
          Beta Battle
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Hallo, {firstName}!</h1>
        <p style={{ color: '#a6b0c3', fontSize: 14, marginBottom: 28 }}>
          Du bist für mehrere aktive Wettkämpfe angemeldet. Wähle aus:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {registrations.map(reg => (
            <button
              key={reg.registration.id}
              onClick={() => onSelect(reg)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '16px',
                color: '#e8ecf3', cursor: 'pointer', fontFamily: 'inherit',
                textAlign: 'left', width: '100%',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{reg.competition.name}</div>
              <div style={{ fontSize: 12, color: '#a6b0c3' }}>
                {disciplineLabel(reg.competition.discipline)}
                {reg.category && ` · ${reg.category.name}`}
                {reg.competition.startDate && (
                  ` · ${new Date(reg.competition.startDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
