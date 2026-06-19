import React, { useState, useMemo } from 'react'
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

type CatForm = { name: string; gender: string; ageMin: string; ageMax: string; maxParticipants: string }
const emptyCat = (): CatForm => ({ name: '', gender: '', ageMin: '', ageMax: '', maxParticipants: '' })

type RouteRow = { routeNumber: string; name: string; sortOrder: string; grade: string; maxScore: string; categoryId: string }
const emptyRow = (): RouteRow => ({ routeNumber: '', name: '', sortOrder: '', grade: '', maxScore: '', categoryId: '' })

function routeToRow(r: Route): RouteRow {
  return {
    routeNumber: r.routeNumber ?? '', name: r.name ?? '',
    sortOrder: r.sortOrder?.toString() ?? '', grade: r.grade ?? '',
    maxScore: r.maxScore?.toString() ?? '', categoryId: r.categoryId ?? '',
  }
}

type SortCol = 'routeNumber' | 'name' | 'sortOrder' | 'grade' | 'maxScore'

function sortRoutes(routes: Route[], col: SortCol, dir: 'asc' | 'desc'): Route[] {
  return [...routes].sort((a, b) => {
    const av = a[col] ?? ''
    const bv = b[col] ?? ''
    const numeric = col === 'sortOrder' || col === 'maxScore'
    const cmp = numeric
      ? (Number(av) || 0) - (Number(bv) || 0)
      : String(av).localeCompare(String(bv), 'de')
    return dir === 'asc' ? cmp : -cmp
  })
}

const COL = { number: 70, name: 160, sortOrder: 100, grade: 90, maxScore: 90, actions: 160 }

function RouteInlineRow({
  row, onChange, onSave, onCancel, pending, error, categories,
}: {
  row: RouteRow; onChange: (r: RouteRow) => void
  onSave: () => void; onCancel: () => void
  pending: boolean; error?: string | null
  categories: CompetitionCategory[]
}) {
  const cell: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6, color: '#e8ecf3', fontSize: 13, padding: '4px 8px', width: '100%', boxSizing: 'border-box',
  }
  return (
    <tr style={{ background: 'rgba(108,240,194,0.06)' }}>
      <td style={{ padding: '6px 8px', width: COL.number }}>
        <input style={cell} value={row.routeNumber} placeholder="#" onChange={e => onChange({ ...row, routeNumber: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px', width: COL.name }}>
        <input style={cell} value={row.name} placeholder="Name" onChange={e => onChange({ ...row, name: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px', width: COL.sortOrder }}>
        <input style={cell} type="number" value={row.sortOrder} placeholder="—" onChange={e => onChange({ ...row, sortOrder: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px', width: COL.grade }}>
        <input style={cell} value={row.grade} placeholder="z.B. 6b" onChange={e => onChange({ ...row, grade: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px', width: COL.maxScore }}>
        <input style={cell} type="number" value={row.maxScore} placeholder="—" onChange={e => onChange({ ...row, maxScore: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px', width: COL.actions }} colSpan={2}>
        <select style={{ ...cell, cursor: 'pointer', marginBottom: 4 }} value={row.categoryId}
          onChange={e => onChange({ ...row, categoryId: e.target.value })}>
          <option value="">— alle Kategorien —</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          <PrimaryButton onClick={onSave} disabled={pending} style={{ padding: '4px 10px', fontSize: 12 }}>
            {pending ? '…' : 'Speichern'}
          </PrimaryButton>
          <GhostButton onClick={onCancel} style={{ padding: '4px 10px', fontSize: 12 }}>Abbrechen</GhostButton>
        </div>
        {error && <span style={{ color: '#ff5d6b', fontSize: 11, display: 'block', marginTop: 4 }}>{error}</span>}
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

  // ── Sort + group state ──────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState<SortCol>('sortOrder')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [grouped, setGrouped] = useState(true)

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // ── Sorted + grouped routes ─────────────────────────────────────────────────
  const sorted = useMemo(() => sortRoutes(routes as Route[], sortCol, sortDir), [routes, sortCol, sortDir])

  const groups = useMemo(() => {
    const map = new Map<string | null, Route[]>()
    map.set(null, [])
    for (const cat of categories as CompetitionCategory[]) map.set(cat.id, [])
    for (const r of sorted) {
      const key = r.categoryId ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return map
  }, [sorted, categories])

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

  function startEdit(route: Route) { setNewRow(null); setEditingRouteId(route.id); setEditingRow(routeToRow(route)) }
  function cancelEdit() { setEditingRouteId(null) }
  function startNew() { setEditingRouteId(null); setNewRow(emptyRow()) }
  function cancelNew() { setNewRow(null) }

  function buildPayload(row: RouteRow) {
    return {
      compId: id!,
      routeNumber: row.routeNumber || null, name: row.name || null,
      grade: row.grade || null, maxScore: row.maxScore ? parseInt(row.maxScore) : null,
      sortOrder: row.sortOrder ? parseInt(row.sortOrder) : null, categoryId: row.categoryId || null,
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

  function renderRouteRow(route: Route, catId: string | null) {
    if (editingRouteId === route.id) {
      return (
        <RouteInlineRow key={route.id}
          row={editingRow} onChange={setEditingRow}
          onSave={() => updateRoute.mutate()} onCancel={cancelEdit}
          pending={updateRoute.isPending}
          error={updateRoute.isError ? (updateRoute.error instanceof Error ? updateRoute.error.message : 'Fehler') : null}
          categories={categories as CompetitionCategory[]}
        />
      )
    }
    const catName = catId
      ? (categories as CompetitionCategory[]).find(c => c.id === catId)?.name ?? '—'
      : 'alle'
    return (
      <tr key={route.id}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <td style={tdStyle}>{route.routeNumber ?? <span style={{ color: '#6b7890' }}>—</span>}</td>
        <td style={tdStyle}>{route.name ?? <span style={{ color: '#6b7890' }}>—</span>}</td>
        <td style={tdStyle}>{route.sortOrder != null ? route.sortOrder : <span style={{ color: '#6b7890' }}>—</span>}</td>
        <td style={tdStyle}>{route.grade ?? <span style={{ color: '#6b7890' }}>—</span>}</td>
        <td style={tdStyle}>{route.maxScore != null ? route.maxScore : <span style={{ color: '#6b7890' }}>—</span>}</td>
        <td style={tdStyle} colSpan={2}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: '#a6b0c3', fontSize: 12 }}>{catName}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <GhostButton onClick={() => startEdit(route)} style={{ padding: '4px 10px', fontSize: 12 }}>Bearbeiten</GhostButton>
              <DangerButton onClick={() => { if (confirm(`Route "${route.routeNumber ?? '—'}" wirklich löschen?`)) deleteRoute.mutate(route.id) }} style={{ padding: '4px 10px', fontSize: 12 }}>Löschen</DangerButton>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  const thBase: React.CSSProperties = {
    padding: '6px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap',
  }
  const thSort = (col: SortCol): React.CSSProperties => ({
    ...thBase, cursor: 'pointer', userSelect: 'none',
    color: sortCol === col ? '#6cf0c2' : '#6b7890',
  })
  const tdStyle: React.CSSProperties = { padding: '10px 8px', fontSize: 13, color: '#e8ecf3', borderBottom: '1px solid rgba(255,255,255,0.05)' }
  const arrow = (col: SortCol) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const groupHeaderStyle: React.CSSProperties = {
    background: 'rgba(108,240,194,0.07)',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: '#6cf0c2', padding: '6px 8px',
    borderTop: '1px solid rgba(108,240,194,0.2)',
  }

  const totalCols = 7

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
            {(categories as CompetitionCategory[]).map(cat => (
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

      {/* Routes */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionLabel>Routen / Boulder</SectionLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            <GhostButton onClick={() => setGrouped(g => !g)} style={{ fontSize: 12, padding: '4px 12px' }}>
              {grouped ? 'Gruppierung aufheben' : 'Nach Kategorie gruppieren'}
            </GhostButton>
            {!newRow && <PrimaryButton onClick={startNew}>+ Route</PrimaryButton>}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thSort('routeNumber')} onClick={() => toggleSort('routeNumber')}>Nr.{arrow('routeNumber')}</th>
                <th style={thSort('name')} onClick={() => toggleSort('name')}>Name{arrow('name')}</th>
                <th style={thSort('sortOrder')} onClick={() => toggleSort('sortOrder')}>Reihenfolge{arrow('sortOrder')}</th>
                <th style={thSort('grade')} onClick={() => toggleSort('grade')}>Grad{arrow('grade')}</th>
                <th style={thSort('maxScore')} onClick={() => toggleSort('maxScore')}>Max. Pkt.{arrow('maxScore')}</th>
                <th style={thBase} colSpan={2}>Kategorie</th>
              </tr>
            </thead>
            <tbody>
              {routes.length === 0 && !newRow ? (
                <tr>
                  <td colSpan={totalCols} style={{ ...tdStyle, color: '#a6b0c3', textAlign: 'center', padding: '20px 8px' }}>
                    Noch keine Routen angelegt.
                  </td>
                </tr>
              ) : (
                <>
                  {grouped
                    /* ── Grouped view ── */
                    ? [null, ...(categories as CompetitionCategory[]).map(c => c.id)].map(catId => {
                        const groupRoutes = groups.get(catId) ?? []
                        if (groupRoutes.length === 0) return null
                        const catLabel = catId
                          ? (categories as CompetitionCategory[]).find(c => c.id === catId)?.name ?? catId
                          : 'Alle Kategorien'
                        return (
                          <React.Fragment key={catId ?? '__all__'}>
                            <tr><td colSpan={totalCols} style={groupHeaderStyle}>{catLabel}</td></tr>
                            {groupRoutes.map(route => renderRouteRow(route, catId))}
                          </React.Fragment>
                        )
                      })
                    /* ── Flat view ── */
                    : sorted.map(route => renderRouteRow(route, route.categoryId ?? null))
                  }
                  {newRow && (
                    <RouteInlineRow
                      row={newRow} onChange={setNewRow}
                      onSave={() => createRoute.mutate()} onCancel={cancelNew}
                      pending={createRoute.isPending}
                      error={createRoute.isError ? (createRoute.error instanceof Error ? createRoute.error.message : 'Fehler') : null}
                      categories={categories as CompetitionCategory[]}
                    />
                  )}
                </>
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
