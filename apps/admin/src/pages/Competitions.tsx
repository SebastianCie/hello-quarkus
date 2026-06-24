import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, type Competition, type Location } from '@/api/client'
import {
  Card, Field, Input, Select, PrimaryButton, GhostButton, DangerButton, Modal, StatusBadge
} from '@/components/FormUI'

function slugify(v: string) {
  return v.toLowerCase().trim()
    .replace(/[äöü]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c] ?? c))
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const DISCIPLINES = [
  { value: 'BOULDERN', label: 'Bouldern' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'SPEED', label: 'Speed' },
]
const FORMATS = [
  { value: 'FUN', label: 'Spaßwettkampf' },
  { value: 'OFFICIAL', label: 'Offizieller Wettkampf' },
]
const STATUSES = [
  { value: 'DRAFT', label: 'Entwurf' },
  { value: 'OPEN', label: 'Offen' },
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'CLOSED', label: 'Beendet' },
]

type CompForm = {
  name: string; slug: string; discipline: string; format: string; status: string
  startDate: string; endDate: string; venue: string; locationId: string
  selfRegistration: boolean; genderBasedCategories: boolean; autoConfirm: boolean
  registrationOpensAt: string; registrationClosesAt: string
}

const emptyForm = (): CompForm => ({
  name: '', slug: '', discipline: 'BOULDERN', format: 'FUN', status: 'DRAFT',
  startDate: '', endDate: '', venue: '', locationId: '', selfRegistration: false,
  genderBasedCategories: false, autoConfirm: false, registrationOpensAt: '', registrationClosesAt: '',
})

export function Competitions() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: org } = useQuery({ queryKey: ['org', 'mine'], queryFn: api.organizations.mine })
  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ['competitions', org?.id],
    queryFn: () => api.competitions.list(org!.id),
    enabled: !!org,
  })
  const { data: locations = [] } = useQuery({
    queryKey: ['locations', org?.id],
    queryFn: () => api.locations.list(org!.id),
    enabled: !!org,
  })

  const [modal, setModal] = useState<{ mode: 'new' | 'edit'; comp?: Competition } | null>(null)
  const [form, setForm] = useState<CompForm>(emptyForm())
  const [slugManual, setSlugManual] = useState(false)

  function openNew() {
    setForm(emptyForm()); setSlugManual(false); setModal({ mode: 'new' })
  }
  function openEdit(comp: Competition) {
    setForm({
      name: comp.name, slug: comp.slug, discipline: comp.discipline, format: comp.format, status: comp.status,
      startDate: comp.startDate?.slice(0, 16) ?? '',
      endDate: comp.endDate?.slice(0, 16) ?? '',
      venue: comp.venue ?? '', locationId: comp.locationId ?? '',
      selfRegistration: comp.selfRegistration,
      genderBasedCategories: comp.genderBasedCategories,
      autoConfirm: comp.autoConfirm,
      registrationOpensAt: comp.registrationOpensAt?.slice(0, 16) ?? '',
      registrationClosesAt: comp.registrationClosesAt?.slice(0, 16) ?? '',
    })
    setSlugManual(true)
    setModal({ mode: 'edit', comp })
  }

  function set(field: keyof CompForm, value: string | boolean) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !slugManual && typeof value === 'string') next.slug = slugify(value)
      return next
    })
  }

  const save = useMutation({
    mutationFn: () => {
      if (form.startDate && form.endDate && new Date(form.startDate) >= new Date(form.endDate)) {
        return Promise.reject(new Error('Startdatum muss vor dem Enddatum liegen.'))
      }
      const payload = {
        orgId: org!.id,
        name: form.name, slug: form.slug, discipline: form.discipline,
        format: form.format, status: form.status,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        venue: form.venue || null,
        locationId: form.locationId || null,
        selfRegistration: form.selfRegistration,
        genderBasedCategories: form.genderBasedCategories,
        autoConfirm: form.autoConfirm,
        registrationOpensAt: form.selfRegistration && form.registrationOpensAt ? new Date(form.registrationOpensAt).toISOString() : null,
        registrationClosesAt: form.selfRegistration && form.registrationClosesAt ? new Date(form.registrationClosesAt).toISOString() : null,
      }
      return modal?.mode === 'edit' && modal.comp
        ? api.competitions.update(modal.comp.id, payload)
        : api.competitions.create(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['competitions', org?.id] }); setModal(null) },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.competitions.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competitions', org?.id] }),
  })

  function locationName(id: string | null) {
    if (!id) return null
    return locations.find((l: Location) => l.id === id)?.name ?? null
  }

  if (isLoading) return <div style={{ color: '#a6b0c3' }}>Lädt…</div>

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ color: '#6cf0c2', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Verwaltung
          </p>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Wettkämpfe</h1>
        </div>
        <PrimaryButton onClick={openNew}>+ Neuer Wettkampf</PrimaryButton>
      </div>

      {competitions.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: '#a6b0c3', margin: '0 0 20px' }}>Noch keine Wettkämpfe angelegt.</p>
          <PrimaryButton onClick={openNew}>Ersten Wettkampf anlegen</PrimaryButton>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {competitions.map((comp: Competition) => (
            <div key={comp.id} style={{
              background: '#121a2b', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: '#e8ecf3', fontSize: 15 }}>{comp.name}</span>
                  <StatusBadge status={comp.status} />
                </div>
                <div style={{ fontSize: 12, color: '#a6b0c3', display: 'flex', gap: 12 }}>
                  <span>{DISCIPLINES.find(d => d.value === comp.discipline)?.label ?? comp.discipline}</span>
                  <span>{FORMATS.find(f => f.value === comp.format)?.label ?? comp.format}</span>
                  {comp.startDate && (
                    <span>
                      {new Date(comp.startDate).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                      {comp.endDate && ` – ${new Date(comp.endDate).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}`}
                    </span>
                  )}
                  {locationName(comp.locationId) && <span>{locationName(comp.locationId)}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <PrimaryButton onClick={() => navigate(`/dashboard/wettkampfe/${comp.id}`)}>Verwalten</PrimaryButton>
                <GhostButton onClick={() => openEdit(comp)}>Bearbeiten</GhostButton>
                <DangerButton onClick={() => { if (confirm(`"${comp.name}" wirklich löschen?`)) remove.mutate(comp.id) }}>
                  Löschen
                </DangerButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <Modal
          title={modal.mode === 'new' ? 'Neuer Wettkampf' : 'Wettkampf bearbeiten'}
          onClose={() => setModal(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Name" required>
              <Input value={form.name} onChange={e => { set('name', e.target.value) }} required />
            </Field>

            <Field label="URL-Kürzel" required>
              <Input
                value={form.slug}
                onChange={e => { setSlugManual(true); set('slug', e.target.value) }}
                pattern="[a-z0-9-]+"
                required
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Disziplin" required>
                <Select value={form.discipline} onChange={e => set('discipline', e.target.value)}>
                  {DISCIPLINES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </Select>
              </Field>
              <Field label="Format" required>
                <Select value={form.format} onChange={e => set('format', e.target.value)}>
                  {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </Select>
              </Field>
            </div>

            <Field label="Status">
              <Select value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Start (Datum & Uhrzeit)">
                <Input type="datetime-local" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
              </Field>
              <Field label="Ende (Datum & Uhrzeit)">
                <Input type="datetime-local" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
              </Field>
            </div>
            {form.startDate && form.endDate && new Date(form.startDate) >= new Date(form.endDate) && (
              <div style={{
                background: 'rgba(255, 93, 107, 0.12)',
                border: '1px solid rgba(255, 93, 107, 0.4)',
                borderRadius: 8, padding: '8px 12px',
                fontSize: 13, color: '#ff5d6b',
              }}>
                Startdatum muss vor dem Enddatum liegen.
              </div>
            )}

            <Field label="Standort">
              <Select value={form.locationId} onChange={e => set('locationId', e.target.value)}>
                <option value="">— keiner —</option>
                {locations.map((l: Location) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.selfRegistration}
                onChange={e => set('selfRegistration', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#6cf0c2' }}
              />
              <span style={{ fontSize: 13, color: '#e8ecf3' }}>Selbstregistrierung für Athleten</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.genderBasedCategories}
                onChange={e => set('genderBasedCategories', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#6cf0c2' }}
              />
              <span style={{ fontSize: 13, color: '#e8ecf3' }}>Kategorie nach Geschlecht (Frauen / Männer)</span>
            </label>
            {form.genderBasedCategories && modal?.mode === 'edit' && (
              <div style={{
                background: 'rgba(255,196,0,0.08)', border: '1px solid rgba(255,196,0,0.3)',
                borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#ffc400',
              }}>
                Vorhandene manuelle Kategorien werden ignoriert, bleiben aber gespeichert. Athleten werden automatisch nach Geschlecht gruppiert.
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.autoConfirm}
                onChange={e => set('autoConfirm', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#6cf0c2' }}
              />
              <span style={{ fontSize: 13, color: '#e8ecf3' }}>Automatische Bestätigung von Athleten</span>
            </label>
            {form.autoConfirm && (
              <div style={{
                background: 'rgba(108,240,194,0.06)', border: '1px solid rgba(108,240,194,0.2)',
                borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#6cf0c2',
              }}>
                Jeder neu registrierte Athlet wird sofort bestätigt und in die erste Runde eingetragen.
              </div>
            )}

            {form.selfRegistration && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Anmeldung von">
                  <Input type="datetime-local" value={form.registrationOpensAt} onChange={e => set('registrationOpensAt', e.target.value)} />
                </Field>
                <Field label="Anmeldung bis">
                  <Input type="datetime-local" value={form.registrationClosesAt} onChange={e => set('registrationClosesAt', e.target.value)} />
                </Field>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <PrimaryButton onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? 'Speichert…' : 'Speichern'}
              </PrimaryButton>
              <GhostButton onClick={() => setModal(null)}>Abbrechen</GhostButton>
            </div>
            {save.isError && (
              <p style={{ color: '#ff5d6b', fontSize: 13, margin: 0 }}>
                {save.error instanceof Error ? save.error.message : 'Fehler beim Speichern'}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
