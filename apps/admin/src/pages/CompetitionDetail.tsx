import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type CompetitionCategory, type Route } from '@/api/client'
import {
  Card, SectionLabel, Field, Input, Select, PrimaryButton, GhostButton, DangerButton, Modal, StatusBadge
} from '@/components/FormUI'

const GENDERS = [
  { value: '', label: '— alle —' },
  { value: 'MALE', label: 'Männlich' },
  { value: 'FEMALE', label: 'Weiblich' },
  { value: 'MIXED', label: 'Mixed' },
]

type CatForm = { name: string; gender: string; ageMin: string; ageMax: string; maxParticipants: string }
const emptyCat = (): CatForm => ({ name: '', gender: '', ageMin: '', ageMax: '', maxParticipants: '' })

type RouteForm = { routeNumber: string; discipline: string; grade: string; maxScore: string; sortOrder: string; categoryId: string }
const emptyRoute = (): RouteForm => ({ routeNumber: '', discipline: '', grade: '', maxScore: '', sortOrder: '', categoryId: '' })

export function CompetitionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: comp, isLoading: compLoading } = useQuery({
    queryKey: ['competition', id],
    queryFn: () => api.competitions.get(id!),
    enabled: !!id,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', id],
    queryFn: () => api.categories.list(id!),
    enabled: !!id,
  })

  const { data: routes = [] } = useQuery({
    queryKey: ['routes', id],
    queryFn: () => api.routes.list(id!),
    enabled: !!id,
  })

  // ── Category modal ──────────────────────────────────────────────────────────
  const [catModal, setCatModal] = useState<{ mode: 'new' | 'edit'; cat?: CompetitionCategory } | null>(null)
  const [catForm, setCatForm] = useState<CatForm>(emptyCat())

  function openNewCat() { setCatForm(emptyCat()); setCatModal({ mode: 'new' }) }
  function openEditCat(cat: CompetitionCategory) {
    setCatForm({
      name: cat.name, gender: cat.gender ?? '',
      ageMin: cat.ageMin ?? '', ageMax: cat.ageMax ?? '',
      maxParticipants: cat.maxParticipants?.toString() ?? '',
    })
    setCatModal({ mode: 'edit', cat })
  }

  const saveCat = useMutation({
    mutationFn: () => {
      const payload = {
        compId: id!,
        name: catForm.name,
        gender: catForm.gender || null,
        ageMin: catForm.ageMin || null,
        ageMax: catForm.ageMax || null,
        maxParticipants: catForm.maxParticipants ? parseInt(catForm.maxParticipants) : null,
      }
      return catModal?.mode === 'edit' && catModal.cat
        ? api.categories.update(catModal.cat.id, payload)
        : api.categories.create(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories', id] }); setCatModal(null) },
  })

  const deleteCat = useMutation({
    mutationFn: (catId: string) => api.categories.delete(catId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', id] }),
  })

  // ── Route modal ─────────────────────────────────────────────────────────────
  const [routeModal, setRouteModal] = useState<{ mode: 'new' | 'edit'; route?: Route } | null>(null)
  const [routeForm, setRouteForm] = useState<RouteForm>(emptyRoute())

  function openNewRoute() { setRouteForm(emptyRoute()); setRouteModal({ mode: 'new' }) }
  function openEditRoute(route: Route) {
    setRouteForm({
      routeNumber: route.routeNumber ?? '',
      discipline: route.discipline ?? '',
      grade: route.grade ?? '',
      maxScore: route.maxScore?.toString() ?? '',
      sortOrder: route.sortOrder?.toString() ?? '',
      categoryId: route.categoryId ?? '',
    })
    setRouteModal({ mode: 'edit', route })
  }

  const saveRoute = useMutation({
    mutationFn: () => {
      const payload = {
        compId: id!,
        routeNumber: routeForm.routeNumber || null,
        discipline: routeForm.discipline || null,
        grade: routeForm.grade || null,
        maxScore: routeForm.maxScore ? parseInt(routeForm.maxScore) : null,
        sortOrder: routeForm.sortOrder ? parseInt(routeForm.sortOrder) : null,
        categoryId: routeForm.categoryId || null,
      }
      return routeModal?.mode === 'edit' && routeModal.route
        ? api.routes.update(routeModal.route.id, payload)
        : api.routes.create(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes', id] }); setRouteModal(null) },
  })

  const deleteRoute = useMutation({
    mutationFn: (routeId: string) => api.routes.delete(routeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes', id] }),
  })

  if (compLoading || !comp) return <div style={{ color: '#a6b0c3' }}>Lädt…</div>

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate('/dashboard/wettkampfe')}
          style={{ background: 'none', border: 'none', color: '#6cf0c2', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 12 }}
        >
          ← Zurück zur Übersicht
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <p style={{ color: '#6cf0c2', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              Wettkampf
            </p>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{comp.name}</h1>
          </div>
          <StatusBadge status={comp.status} />
        </div>
        {comp.startDate && (
          <p style={{ color: '#a6b0c3', fontSize: 13, margin: '8px 0 0' }}>
            {new Date(comp.startDate).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
            {comp.endDate && ` – ${new Date(comp.endDate).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}`}
          </p>
        )}
      </div>

      {/* Categories */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionLabel>Kategorien</SectionLabel>
          <PrimaryButton onClick={openNewCat}>+ Kategorie</PrimaryButton>
        </div>

        {categories.length === 0 ? (
          <p style={{ color: '#a6b0c3', fontSize: 13, margin: 0 }}>Noch keine Kategorien angelegt.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categories.map((cat: CompetitionCategory) => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px',
              }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#e8ecf3', fontSize: 14 }}>{cat.name}</span>
                  <span style={{ color: '#a6b0c3', fontSize: 12, marginLeft: 10 }}>
                    {GENDERS.find(g => g.value === cat.gender)?.label ?? ''}
                    {cat.ageMin && ` · ab ${cat.ageMin}`}
                    {cat.ageMax && ` · bis ${cat.ageMax}`}
                    {cat.maxParticipants && ` · max. ${cat.maxParticipants}`}
                  </span>
                </div>
                <GhostButton onClick={() => openEditCat(cat)}>Bearbeiten</GhostButton>
                <DangerButton onClick={() => { if (confirm(`"${cat.name}" wirklich löschen?`)) deleteCat.mutate(cat.id) }}>
                  Löschen
                </DangerButton>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Routes */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionLabel>Routen / Boulder</SectionLabel>
          <PrimaryButton onClick={openNewRoute}>+ Route</PrimaryButton>
        </div>

        {routes.length === 0 ? (
          <p style={{ color: '#a6b0c3', fontSize: 13, margin: 0 }}>Noch keine Routen angelegt.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {routes.map((route: Route) => {
              const catName = route.categoryId
                ? categories.find((c: CompetitionCategory) => c.id === route.categoryId)?.name
                : null
              return (
                <div key={route.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px',
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: '#e8ecf3', fontSize: 14 }}>
                      {route.routeNumber ? `#${route.routeNumber}` : '—'}
                    </span>
                    <span style={{ color: '#a6b0c3', fontSize: 12, marginLeft: 10 }}>
                      {route.grade && `Grad: ${route.grade}`}
                      {route.discipline && ` · ${route.discipline}`}
                      {route.maxScore != null && ` · max. ${route.maxScore} Pkt.`}
                      {catName ? ` · ${catName}` : ' · alle Kategorien'}
                    </span>
                  </div>
                  <GhostButton onClick={() => openEditRoute(route)}>Bearbeiten</GhostButton>
                  <DangerButton onClick={() => { if (confirm(`Route "${route.routeNumber ?? '—'}" wirklich löschen?`)) deleteRoute.mutate(route.id) }}>
                    Löschen
                  </DangerButton>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Category Modal */}
      {catModal && (
        <Modal
          title={catModal.mode === 'new' ? 'Neue Kategorie' : 'Kategorie bearbeiten'}
          onClose={() => setCatModal(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Name" required>
              <Input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} required />
            </Field>
            <Field label="Geschlecht">
              <Select value={catForm.gender} onChange={e => setCatForm(p => ({ ...p, gender: e.target.value }))}>
                {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </Select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Mindestalter">
                <Input value={catForm.ageMin} onChange={e => setCatForm(p => ({ ...p, ageMin: e.target.value }))} placeholder="z.B. 18" />
              </Field>
              <Field label="Höchstalter">
                <Input value={catForm.ageMax} onChange={e => setCatForm(p => ({ ...p, ageMax: e.target.value }))} placeholder="z.B. 35" />
              </Field>
            </div>
            <Field label="Max. Teilnehmer">
              <Input type="number" value={catForm.maxParticipants} onChange={e => setCatForm(p => ({ ...p, maxParticipants: e.target.value }))} placeholder="optional" />
            </Field>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <PrimaryButton onClick={() => saveCat.mutate()} disabled={saveCat.isPending || !catForm.name}>
                {saveCat.isPending ? 'Speichert…' : 'Speichern'}
              </PrimaryButton>
              <GhostButton onClick={() => setCatModal(null)}>Abbrechen</GhostButton>
            </div>
            {saveCat.isError && (
              <p style={{ color: '#ff5d6b', fontSize: 13, margin: 0 }}>
                {saveCat.error instanceof Error ? saveCat.error.message : 'Fehler beim Speichern'}
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Route Modal */}
      {routeModal && (
        <Modal
          title={routeModal.mode === 'new' ? 'Neue Route' : 'Route bearbeiten'}
          onClose={() => setRouteModal(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Nummer">
                <Input value={routeForm.routeNumber} onChange={e => setRouteForm(p => ({ ...p, routeNumber: e.target.value }))} placeholder="z.B. 1" />
              </Field>
              <Field label="Reihenfolge">
                <Input type="number" value={routeForm.sortOrder} onChange={e => setRouteForm(p => ({ ...p, sortOrder: e.target.value }))} placeholder="optional" />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Disziplin">
                <Input value={routeForm.discipline} onChange={e => setRouteForm(p => ({ ...p, discipline: e.target.value }))} placeholder="z.B. Boulder" />
              </Field>
              <Field label="Grad / Schwierigkeit">
                <Input value={routeForm.grade} onChange={e => setRouteForm(p => ({ ...p, grade: e.target.value }))} placeholder="z.B. 6b" />
              </Field>
            </div>
            <Field label="Max. Punkte">
              <Input type="number" value={routeForm.maxScore} onChange={e => setRouteForm(p => ({ ...p, maxScore: e.target.value }))} placeholder="optional" />
            </Field>
            <Field label="Kategorie">
              <Select value={routeForm.categoryId} onChange={e => setRouteForm(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">— alle Kategorien —</option>
                {categories.map((c: CompetitionCategory) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <PrimaryButton onClick={() => saveRoute.mutate()} disabled={saveRoute.isPending}>
                {saveRoute.isPending ? 'Speichert…' : 'Speichern'}
              </PrimaryButton>
              <GhostButton onClick={() => setRouteModal(null)}>Abbrechen</GhostButton>
            </div>
            {saveRoute.isError && (
              <p style={{ color: '#ff5d6b', fontSize: 13, margin: 0 }}>
                {saveRoute.error instanceof Error ? saveRoute.error.message : 'Fehler beim Speichern'}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
