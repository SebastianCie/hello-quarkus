import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type CompetitionCategory, type Route, type Registration, type RegistrationWithAthlete, type Athlete, type ScoringConfig, type CompetitionRound, type AdvancementPreview, type AdvancementAthlete, type RoundCategoryStatus } from '@/api/client'
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

type RouteRow = { routeNumber: string; name: string; sortOrder: string; grade: string; maxScore: string; categoryId: string; roundId: string }
const emptyRow = (roundId = ''): RouteRow => ({ routeNumber: '', name: '', sortOrder: '', grade: '', maxScore: '', categoryId: '', roundId })

function routeToRow(r: Route): RouteRow {
  return {
    routeNumber: r.routeNumber ?? '', name: r.name ?? '',
    sortOrder: r.sortOrder?.toString() ?? '', grade: r.grade ?? '',
    maxScore: r.maxScore?.toString() ?? '', categoryId: r.categoryId ?? '',
    roundId: r.roundId ?? '',
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
  row, onChange, onSave, onCancel, pending, error, categories, rounds,
}: {
  row: RouteRow; onChange: (r: RouteRow) => void
  onSave: () => void; onCancel: () => void
  pending: boolean; error?: string | null
  categories: CompetitionCategory[]
  rounds: CompetitionRound[]
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
        {rounds.length > 0 && (
          <select style={{ ...cell, cursor: 'pointer', marginBottom: 4 }} value={row.roundId}
            onChange={e => onChange({ ...row, roundId: e.target.value })}>
            <option value="">— Runde —</option>
            {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
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

const ROUND_STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'Bevorstehend', ACTIVE: 'Aktiv', CLOSED: 'Abgeschlossen',
}
const ROUND_STATUS_COLOR: Record<string, string> = {
  UPCOMING: '#a6b0c3', ACTIVE: '#6cf0c2', CLOSED: '#6b7890',
}

type RoundForm = { name: string; slug: string; sortOrder: string; advancementCount: string; startAt: string; endAt: string; status: string }
const emptyRoundForm = (): RoundForm => ({ name: '', slug: '', sortOrder: '0', advancementCount: '', startAt: '', endAt: '', status: 'UPCOMING' })

function roundToForm(r: CompetitionRound): RoundForm {
  return {
    name: r.name, slug: r.slug, sortOrder: r.sortOrder.toString(),
    advancementCount: r.advancementCount?.toString() ?? '',
    startAt: r.startAt ? r.startAt.slice(0, 16) : '',
    endAt: r.endAt ? r.endAt.slice(0, 16) : '',
    status: r.status,
  }
}

function AdvancementModal({ round, preview, categories, onClose, onConfirm, isPending }: {
  round: CompetitionRound
  preview: AdvancementPreview
  categories: CompetitionCategory[]
  onClose: () => void
  onConfirm: (categoryId: string | null, ids: string[]) => void
  isPending: boolean
}) {
  // Category picker: null = alle, string = specific categoryId
  const openCategories = preview.categories.filter(c => !c.alreadyClosed)
  const [selectedCatId, setSelectedCatId] = useState<string | null>(
    openCategories.length === 1 ? (openCategories[0].categoryId ?? null) : null
  )

  const visibleCats = selectedCatId !== null
    ? preview.categories.filter(c => c.categoryId === selectedCatId)
    : preview.categories.filter(c => !c.alreadyClosed)

  const [advancing, setAdvancing] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const cat of preview.categories) {
      if (cat.alreadyClosed) continue
      for (const a of cat.advancing) initial.add(a.registrationId)
    }
    return initial
  })

  // Reset checkboxes when category selection changes
  React.useEffect(() => {
    const initial = new Set<string>()
    for (const cat of visibleCats) {
      for (const a of cat.advancing) initial.add(a.registrationId)
    }
    setAdvancing(initial)
  }, [selectedCatId]) // eslint-disable-line react-hooks/exhaustive_deps

  function toggle(id: string) {
    setAdvancing(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const athleteRow = (a: AdvancementAthlete) => (
    <div key={a.registrationId} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 10px', borderRadius: 6,
      background: advancing.has(a.registrationId) ? 'rgba(108,240,194,0.08)' : 'rgba(255,255,255,0.03)',
    }}>
      <input type="checkbox" checked={advancing.has(a.registrationId)} onChange={() => toggle(a.registrationId)}
        style={{ cursor: 'pointer', accentColor: '#6cf0c2' }} />
      {a.rank != null && (
        <span style={{ fontSize: 11, color: '#6b7890', width: 24, textAlign: 'center', flexShrink: 0 }}>#{a.rank}</span>
      )}
      <span style={{ flex: 1, fontSize: 13, color: '#e8ecf3' }}>{a.lastName}, {a.firstName}</span>
      {a.startNumber && <span style={{ fontSize: 12, color: '#a6b0c3' }}>{a.startNumber}</span>}
      <span style={{ fontSize: 12, fontWeight: 700, color: advancing.has(a.registrationId) ? '#6cf0c2' : '#6b7890' }}>
        {a.totalPoints.toFixed(1)}
      </span>
    </div>
  )

  const hasMultipleOpenCats = openCategories.length > 1
  const confirmLabel = selectedCatId !== null
    ? `${categories.find(c => c.id === selectedCatId)?.name ?? 'Kategorie'} abschließen`
    : 'Alle Kategorien abschließen'

  return (
    <Modal title={`Runde abschließen: ${round.name}`} onClose={onClose}>
      {/* Category picker */}
      {hasMultipleOpenCats && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Für welche Kategorie?
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setSelectedCatId(null)} style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: 'none',
              background: selectedCatId === null ? '#6cf0c2' : 'rgba(255,255,255,0.08)',
              color: selectedCatId === null ? '#0a0f1e' : '#a6b0c3', fontWeight: selectedCatId === null ? 700 : 400,
            }}>Alle</button>
            {openCategories.map(cat => (
              <button key={cat.categoryId ?? '__none__'} onClick={() => setSelectedCatId(cat.categoryId ?? null)} style={{
                padding: '5px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: 'none',
                background: selectedCatId === cat.categoryId ? '#6cf0c2' : 'rgba(255,255,255,0.08)',
                color: selectedCatId === cat.categoryId ? '#0a0f1e' : '#a6b0c3',
                fontWeight: selectedCatId === cat.categoryId ? 700 : 400,
              }}>{cat.categoryName}</button>
            ))}
          </div>
          {preview.categories.some(c => c.alreadyClosed) && (
            <p style={{ fontSize: 11, color: '#6b7890', margin: '8px 0 0' }}>
              Bereits abgeschlossen: {preview.categories.filter(c => c.alreadyClosed).map(c => c.categoryName).join(', ')}
            </p>
          )}
        </div>
      )}

      {!preview.allScoresComplete && (
        <div style={{ background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#ffc400', fontWeight: 600 }}>Nicht alle Scores eingetragen!</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#a6b0c3' }}>
            Fehlende Einträge bei: {preview.missingScoreAthletes.join(', ')}
          </p>
        </div>
      )}

      <p style={{ fontSize: 13, color: '#a6b0c3', margin: '0 0 16px' }}>
        Haken = Athlet kommt in die nächste Runde weiter.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: 360, overflowY: 'auto' }}>
        {visibleCats.map(cat => (
          <div key={cat.categoryId ?? '__none__'}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6cf0c2', marginBottom: 6 }}>
              {cat.categoryName} — Top {cat.advancementCount} weiter
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[...cat.advancing, ...cat.eliminated].map(a => athleteRow(a))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <PrimaryButton onClick={() => onConfirm(selectedCatId, [...advancing])} disabled={isPending}>
          {isPending ? 'Schließt…' : confirmLabel}
        </PrimaryButton>
        <GhostButton onClick={onClose}>Abbrechen</GhostButton>
      </div>
    </Modal>
  )
}

function RoundsSection({ compId, categories }: { compId: string; categories: CompetitionCategory[] }) {
  const qc = useQueryClient()
  const [roundModal, setRoundModal] = useState<{ mode: 'new' | 'edit'; round?: CompetitionRound } | null>(null)
  const [roundForm, setRoundForm] = useState<RoundForm>(emptyRoundForm())
  const [closeTarget, setCloseTarget] = useState<{ round: CompetitionRound; preview: AdvancementPreview } | null>(null)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: rounds = [] } = useQuery({
    queryKey: ['rounds', compId],
    queryFn: () => api.rounds.list(compId),
  })

  const { data: allCatStatuses = [] } = useQuery({
    queryKey: ['round-cat-statuses', compId],
    queryFn: () => api.rounds.allCategoryStatuses(compId),
  })
  const catStatusByRound = new Map<string, RoundCategoryStatus[]>()
  for (const s of allCatStatuses as RoundCategoryStatus[]) {
    if (!catStatusByRound.has(s.roundId)) catStatusByRound.set(s.roundId, [])
    catStatusByRound.get(s.roundId)!.push(s)
  }

  const saveRound = useMutation({
    mutationFn: () => {
      const payload: Omit<CompetitionRound, 'id'> = {
        compId,
        name: roundForm.name,
        slug: roundForm.slug || roundForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        sortOrder: parseInt(roundForm.sortOrder) || 0,
        advancementCount: roundForm.advancementCount ? parseInt(roundForm.advancementCount) : null,
        startAt: roundForm.startAt ? roundForm.startAt + ':00Z' : null,
        endAt: roundForm.endAt ? roundForm.endAt + ':00Z' : null,
        status: roundForm.status,
      }
      if (roundModal?.mode === 'edit' && roundModal.round)
        return api.rounds.update(roundModal.round.id, payload)
      return api.rounds.create(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rounds', compId] }); setRoundModal(null) },
  })

  const deleteRound = useMutation({
    mutationFn: (id: string) => api.rounds.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rounds', compId] }),
    onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Fehler beim Löschen'),
  })

  const closeRound = useMutation({
    mutationFn: ({ id, categoryId, ids }: { id: string; categoryId: string | null; ids: string[] }) =>
      api.rounds.close(id, categoryId, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rounds', compId] })
      qc.invalidateQueries({ queryKey: ['round-cat-statuses', compId] })
      setCloseTarget(null)
    },
  })

  async function openCloseModal(round: CompetitionRound) {
    setPreviewLoading(round.id)
    try {
      const preview = await api.rounds.advancementPreview(round.id)
      setCloseTarget({ round, preview })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Fehler beim Laden der Vorschau')
    } finally {
      setPreviewLoading(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6, color: '#e8ecf3', fontSize: 13, padding: '6px 10px', boxSizing: 'border-box',
  }

  return (
    <Card style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <SectionLabel>Runden</SectionLabel>
        <PrimaryButton onClick={() => {
          const nextOrder = (rounds as CompetitionRound[]).length > 0
            ? Math.max(...(rounds as CompetitionRound[]).map(r => r.sortOrder)) + 1
            : 0
          setRoundForm({ ...emptyRoundForm(), sortOrder: nextOrder.toString() })
          setRoundModal({ mode: 'new' })
        }}>
          + Runde
        </PrimaryButton>
      </div>

      {deleteError && (
        <div style={{ background: 'rgba(255,93,107,0.1)', border: '1px solid rgba(255,93,107,0.3)', borderRadius: 8, padding: '8px 14px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#ff5d6b', flex: 1 }}>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} style={{ background: 'none', border: 'none', color: '#ff5d6b', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {(rounds as CompetitionRound[]).length === 0 ? (
        <p style={{ color: '#a6b0c3', fontSize: 13, margin: 0 }}>Noch keine Runden konfiguriert.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(rounds as CompetitionRound[]).map(round => {
            const roundCatStatuses = catStatusByRound.get(round.id) ?? []
            return (
            <div key={round.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: '#e8ecf3', fontSize: 14 }}>{round.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                      background: (ROUND_STATUS_COLOR[round.status] ?? '#a6b0c3') + '22',
                      color: ROUND_STATUS_COLOR[round.status] ?? '#a6b0c3',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      {ROUND_STATUS_LABEL[round.status] ?? round.status}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#6b7890' }}>
                    Reihenfolge: {round.sortOrder}
                    {round.advancementCount != null ? ` · Top ${round.advancementCount} weiter` : ' · Finale'}
                  </span>
                  {/* Per-category status badges */}
                  {roundCatStatuses.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {roundCatStatuses.map(cs => {
                        const catName = categories.find(c => c.id === cs.categoryId)?.name ?? cs.categoryId
                        const closed = cs.status === 'CLOSED'
                        return (
                          <span key={cs.id} style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                            background: closed ? 'rgba(107,120,144,0.2)' : 'rgba(108,240,194,0.12)',
                            color: closed ? '#6b7890' : '#6cf0c2',
                            letterSpacing: '0.06em',
                          }}>
                            {catName}: {closed ? 'Abgeschlossen' : 'Aktiv'}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {round.status === 'ACTIVE' && round.advancementCount != null && (
                  <PrimaryButton
                    onClick={() => openCloseModal(round)}
                    disabled={previewLoading === round.id}
                    style={{ fontSize: 12, padding: '4px 12px', background: 'rgba(255,200,0,0.15)', color: '#ffc400', border: '1px solid rgba(255,200,0,0.3)' }}>
                    {previewLoading === round.id ? '…' : 'Runde abschließen'}
                  </PrimaryButton>
                )}
                <GhostButton onClick={() => { setRoundForm(roundToForm(round)); setRoundModal({ mode: 'edit', round }) }} style={{ fontSize: 12, padding: '4px 10px' }}>
                  Bearbeiten
                </GhostButton>
                <DangerButton onClick={() => { if (confirm(`Runde "${round.name}" wirklich löschen?`)) { setDeleteError(null); deleteRound.mutate(round.id) } }} style={{ fontSize: 12, padding: '4px 10px' }}>
                  Löschen
                </DangerButton>
              </div>
              </div>
            </div>
          )})}
        </div>
      )}

      {roundModal && (
        <Modal title={roundModal.mode === 'new' ? 'Neue Runde' : 'Runde bearbeiten'} onClose={() => setRoundModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Name *</div>
              <input style={{ ...inputStyle, width: '100%' }} value={roundForm.name}
                onChange={e => setRoundForm(p => ({ ...p, name: e.target.value }))} placeholder="z.B. Qualifikation" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Reihenfolge</div>
                <input style={{ ...inputStyle, width: '100%' }} type="number" value={roundForm.sortOrder}
                  onChange={e => setRoundForm(p => ({ ...p, sortOrder: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Top N weiter (leer = Finale)</div>
                <input style={{ ...inputStyle, width: '100%' }} type="number" value={roundForm.advancementCount}
                  onChange={e => setRoundForm(p => ({ ...p, advancementCount: e.target.value }))} placeholder="leer = Finale" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Startzeit</div>
                <input style={{ ...inputStyle, width: '100%' }} type="datetime-local" value={roundForm.startAt}
                  onChange={e => setRoundForm(p => ({ ...p, startAt: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Endzeit</div>
                <input style={{ ...inputStyle, width: '100%' }} type="datetime-local" value={roundForm.endAt}
                  onChange={e => setRoundForm(p => ({ ...p, endAt: e.target.value }))} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Status</div>
              <select style={{ ...inputStyle, width: '100%', cursor: 'pointer' }} value={roundForm.status}
                onChange={e => setRoundForm(p => ({ ...p, status: e.target.value }))}>
                <option value="UPCOMING">Bevorstehend</option>
                <option value="ACTIVE">Aktiv</option>
                {roundModal?.mode === 'edit' && roundModal.round?.status === 'CLOSED' && (
                  <option value="CLOSED">Abgeschlossen</option>
                )}
              </select>
              {roundModal?.mode === 'edit' && roundModal.round?.status !== 'CLOSED' && (
                <p style={{ fontSize: 11, color: '#6b7890', margin: '6px 0 0' }}>
                  Zum Abschließen den Button „Runde abschließen" verwenden — dort kann pro Kategorie entschieden werden.
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <PrimaryButton onClick={() => saveRound.mutate()} disabled={saveRound.isPending || !roundForm.name}>
                {saveRound.isPending ? 'Speichert…' : 'Speichern'}
              </PrimaryButton>
              <GhostButton onClick={() => setRoundModal(null)}>Abbrechen</GhostButton>
            </div>
            {saveRound.isError && (
              <p style={{ color: '#ff5d6b', fontSize: 13, margin: 0 }}>
                {saveRound.error instanceof Error ? saveRound.error.message : 'Fehler'}
              </p>
            )}
          </div>
        </Modal>
      )}

      {closeTarget && (
        <AdvancementModal
          round={closeTarget.round}
          preview={closeTarget.preview}
          categories={categories}
          onClose={() => setCloseTarget(null)}
          onConfirm={(categoryId, ids) => closeRound.mutate({ id: closeTarget.round.id, categoryId, ids })}
          isPending={closeRound.isPending}
        />
      )}
    </Card>
  )
}

function ScoreboardUrlSection({ slug, baseUrl }: { slug: string; baseUrl: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${baseUrl || window.location.origin}/${slug}`

  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card style={{ marginTop: 24 }}>
      <SectionLabel>Scoreboard</SectionLabel>
      <p style={{ fontSize: 13, color: '#a6b0c3', margin: '12px 0' }}>
        Diesen Link auf dem Beamer oder einem Display in der Halle öffnen. Das Scoreboard aktualisiert sich automatisch.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <code style={{
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#6cf0c2',
          letterSpacing: '0.03em', wordBreak: 'break-all',
        }}>
          {url}
        </code>
        <GhostButton onClick={copy} style={{ whiteSpace: 'nowrap' }}>
          {copied ? '✓ Kopiert' : 'Link kopieren'}
        </GhostButton>
        <GhostButton onClick={() => window.open(url, '_blank')} style={{ whiteSpace: 'nowrap' }}>
          Öffnen ↗
        </GhostButton>
      </div>
    </Card>
  )
}

const EVENT_TYPES = [
  { value: 'FLASH',             label: 'Flash (1. Versuch)',    color: '#ffd700' },
  { value: 'TOP',               label: 'Top',                   color: '#6cf0c2' },
  { value: 'ZONE',              label: 'Zone',                  color: '#ffc400' },
  { value: 'ZONE_1',            label: 'Zone 1 (untere Zone)',  color: '#ffc400' },
  { value: 'ZONE_2',            label: 'Zone 2 (obere Zone)',   color: '#ffaa00' },
  { value: 'ATTEMPT_DEDUCTION', label: 'Abzug pro nicht erfolgreichen Versuch', color: '#ff5d6b' },
]

const PRESETS: Record<string, { label: string; rules: Omit<ScoringConfig, 'id' | 'sortOrder'>[] }> = {
  punkteAbzug: {
    label: 'Punkte + Abzug',
    rules: [
      { compId: '', eventType: 'FLASH', points: 25, label: null },
      { compId: '', eventType: 'ZONE',  points: 10, label: null },
      { compId: '', eventType: 'ATTEMPT_DEDUCTION', points: -0.1, label: null },
    ],
  },
  punkteFix: {
    label: 'Punkte fix (kein Abzug)',
    rules: [
      { compId: '', eventType: 'FLASH', points: 30, label: null },
      { compId: '', eventType: 'TOP',   points: 25, label: null },
      { compId: '', eventType: 'ZONE',  points: 10, label: null },
    ],
  },
  zweiZonen: {
    label: 'Zwei Zonen',
    rules: [
      { compId: '', eventType: 'FLASH',  points: 30, label: null },
      { compId: '', eventType: 'TOP',    points: 25, label: null },
      { compId: '', eventType: 'ZONE_2', points: 15, label: null },
      { compId: '', eventType: 'ZONE_1', points: 5,  label: null },
    ],
  },
}

const emptyRuleForm = () => ({ eventType: 'FLASH', points: '', label: '' })

function ScoringSection({ compId }: { compId: string }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyRuleForm())

  const { data: rules = [] } = useQuery({
    queryKey: ['scoring-configs', compId],
    queryFn: () => api.scoringConfigs.list(compId),
  })

  const createRule = useMutation({
    mutationFn: () => api.scoringConfigs.create({
      compId,
      eventType: form.eventType,
      points: parseFloat(form.points) || 0,
      label: form.label.trim() || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scoring-configs', compId] })
      setForm(emptyRuleForm())
      setAdding(false)
    },
  })

  const deleteRule = useMutation({
    mutationFn: (id: string) => api.scoringConfigs.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scoring-configs', compId] }),
  })

  const applyPreset = useMutation({
    mutationFn: (key: string) => {
      const preset = PRESETS[key]
      const rules = preset.rules.map(r => ({ ...r, compId }))
      return api.scoringConfigs.replace(compId, rules)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scoring-configs', compId] })
      setAdding(false)
    },
  })

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6, color: '#e8ecf3', fontSize: 13, padding: '6px 10px',
    boxSizing: 'border-box',
  }

  return (
    <Card style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: rules.length > 0 || adding ? 16 : 0 }}>
        <SectionLabel>Bewertung</SectionLabel>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {Object.entries(PRESETS).map(([key, preset]) => (
            <GhostButton key={key}
              onClick={() => { if (rules.length === 0 || confirm(`Alle bestehenden Regeln durch Preset "${preset.label}" ersetzen?`)) applyPreset.mutate(key) }}
              disabled={applyPreset.isPending}
              style={{ fontSize: 11, padding: '4px 10px', color: '#a6b0c3' }}>
              {preset.label}
            </GhostButton>
          ))}
          {!adding && <PrimaryButton onClick={() => setAdding(true)}>+ Regel</PrimaryButton>}
        </div>
      </div>

      {rules.length === 0 && !adding && (
        <p style={{ color: '#a6b0c3', fontSize: 13, margin: 0 }}>
          Noch keine Bewertungsregeln konfiguriert. Wähle ein Preset oder füge Regeln manuell hinzu.
        </p>
      )}

      {rules.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: adding ? 16 : 0 }}>
          {(rules as ScoringConfig[]).slice().sort((a, b) => {
            const ai = EVENT_TYPES.findIndex(e => e.value === a.eventType)
            const bi = EVENT_TYPES.findIndex(e => e.value === b.eventType)
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
          }).map(rule => {
            const def = EVENT_TYPES.find(e => e.value === rule.eventType)
            const isNeg = rule.points < 0
            return (
              <div key={rule.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px',
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: (def?.color ?? '#a6b0c3') + '22',
                  color: def?.color ?? '#a6b0c3',
                  letterSpacing: '0.04em', flexShrink: 0,
                }}>
                  {def?.label ?? rule.eventType}
                </span>
                {rule.label && (
                  <span style={{ fontSize: 13, color: '#a6b0c3' }}>{rule.label}</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 700, color: isNeg ? '#ff5d6b' : '#6cf0c2', flexShrink: 0 }}>
                  {isNeg ? '' : '+'}{rule.points} Pkt.
                </span>
                <DangerButton
                  onClick={() => deleteRule.mutate(rule.id)}
                  disabled={deleteRule.isPending}
                  style={{ padding: '3px 9px', fontSize: 12 }}>
                  ×
                </DangerButton>
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', background: 'rgba(108,240,194,0.05)', borderRadius: 8, padding: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ereignis</span>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.eventType}
              onChange={e => setForm(p => ({ ...p, eventType: e.target.value }))}>
              {EVENT_TYPES.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Punkte</span>
            <input style={{ ...inputStyle, width: 90 }} type="number" step="0.1" placeholder="z.B. 25"
              value={form.points} onChange={e => setForm(p => ({ ...p, points: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 }}>
            <span style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Label (optional)</span>
            <input style={{ ...inputStyle, width: '100%' }} placeholder='z.B. "Untere Zone"'
              value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
          </div>
          <PrimaryButton onClick={() => createRule.mutate()} disabled={createRule.isPending || !form.points}>
            {createRule.isPending ? '…' : 'Hinzufügen'}
          </PrimaryButton>
          <GhostButton onClick={() => { setAdding(false); setForm(emptyRuleForm()) }}>Abbrechen</GhostButton>
          {createRule.isError && (
            <span style={{ color: '#ff5d6b', fontSize: 12, width: '100%' }}>
              {createRule.error instanceof Error ? createRule.error.message : 'Fehler'}
            </span>
          )}
        </div>
      )}
    </Card>
  )
}

function HallMapSection({ compId, hasMap, onChanged }: {
  compId: string
  hasMap: boolean
  onChanged: () => void
}) {
  const qc = useQueryClient()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mapUrl = api.competitions.hallMapUrl(compId)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Nur Bilddateien erlaubt'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Maximale Dateigröße: 10 MB'); return }
    setError(null)
    setUploading(true)
    try {
      await api.competitions.uploadHallMap(compId, file)
      qc.invalidateQueries({ queryKey: ['competition', compId] })
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const remove = useMutation({
    mutationFn: () => api.competitions.deleteHallMap(compId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['competition', compId] }); onChanged() },
  })

  return (
    <Card style={{ marginTop: 24 }}>
      <SectionLabel>Hallenmap</SectionLabel>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      {hasMap ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <img
            src={mapUrl}
            alt="Hallenmap"
            style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', maxHeight: 400, objectFit: 'contain', background: '#0a0f1e' }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <GhostButton onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? 'Lädt hoch…' : 'Ersetzen'}
            </GhostButton>
            <DangerButton onClick={() => remove.mutate()} disabled={remove.isPending}>
              {remove.isPending ? 'Löscht…' : 'Löschen'}
            </DangerButton>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: '#a6b0c3', fontSize: 14, margin: 0 }}>
            Noch keine Hallenmap hinterlegt. Lade ein Bild hoch, das in der Athleten-App angezeigt wird.
          </p>
          <div>
            <PrimaryButton onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? 'Lädt hoch…' : 'Bild hochladen'}
            </PrimaryButton>
          </div>
        </div>
      )}

      {error && <p style={{ color: '#ff5d6b', fontSize: 13, margin: '8px 0 0' }}>{error}</p>}
    </Card>
  )
}

function TokenSection({
  compId, token, selfRegistration, registrationOpensAt, registrationClosesAt, onGenerated, registerBaseUrl,
}: {
  compId: string
  token: string | null
  selfRegistration: boolean
  registrationOpensAt: string | null
  registrationClosesAt: string | null
  onGenerated: () => void
  registerBaseUrl: string
}) {
  const [copied, setCopied] = useState(false)

  const generateToken = useMutation({
    mutationFn: () => api.competitions.generateToken(compId),
    onSuccess: onGenerated,
  })

  const registerUrl = token ? `${registerBaseUrl || window.location.origin}/${token}` : null

  function copy() {
    if (!registerUrl) return
    navigator.clipboard.writeText(registerUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function fmtDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <Card style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <SectionLabel>Selbstregistrierung (QR-Code / Link)</SectionLabel>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
          background: selfRegistration ? 'rgba(108,240,194,0.12)' : 'rgba(255,255,255,0.07)',
          color: selfRegistration ? '#6cf0c2' : '#6b7890',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {selfRegistration ? 'Aktiv' : 'Inaktiv'}
        </span>
      </div>

      {!selfRegistration ? (
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <p style={{ fontSize: 13, color: '#6b7890', margin: 0 }}>
            Für diesen Wettkampf ist keine Selbstregistrierung aktiviert.
            Im Dialog <strong style={{ color: '#a6b0c3' }}>„Wettkampf bearbeiten"</strong> einschalten.
          </p>
        </div>
      ) : token ? (
        <div>
          {(registrationOpensAt || registrationClosesAt) && (
            <p style={{ fontSize: 12, color: '#a6b0c3', margin: '0 0 12px' }}>
              Anmeldezeitraum:
              {registrationOpensAt ? ` ab ${fmtDate(registrationOpensAt)}` : ' —'}
              {registrationClosesAt ? ` bis ${fmtDate(registrationClosesAt)}` : ''}
            </p>
          )}
          <p style={{ fontSize: 13, color: '#a6b0c3', margin: '0 0 12px' }}>
            Diesen Link als QR-Code ausdrucken und in der Halle aufhängen. Athleten können sich direkt anmelden.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <code style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#6cf0c2',
              letterSpacing: '0.03em', wordBreak: 'break-all',
            }}>
              {registerUrl}
            </code>
            <GhostButton onClick={copy} style={{ whiteSpace: 'nowrap' }}>
              {copied ? '✓ Kopiert' : 'Link kopieren'}
            </GhostButton>
            <GhostButton onClick={() => window.open(registerUrl!, '_blank')} style={{ whiteSpace: 'nowrap' }}>
              Öffnen ↗
            </GhostButton>
            <GhostButton
              onClick={() => { if (confirm('Neuen Token generieren? Der alte Link wird ungültig.')) generateToken.mutate() }}
              style={{ fontSize: 12, padding: '6px 12px', color: '#a6b0c3' }}
            >
              Neu generieren
            </GhostButton>
          </div>
          <p style={{ fontSize: 11, color: '#6b7890', margin: '10px 0 0' }}>Token: <code style={{ color: '#a6b0c3' }}>{token}</code></p>
        </div>
      ) : (
        <div>
          {(registrationOpensAt || registrationClosesAt) && (
            <p style={{ fontSize: 12, color: '#a6b0c3', margin: '0 0 12px' }}>
              Anmeldezeitraum:
              {registrationOpensAt ? ` ab ${fmtDate(registrationOpensAt)}` : ' —'}
              {registrationClosesAt ? ` bis ${fmtDate(registrationClosesAt)}` : ''}
            </p>
          )}
          <p style={{ fontSize: 13, color: '#a6b0c3', margin: '0 0 14px' }}>
            Noch kein Registrierungslink vorhanden. Einen Link generieren und als QR-Code im Wettkampfraum aufhängen.
          </p>
          <PrimaryButton onClick={() => generateToken.mutate()} disabled={generateToken.isPending}>
            {generateToken.isPending ? 'Generiert…' : 'Registrierungslink generieren'}
          </PrimaryButton>
          {generateToken.isError && (
            <p style={{ color: '#ff5d6b', fontSize: 13, margin: '10px 0 0' }}>
              {generateToken.error instanceof Error ? generateToken.error.message : 'Fehler'}
            </p>
          )}
        </div>
      )}
    </Card>
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
  const { data: org } = useQuery({ queryKey: ['org', 'mine'], queryFn: api.organizations.mine })
  const { data: athletes = [] } = useQuery({
    queryKey: ['athletes', org?.id],
    queryFn: () => api.athletes.list(org!.id),
    enabled: !!org,
    staleTime: 0,
  })
  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations', id],
    queryFn: () => api.registrations.list(id!),
    enabled: !!id,
    staleTime: 0,
  })
  const { data: rounds = [] } = useQuery({
    queryKey: ['rounds', id],
    queryFn: () => api.rounds.list(id!),
    enabled: !!id,
  })
  const { data: appSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.getAll,
  })

  // ── Round filter for routes ─────────────────────────────────────────────────
  const [selectedRoundId, setSelectedRoundId] = useState<string>('')

  const { data: routes = [] } = useQuery({
    queryKey: ['routes', id, selectedRoundId],
    queryFn: () => api.routes.list(id!, selectedRoundId || undefined),
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
  function cancelNew() { setNewRow(null) }

  function buildPayload(row: RouteRow) {
    return {
      compId: id!,
      routeNumber: row.routeNumber || null, name: row.name || null,
      grade: row.grade || null, maxScore: row.maxScore ? parseInt(row.maxScore) : null,
      sortOrder: row.sortOrder ? parseInt(row.sortOrder) : null,
      categoryId: row.categoryId || null,
      roundId: row.roundId || null,
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

  function startNew() { setEditingRouteId(null); setNewRow(emptyRow(selectedRoundId)) }

  // ── Registrations ───────────────────────────────────────────────────────────
  type RegSortCol = 'athlete' | 'category' | 'startNumber' | 'status'
  const [regSortCol, setRegSortCol] = useState<RegSortCol>('startNumber')
  const [regSortDir, setRegSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleRegSort(col: RegSortCol) {
    if (regSortCol === col) setRegSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setRegSortCol(col); setRegSortDir('asc') }
  }
  const [regCategoryFilter, setRegCategoryFilter] = useState<string | null>(null)

  // Flatten RegistrationWithAthlete → plain lists
  const regs: Registration[] = (registrations as RegistrationWithAthlete[]).map(rwa => rwa.registration)
  const athleteByRegId: Record<string, Athlete | null> = Object.fromEntries(
    (registrations as RegistrationWithAthlete[]).map(rwa => [rwa.registration.id, rwa.athlete ?? null])
  )

  const sortedRegistrations = useMemo(() => {
    const filtered = regCategoryFilter
      ? regs.filter(r => r.categoryId === regCategoryFilter)
      : regs
    return [...filtered].sort((a, b) => {
      let av = '', bv = ''
      if (regSortCol === 'athlete') {
        const aa = athleteByRegId[a.id]
        const ba = athleteByRegId[b.id]
        av = aa ? `${aa.lastName} ${aa.firstName}` : ''
        bv = ba ? `${ba.lastName} ${ba.firstName}` : ''
      } else if (regSortCol === 'category') {
        av = (categories as CompetitionCategory[]).find(c => c.id === a.categoryId)?.name ?? ''
        bv = (categories as CompetitionCategory[]).find(c => c.id === b.categoryId)?.name ?? ''
      } else if (regSortCol === 'startNumber') {
        return regSortDir === 'asc'
          ? (a.startNumber ?? '').localeCompare(b.startNumber ?? '', 'de', { numeric: true })
          : (b.startNumber ?? '').localeCompare(a.startNumber ?? '', 'de', { numeric: true })
      } else if (regSortCol === 'status') {
        av = a.status; bv = b.status
      }
      const cmp = av.localeCompare(bv, 'de')
      return regSortDir === 'asc' ? cmp : -cmp
    })
  }, [registrations, regSortCol, regSortDir, categories, regCategoryFilter])

  const STATUSES = [
    { value: 'PENDING', label: 'Ausstehend' },
    { value: 'CONFIRMED', label: 'Bestätigt' },
    { value: 'REJECTED', label: 'Abgelehnt' },
  ]
  const STATUS_COLOR: Record<string, string> = {
    PENDING: '#ffc400', CONFIRMED: '#6cf0c2', REJECTED: '#ff5d6b',
  }

  const [addForm, setAddForm] = useState({ athleteId: '', categoryId: '', startNumber: '' })
  const [editingRegId, setEditingRegId] = useState<string | null>(null)
  const [editingReg, setEditingReg] = useState({ categoryId: '', startNumber: '', status: 'PENDING' })

  const addReg = useMutation({
    mutationFn: () => api.registrations.create({
      compId: id!, athleteId: addForm.athleteId,
      categoryId: addForm.categoryId || null,
      status: 'CONFIRMED',
      startNumber: addForm.startNumber || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations', id] })
      qc.invalidateQueries({ queryKey: ['athletes', org?.id] })
      setAddForm({ athleteId: '', categoryId: '', startNumber: '' })
    },
  })
  const updateReg = useMutation({
    mutationFn: (regId: string) => api.registrations.update(regId, {
      categoryId: editingReg.categoryId || null,
      startNumber: editingReg.startNumber || null,
      status: editingReg.status,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['registrations', id] }); setEditingRegId(null) },
  })
  const deleteReg = useMutation({
    mutationFn: (regId: string) => api.registrations.delete(regId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registrations', id] }),
  })
  const confirmAllRegs = useMutation({
    mutationFn: () => Promise.all(
      regs
        .filter(r => r.status === 'PENDING')
        .map(r => api.registrations.update(r.id, { status: 'CONFIRMED', categoryId: r.categoryId }))
    ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registrations', id] }),
  })

  // Athletes already registered (to prevent duplicates in dropdown)
  const registeredAthleteIds = new Set(regs.map(r => r.athleteId))

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
          rounds={rounds as CompetitionRound[]}
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

      {/* Rounds */}
      <RoundsSection compId={id!} categories={categories as CompetitionCategory[]} />

      {/* Routes */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (rounds as CompetitionRound[]).length > 0 ? 10 : 16 }}>
          <SectionLabel>Routen / Boulder</SectionLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            <GhostButton onClick={() => setGrouped(g => !g)} style={{ fontSize: 12, padding: '4px 12px' }}>
              {grouped ? 'Gruppierung aufheben' : 'Nach Kategorie gruppieren'}
            </GhostButton>
            {!newRow && <PrimaryButton onClick={startNew}>+ Route</PrimaryButton>}
          </div>
        </div>

        {(rounds as CompetitionRound[]).length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedRoundId('')}
              style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: 'none',
                background: selectedRoundId === '' ? '#6cf0c2' : 'rgba(255,255,255,0.07)',
                color: selectedRoundId === '' ? '#0a0f1e' : '#a6b0c3', fontWeight: selectedRoundId === '' ? 700 : 400,
              }}>
              Alle
            </button>
            {(rounds as CompetitionRound[]).map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRoundId(r.id)}
                style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: 'none',
                  background: selectedRoundId === r.id ? '#6cf0c2' : 'rgba(255,255,255,0.07)',
                  color: selectedRoundId === r.id ? '#0a0f1e' : '#a6b0c3', fontWeight: selectedRoundId === r.id ? 700 : 400,
                }}>
                {r.name}
              </button>
            ))}
          </div>
        )}

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
                      rounds={rounds as CompetitionRound[]}
                    />
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Registrations */}
      <Card style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel>Anmeldungen</SectionLabel>
          {regs.some(r => r.status === 'PENDING') && (
            <PrimaryButton
              onClick={() => confirmAllRegs.mutate()}
              disabled={confirmAllRegs.isPending}
              style={{ fontSize: 12, padding: '6px 14px' }}
            >
              {confirmAllRegs.isPending ? '…' : 'Alle bestätigen'}
            </PrimaryButton>
          )}
        </div>

        {/* Add form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px auto', gap: 10, marginBottom: 20, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Athlet</div>
            <select
              style={{ width: '100%', background: '#1a2235', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e8ecf3', fontSize: 13, padding: '8px 12px', cursor: 'pointer' }}
              value={addForm.athleteId}
              onChange={e => setAddForm(p => ({ ...p, athleteId: e.target.value }))}
            >
              <option value="">— Athlet wählen —</option>
              {(athletes as Athlete[])
                .filter(a => !registeredAthleteIds.has(a.id))
                .sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'))
                .map(a => (
                  <option key={a.id} value={a.id}>{a.lastName}, {a.firstName}</option>
                ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Kategorie</div>
            <select
              style={{ width: '100%', background: '#1a2235', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e8ecf3', fontSize: 13, padding: '8px 12px', cursor: 'pointer' }}
              value={addForm.categoryId}
              onChange={e => setAddForm(p => ({ ...p, categoryId: e.target.value }))}
            >
              <option value="">— Kategorie —</option>
              {(categories as CompetitionCategory[]).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7890', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Startnr.</div>
            <input
              style={{ width: '100%', background: '#1a2235', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e8ecf3', fontSize: 13, padding: '8px 12px', boxSizing: 'border-box' }}
              value={addForm.startNumber}
              placeholder="optional"
              onChange={e => setAddForm(p => ({ ...p, startNumber: e.target.value }))}
            />
          </div>
          <PrimaryButton
            onClick={() => addReg.mutate()}
            disabled={!addForm.athleteId || addReg.isPending}
          >
            {addReg.isPending ? '…' : 'Hinzufügen'}
          </PrimaryButton>
        </div>
        {addReg.isError && (
          <p style={{ color: '#ff5d6b', fontSize: 13, margin: '-12px 0 16px' }}>
            {addReg.error instanceof Error ? addReg.error.message : 'Fehler'}
          </p>
        )}

        {/* Category filter pills */}
        {(categories as CompetitionCategory[]).length > 0 && regs.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            <button onClick={() => setRegCategoryFilter(null)} style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: regCategoryFilter === null ? '#6cf0c2' : 'rgba(255,255,255,0.07)',
              color: regCategoryFilter === null ? '#020231' : '#a6b0c3', fontWeight: 600,
            }}>Alle</button>
            {(categories as CompetitionCategory[]).map(c => (
              <button key={c.id} onClick={() => setRegCategoryFilter(c.id)} style={{
                fontSize: 12, padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: regCategoryFilter === c.id ? '#6cf0c2' : 'rgba(255,255,255,0.07)',
                color: regCategoryFilter === c.id ? '#020231' : '#a6b0c3', fontWeight: 600,
              }}>{c.name}</button>
            ))}
          </div>
        )}

        {/* Registration list */}
        {regs.length === 0 ? (
          <p style={{ color: '#a6b0c3', fontSize: 13, margin: 0 }}>Noch keine Anmeldungen.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {([
                  { col: 'athlete' as RegSortCol, label: 'Athlet' },
                  { col: 'category' as RegSortCol, label: 'Kategorie' },
                  { col: 'startNumber' as RegSortCol, label: 'Startnr.' },
                  { col: 'status' as RegSortCol, label: 'Status' },
                ] as const).map(({ col, label }) => (
                  <th key={col} onClick={() => toggleRegSort(col)} style={{
                    padding: '6px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                    color: regSortCol === col ? '#6cf0c2' : '#6b7890',
                  }}>
                    {label}{regSortCol === col ? (regSortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
                <th style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }} />
              </tr>
            </thead>
            <tbody>
              {sortedRegistrations.map(reg => {
                  const athlete = athleteByRegId[reg.id]
                  const catName = reg.categoryId ? (categories as CompetitionCategory[]).find(c => c.id === reg.categoryId)?.name : null
                  const td: React.CSSProperties = { padding: '10px 8px', fontSize: 13, color: '#e8ecf3', borderBottom: '1px solid rgba(255,255,255,0.05)' }
                  const cellInput: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#e8ecf3', fontSize: 13, padding: '4px 8px', width: '100%', boxSizing: 'border-box' }

                  if (editingRegId === reg.id) {
                    return (
                      <tr key={reg.id} style={{ background: 'rgba(108,240,194,0.06)' }}>
                        <td style={td}>{athlete ? `${athlete.lastName}, ${athlete.firstName}` : '—'}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <select style={{ ...cellInput, cursor: 'pointer' }} value={editingReg.categoryId}
                            onChange={e => setEditingReg(p => ({ ...p, categoryId: e.target.value }))}>
                            <option value="">— keine —</option>
                            {(categories as CompetitionCategory[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input style={{ ...cellInput, width: 80 }} value={editingReg.startNumber}
                            onChange={e => setEditingReg(p => ({ ...p, startNumber: e.target.value }))} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <select style={{ ...cellInput, cursor: 'pointer' }} value={editingReg.status}
                            onChange={e => setEditingReg(p => ({ ...p, status: e.target.value }))}>
                            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <PrimaryButton onClick={() => updateReg.mutate(reg.id)} disabled={updateReg.isPending} style={{ padding: '4px 10px', fontSize: 12 }}>
                              {updateReg.isPending ? '…' : 'Speichern'}
                            </PrimaryButton>
                            <GhostButton onClick={() => setEditingRegId(null)} style={{ padding: '4px 10px', fontSize: 12 }}>Abbrechen</GhostButton>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={reg.id}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ ...td, fontWeight: 600 }}>{athlete ? `${athlete.lastName}, ${athlete.firstName}` : <span style={{ color: '#6b7890' }}>Unbekannt</span>}</td>
                      <td style={td}>{catName ?? <span style={{ color: '#6b7890' }}>—</span>}</td>
                      <td style={td}>{reg.startNumber ?? <span style={{ color: '#6b7890' }}>—</span>}</td>
                      <td style={td}>
                        <span style={{ color: STATUS_COLOR[reg.status] ?? '#a6b0c3', fontWeight: 600, fontSize: 12 }}>
                          {STATUSES.find(s => s.value === reg.status)?.label ?? reg.status}
                        </span>
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <GhostButton onClick={() => {
                            setEditingRegId(reg.id)
                            setEditingReg({ categoryId: reg.categoryId ?? '', startNumber: reg.startNumber ?? '', status: reg.status })
                          }} style={{ padding: '4px 10px', fontSize: 12 }}>Bearbeiten</GhostButton>
                          <DangerButton onClick={() => { if (confirm(`Anmeldung von "${athlete?.lastName ?? '?'}" wirklich entfernen?`)) deleteReg.mutate(reg.id) }} style={{ padding: '4px 10px', fontSize: 12 }}>Entfernen</DangerButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Self-registration link */}
      <TokenSection
        compId={id!}
        token={comp.registrationToken ?? null}
        selfRegistration={comp.selfRegistration}
        registrationOpensAt={comp.registrationOpensAt ?? null}
        registrationClosesAt={comp.registrationClosesAt ?? null}
        onGenerated={() => qc.invalidateQueries({ queryKey: ['competition', id] })}
        registerBaseUrl={appSettings?.['register_base_url'] || ''}
      />

      <ScoreboardUrlSection slug={comp.slug} baseUrl={appSettings?.['scoreboard_base_url'] || ''} />

      <ScoringSection compId={id!} />

      <HallMapSection
        compId={id!}
        hasMap={comp.hallMapAvailable ?? false}
        onChanged={() => qc.invalidateQueries({ queryKey: ['competition', id] })}
      />

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
