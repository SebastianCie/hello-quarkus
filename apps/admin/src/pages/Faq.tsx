import { useState } from 'react'
import { SectionLabel } from '@/components/FormUI'

type Entry = { q: string; a: string }
type Section = { title: string; entries: Entry[] }

const FAQ: Section[] = [
  {
    title: 'Wettkämpfe',
    entries: [
      {
        q: 'Was bedeuten die verschiedenen Status-Werte bei einem Wettkampf?',
        a: `Ein Wettkampf durchläuft vier Status:

• Entwurf – Der Wettkampf wird noch eingerichtet und ist nicht für Athleten sichtbar.
• Offen – Der Wettkampf ist veröffentlicht und die Anmeldung ist für Athleten freigeschaltet.
• Aktiv – Der Wettkampftag läuft. Routen werden geklettert und Scores werden erfasst.
• Beendet – Der Wettkampf ist abgeschlossen. Ergebnisse sind final und können nicht mehr verändert werden.`,
      },
      {
        q: 'Was bedeutet das Feld "Format" bei einem Wettkampf?',
        a: `Das Format ist ein reines Informationsfeld und hat keinen Einfluss auf die Wettkampflogik. Es dient dazu, den Charakter des Wettkampfs auf einen Blick erkennbar zu machen:

• Spaßwettkampf – Lockere Veranstaltung ohne offizielle Wertung, z.B. Vereinsabende, Trainingswettkämpfe oder Events für Einsteiger.
• Offizieller Wettkampf – Formelle Veranstaltung mit offizieller Ergebnisliste, z.B. Vereinsmeisterschaften oder Ligawettkämpfe.`,
      },
      {
        q: 'Wann sollte ich Start- und Enddatum setzen?',
        a: 'Start- und Enddatum beschreiben den Zeitraum des Wettkampfs selbst (z.B. Wettkampftag 09:00–18:00 Uhr). Die Anmeldezeitraum wird separat über "Selbstregistrierung" mit eigenem Öffnungs- und Schlussdatum gesteuert.',
      },
    ],
  },
  {
    title: 'Kategorien & Routen',
    entries: [
      {
        q: 'Wozu dienen Kategorien?',
        a: 'Kategorien unterteilen Athleten innerhalb eines Wettkampfs, z.B. nach Geschlecht oder Altersklasse (Frauen, Männer, Junioren, Masters). Jeder Athlet wird bei der Anmeldung genau einer Kategorie zugewiesen.',
      },
      {
        q: 'Kann eine Route mehreren Kategorien zugeordnet werden?',
        a: 'Nein. Eine Route gehört entweder zu einer bestimmten Kategorie oder zu allen Kategorien (Standard). "Alle Kategorien" bedeutet, dass die Route von allen Teilnehmern geklettert wird, die Wertung aber kategoriebezogen erfolgt.',
      },
      {
        q: 'Was passiert, wenn Nr., Name oder Reihenfolge bereits vergeben sind?',
        a: 'Diese drei Felder müssen pro Wettkampf und Kategorie eindeutig sein. Beim Speichern erscheint eine Fehlermeldung, wenn ein Wert bereits existiert.',
      },
    ],
  },
  {
    title: 'Organisation & Standorte',
    entries: [
      {
        q: 'Kann ich mehrere Standorte anlegen?',
        a: 'Ja. Unter Organisation & Standorte kannst du beliebig viele Kletterhallen hinterlegen und diese dann beim Erstellen eines Wettkampfs auswählen.',
      },
    ],
  },
]

function FaqItem({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0', textAlign: 'left', gap: 16,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: '#e8ecf3' }}>{entry.q}</span>
        <span style={{ color: '#6cf0c2', fontSize: 16, flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && (
        <p style={{
          color: '#a6b0c3', fontSize: 13, lineHeight: 1.7,
          margin: '0 0 16px', whiteSpace: 'pre-line',
        }}>
          {entry.a}
        </p>
      )}
    </div>
  )
}

export function Faq() {
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: '#6cf0c2', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Support
        </p>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Hilfe & FAQ</h1>
      </div>

      {FAQ.map(section => (
        <div key={section.title} style={{ marginBottom: 36 }}>
          <SectionLabel>{section.title}</SectionLabel>
          <div style={{
            background: '#121a2b', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: '0 20px', marginTop: 12,
          }}>
            {section.entries.map(entry => (
              <FaqItem key={entry.q} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
