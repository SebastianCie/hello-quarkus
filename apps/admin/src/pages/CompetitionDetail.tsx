import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type CompetitionCategory, type Route } from '@/api/client'
import {
  Card, SectionLabel, Field, Input, Select, PrimaryButton, GhostButton, DangerButton, Modal, StatusBadge
} from '@/components/FormUI'

const GENDERS = [
  { value: '', label: '— alle —' },
  { value: 'FEMALE', label: 'Weiblich' },
  { value: 'MALE', label: 'Männlich' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'DIVERSE', label: 'Divers' },
]

// ── Category types ────────────────────────────────────────────────────────────
type CatForm = { name: string; gender: string; ageMin: string; ageMax: string; maxParticipants: string }
const emptyCat = (): CatForm => ({ name: '', gender: '', ageMin: '', ageMax: '', maxParticipants: '' })

// ── Route inline row ──────────────────────────────────────────────────────────
type RouteRow = { routeNumber: string; discipline: string; grade: string; maxScore: string; sortOrder: string; categoryId: string }
const emptyRow = (): RouteRow => ({ routeNumber: '', discipline: '', grade: '', maxScore: '', sortOrder: '', categoryId: '' })

function routeToRow(r: Route): RouteRow {
  return {
    routeNumber: r.routeNumber ?? '',
    discipline: r.discipline ?? '',
    grade: r.grade ?? '',
    maxScore: r.maxScore?.toString() ?? '',
    sortOrder: r.sortOrder?.toString() ?? '',
    categoryId: r.categoryId ?? '',
  }
}

const COL = { number: 70, discipline: 120, grade: 90, maxScore: 90, category: 160, actions: 130 }

function RouteInlineRow({
  row, onChange, onSave, onCancel, pending, categories,
}: {
  row: RouteRow
  onChange: (r: RouteRow) => void
  onSave: () => void
  onCancel: () => void
  pending: boolean
  categories: CompetitionCategory[]
}) {
  const cellInput: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6, color: '#e8ecf3', fontSize: 13, padding: '4px 8px', width: '100%', boxSizing: 'border-box',
  }
  return (
    <tr style={{ background: 'rgba(108,240,194,0.06)' }}>
      <td style={{ padding: '6px 8px', width: COL.number }}>
        <input style={cellInput} value={row.routeNumber} placeholder="#"
          onChange={e => onChange({ ...row, routeNumber: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px', width: COL.discipline }}>
        <input style={cellInput} value={row.discipline} placeholder="z.B. Boulder"
          onChange={e => onChange({ ...row, discipline: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px', width: COL.grade }}>
        <input style={cellInput} value={row.grade} placeholder="z.B. 6b"
          onChange={e => onChange({ ...row, grade: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px', width: COL.maxScore }}>
        <input style={cellInput} type="number" value={row.maxScore} placeholder="—"
          onChange={e => onChange({ ...row, maxScore: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px', width: COL.category }}>
        <select style={{ ...cellInput, cursor: 'pointer' }} value={row.categoryId}
          onChange={e => onChange({ ...row, categoryId: e.target.value })}>
          <option value="">— alle —</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      <td style={{ padding: '6px 8px', width: COL.actions }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <PrimaryButton onClick={onSave} disabled={pending} style={{ padding: '4px 10px', fontSize: 12 }}>
            {pending ? '…' : 'Speichern'}
          </PrimaryButton>
          <GhostButton onClick={onCancel} style={{ padding: '4px 10px', fontSize: 12 }}>Abbrechen</GhostButton>
        </div>
      </td>
    </tr>
  )
}

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
    setCatForm({ name: cat.name, gender: cat.gender ?? '', ageMin: cat.ageMin ?? '', ageMax: cat.ageMax ?? '', maxParticipants: cat.maxParticipants?.toString() ?? '' })
    setCatModal({ mode: 'edit', cat })
  }

  const saveCat = useMutation({
    mutationFn: () => {
      const payload = { compId: id!, name: catForm.name, gender: catForm.gender || null, ageMin: catForm.ageMin || null, ageMax: catForm.ageMax || null, maxParticipants: catForm.maxParticipants ? parseInt(catForm.maxParticipants) : null }
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

  // ── Route inline editing ────────────────────────────────────────────────────
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<RouteRow>(emptyRow())
  const [newRow, setNewRow] = useState<RouteRow | null>(null)

  function startEdit(route: Route) {
    setNewRow(null)
    setEditingRouteId(route.id)
    setEditingRow(routeToRow(route))
  }
  function cancelEdit() { setEditingRouteId(null) }
  function startNew() {
    setEditingRouteId(null)
    setNewRow(emptyRow())
  }
  function cancelNew() { setNewRow(null) }

  function buildPayload(row: RouteRow) {
    return {
      compId: id!,
      routeNumber: row.routeNumber || null,
      discipline: row.discipline || null,
      grade: row.grade || null,
      maxScore: row.maxScore ? parseInt(row.maxScore) : null,
      sortOrder: row.sortOrder ? parseInt(row.sortOrder) : null,
      categoryId: row.categoryId || null,
    }
  }

  const updateRoute = useMutation({
    mutationFn: () => api.routes.update(editingRouteId!, buildPayload(editingRow)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes', id] }); setEditingRouteId(null) },
  })

  const createRoute = useMutation({
    mutationFn: () => api.routes.create(buildPayload(newRow!)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes', id] }); setNewRow(null) },
  })

  const deleteRoute = useMutation({
    mutationFn: (routeId: string) => api.routes.delete(routeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes', id] }),
  })

  if (compLoading || !comp) return <div style={{ color: '#a6b0c3' }}>Lädt…</div>

  const thStyle: React.CSSProperties = { padding: '6px 8px', color: '#6b7890', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }
  const tdStyle: React.CSSProperties = { padding: '10px 8px', fontSize: 13, color: '#e8ecf3', borderBottom: '1px solid rgba(255,255,255,0.05)' }

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => navigate('/dashboard/wettkampfe')}
          style={{ background: 'none', border: 'none', color: '#6cf0c2', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 12 }}>
          ← Zurück zur Übersicht
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <p style={{ color: '#6cf0c2', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px' }}>Wettkampf</p>
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
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px' }}>
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
                <DangerButton onClick={() => { if (confirm(`"${cat.name}" wirklich löschen?`)) deleteCat.mutate(cat.id) }}>Löschen</DangerButton>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Routes — inline table */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionLabel>Routen / Boulder</SectionLabel>
          {!newRow && <PrimaryButton onClick={startNew}>+ Route</PrimaryButton>}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Nr.</th>
                <th style={thStyle}>Disziplin</th>
                <th style={thStyle}>Grad</th>
                <th style={thStyle}>Max. Pkt.</th>
                <th style={thStyle}>Kategorie</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {routes.length === 0 && !newRow && (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, color: '#a6b0c3', textAlign: 'center', padding: '20px 8px' }}>
                    Noch keine Routen angelegt.
                  </td>
                </tr>
              )}
              {(routes as Route[]).map(route =>
                editingRouteId === route.id ? (
                  <RouteInlineRow key={route.id}
                    row={editingRow} onChange={setEditingRow}
                    onSave={() => updateRoute.mutate()} onCancel={cancelEdit}
                    pending={updateRoute.isPending} categories={categories}
                  />
                ) : (
                  <tr key={route.id} style={{ transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={tdStyle}>{route.routeNumber ? `#${route.routeNumber}` : <span style={{ color: '#6b7890' }}>—</span>}</td>
                    <td style={tdStyle}>{route.discipline ?? <span style={{ color: '#6b7890' }}>—</span>}</td>
                    <td style={tdStyle}>{route.grade ?? <span style={{ color: '#6b7890' }}>—</span>}</td>
                    <td style={tdStyle}>{route.maxScore != null ? route.maxScore : <span style={{ color: '#6b7890' }}>—</span>}</td>
                    <td style={tdStyle}>
                      {route.categoryId
                        ? categories.find((c: CompetitionCategory) => c.id === route.categoryId)?.name ?? '—'
                        : <span style={{ color: '#6b7890' }}>alle</span>}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <GhostButton onClick={() => startEdit(route)} style={{ padding: '4px 10px', fontSize: 12 }}>Bearbeiten</GhostButton>
                        <DangerButton onClick={() => { if (confirm(`Route "${route.routeNumber ?? '—'}" wirklich löschen?`)) deleteRoute.mutate(route.id) }} style={{ padding: '4px 10px', fontSize: 12 }}>Löschen</DangerButton>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {newRow && (
                <RouteInlineRow
                  row={newRow} onChange={setNewRow}
                  onSave={() => createRoute.mutate()} onCancel={cancelNew}
                  pending={createRoute.isPending} categories={categories}
                />
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Category Modal */}
      {catModal && (
        <Modal title={catModal.mode === 'new' ? 'Neue Kategorie' : 'Kategorie bearbeiten'} onClose={() => setCatModal(null)}>
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
    </div>
  )
}
