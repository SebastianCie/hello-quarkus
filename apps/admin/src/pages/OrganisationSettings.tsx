import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Location } from '@/api/client'
import { Card, SectionLabel, Field, Input, PrimaryButton, GhostButton, DangerButton, Modal } from '@/components/FormUI'

function slugify(v: string) {
  return v.toLowerCase().trim()
    .replace(/[äöü]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c] ?? c))
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function OrganisationSettings() {
  const qc = useQueryClient()
  const { data: org, isLoading } = useQuery({ queryKey: ['org', 'mine'], queryFn: api.organizations.mine })
  const { data: locations = [] } = useQuery({
    queryKey: ['locations', org?.id],
    queryFn: () => api.locations.list(org!.id),
    enabled: !!org,
  })

  // ── Org form ──────────────────────────────────────────────────────────────
  const [orgForm, setOrgForm] = useState({ name: '', slug: '', contactEmail: '', logoUrl: '' })
  const [orgSlugManual, setOrgSlugManual] = useState(false)
  const [orgSaved, setOrgSaved] = useState(false)
  const [orgLoaded, setOrgLoaded] = useState(false)

  if (org && !orgLoaded) {
    setOrgForm({
      name: org.name,
      slug: org.slug,
      contactEmail: org.contactEmail ?? '',
      logoUrl: org.logoUrl ?? '',
    })
    setOrgLoaded(true)
  }

  const updateOrg = useMutation({
    mutationFn: () => api.organizations.update(org!.id, {
      name: orgForm.name,
      slug: orgForm.slug,
      contactEmail: orgForm.contactEmail || null,
      logoUrl: orgForm.logoUrl || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org', 'mine'] }); setOrgSaved(true); setTimeout(() => setOrgSaved(false), 2000) },
  })

  function setOrg(field: string, value: string) {
    setOrgForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !orgSlugManual) next.slug = slugify(value)
      return next
    })
  }

  // ── Location modal ────────────────────────────────────────────────────────
  const [editLocation, setEditLocation] = useState<Location | null>(null)
  const [showNewLocation, setShowNewLocation] = useState(false)
  const [locForm, setLocForm] = useState({ name: '', city: '', address: '', country: 'DE' })

  function openEdit(loc: Location) {
    setLocForm({ name: loc.name, city: loc.city ?? '', address: loc.address ?? '', country: loc.country })
    setEditLocation(loc)
  }

  function openNew() {
    setLocForm({ name: '', city: '', address: '', country: 'DE' })
    setShowNewLocation(true)
  }

  const saveLocation = useMutation({
    mutationFn: () => editLocation
      ? api.locations.update(editLocation.id, { name: locForm.name, city: locForm.city || null, address: locForm.address || null, country: locForm.country })
      : api.locations.create({ orgId: org!.id, name: locForm.name, city: locForm.city || null, address: locForm.address || null, country: locForm.country }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations', org?.id] }); setEditLocation(null); setShowNewLocation(false) },
  })

  const deleteLocation = useMutation({
    mutationFn: (id: string) => api.locations.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations', org?.id] }),
  })

  if (isLoading) return <div style={{ color: '#a6b0c3' }}>Lädt…</div>

  return (
    <div style={{ maxWidth: 680 }}>
      <p style={{ color: '#6cf0c2', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
        Einstellungen
      </p>
      <h1 style={{ margin: '0 0 28px', fontSize: 26, fontWeight: 700 }}>Organisation & Standorte</h1>

      {/* Org form */}
      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>Organisation</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Name" required>
            <Input value={orgForm.name} onChange={e => setOrg('name', e.target.value)} required />
          </Field>
          <Field label="URL-Kürzel" hint="Nur Kleinbuchstaben, Zahlen und Bindestriche." required>
            <Input
              value={orgForm.slug}
              onChange={e => { setOrgSlugManual(true); setOrg('slug', e.target.value) }}
              pattern="[a-z0-9-]+"
              required
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Kontakt-E-Mail">
              <Input type="email" value={orgForm.contactEmail} onChange={e => setOrg('contactEmail', e.target.value)} />
            </Field>
            <Field label="Logo URL">
              <Input type="url" value={orgForm.logoUrl} onChange={e => setOrg('logoUrl', e.target.value)} />
            </Field>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <PrimaryButton onClick={() => updateOrg.mutate()} disabled={updateOrg.isPending}>
              {updateOrg.isPending ? 'Speichert…' : 'Speichern'}
            </PrimaryButton>
            {orgSaved && <span style={{ color: '#6cf0c2', fontSize: 13 }}>Gespeichert</span>}
            {updateOrg.isError && (
              <span style={{ color: '#ff5d6b', fontSize: 13 }}>
                {updateOrg.error instanceof Error ? updateOrg.error.message : 'Fehler'}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Locations */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <SectionLabel>Standorte</SectionLabel>
          <GhostButton onClick={openNew} style={{ marginBottom: 0, marginTop: -20 }}>+ Standort</GhostButton>
        </div>

        {locations.length === 0 && (
          <p style={{ color: '#a6b0c3', fontSize: 13, margin: 0 }}>Noch keine Standorte angelegt.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {locations.map(loc => (
            <div key={loc.id} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#e8ecf3', fontSize: 14 }}>{loc.name}</div>
                <div style={{ fontSize: 12, color: '#a6b0c3', marginTop: 2 }}>
                  {[loc.city, loc.address].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <GhostButton onClick={() => openEdit(loc)}>Bearbeiten</GhostButton>
                <DangerButton onClick={() => { if (confirm('Standort wirklich löschen?')) deleteLocation.mutate(loc.id) }}>
                  Löschen
                </DangerButton>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Edit/New Location Modal */}
      {(editLocation || showNewLocation) && (
        <Modal
          title={editLocation ? 'Standort bearbeiten' : 'Neuer Standort'}
          onClose={() => { setEditLocation(null); setShowNewLocation(false) }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Name" required>
              <Input value={locForm.name} onChange={e => setLocForm(p => ({ ...p, name: e.target.value }))} required />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Stadt">
                <Input value={locForm.city} onChange={e => setLocForm(p => ({ ...p, city: e.target.value }))} />
              </Field>
              <Field label="Land">
                <Input value={locForm.country} onChange={e => setLocForm(p => ({ ...p, country: e.target.value }))} maxLength={10} />
              </Field>
            </div>
            <Field label="Adresse">
              <Input value={locForm.address} onChange={e => setLocForm(p => ({ ...p, address: e.target.value }))} />
            </Field>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <PrimaryButton onClick={() => saveLocation.mutate()} disabled={saveLocation.isPending}>
                {saveLocation.isPending ? 'Speichert…' : 'Speichern'}
              </PrimaryButton>
              <GhostButton onClick={() => { setEditLocation(null); setShowNewLocation(false) }}>Abbrechen</GhostButton>
            </div>
            {saveLocation.isError && (
              <p style={{ color: '#ff5d6b', fontSize: 13, margin: 0 }}>
                {saveLocation.error instanceof Error ? saveLocation.error.message : 'Fehler beim Speichern'}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
