import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type CompetitionCategory, type Route, type Registration, type Athlete, type ScoringConfig } from '@/api/client'
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

const EVENT_TYPES = [
  { value: 'FLASH',             label: 'Flash (1. Versuch)',    color: '#ffd700' },
  { value: 'TOP',               label: 'Top',                   color: '#6cf0c2' },
  { value: 'ZONE',              label: 'Zone',                  color: '#ffc400' },
  { value: 'ZONE_1',            label: 'Zone 1 (untere Zone)',  color: '#ffc400' },
  { value: 'ZONE_2',            label: 'Zone 2 (obere Zone)',   color: '#ffaa00' },
  { value: 'ATTEMPT_DEDUCTION', label: 'Abzug pro Versuch',     color: '#ff5d6b' },
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
          {(rules as ScoringConfig[]).map(rule => {
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
  compId, token, selfRegistration, registrationOpensAt, registrationClosesAt, onGenerated,
}: {
  compId: string
  token: string | null
  selfRegistration: boolean
  registrationOpensAt: string | null
  registrationClosesAt: string | null
  onGenerated: () => void
}) {
  const [copied, setCopied] = useState(false)

  const generateToken = useMutation({
    mutationFn: () => api.competitions.generateToken(compId),
    onSuccess: onGenerated,
  })

  const registerUrl = token ? `${window.location.origin.replace(':3000', ':3001')}/${token}` : null

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
  const { data: routes = [] } = useQuery({
    queryKey: ['routes', id],
    queryFn: () => api.routes.list(id!),
    enabled: !!id,
  })
  const { data: org } = useQuery({ queryKey: ['org', 'mine'], queryFn: api.organizations.mine })
  const { data: athletes = [] } = useQuery({
    queryKey: ['athletes', org?.id],
    queryFn: () => api.athletes.list(org!.id),
    enabled: !!org,
  })
  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations', id],
    queryFn: () => api.registrations.list(id!),
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

  // ── Registrations ───────────────────────────────────────────────────────────
  type RegSortCol = 'athlete' | 'category' | 'startNumber' | 'status'
  const [regSortCol, setRegSortCol] = useState<RegSortCol>('startNumber')
  const [regSortDir, setRegSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleRegSort(col: RegSortCol) {
    if (regSortCol === col) setRegSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setRegSortCol(col); setRegSortDir('asc') }
  }

  const sortedRegistrations = useMemo(() => {
    return [...(registrations as Registration[])].sort((a, b) => {
      let av = '', bv = ''
      if (regSortCol === 'athlete') {
        const aa = (athletes as Athlete[]).find(x => x.id === a.athleteId)
        const ba = (athletes as Athlete[]).find(x => x.id === b.athleteId)
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
  }, [registrations, regSortCol, regSortDir, athletes, categories])

  const STATUSES = [
    { value: 'PENDING', label: 'Ausstehend' },
    { value: 'CONFIRMED', label: 'Bestätigt' },
    { value: 'REJECTED', label: 'Abgelehnt' },
  ]
  const STATUS_COLOR: Record<string, string> = {
    PENDING: '#a6b0c3', CONFIRMED: '#6cf0c2', REJECTED: '#ff5d6b',
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

  // Athletes already registered (to prevent duplicates in dropdown)
  const registeredAthleteIds = new Set((registrations as Registration[]).map(r => r.athleteId))

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

      {/* Registrations */}
      <Card style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 16 }}><SectionLabel>Anmeldungen</SectionLabel></div>

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

        {/* Registration list */}
        {registrations.length === 0 ? (
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
                  const athlete = (athletes as Athlete[]).find(a => a.id === reg.athleteId)
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
      />

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
