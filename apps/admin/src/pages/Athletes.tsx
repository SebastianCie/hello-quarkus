import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Athlete } from '@/api/client'
import { PrimaryButton, GhostButton, DangerButton } from '@/components/FormUI'

const GENDERS = [
  { value: '', label: '—' },
  { value: 'FEMALE', label: 'Weiblich' },
  { value: 'MALE', label: 'Männlich' },
  { value: 'DIVERSE', label: 'Divers' },
]

type SortCol = 'lastName' | 'firstName' | 'dateOfBirth' | 'gender' | 'club' | 'nation' | 'licenseNumber'

type AthleteRow = {
  firstName: string; lastName: string; dateOfBirth: string
  gender: string; club: string; nation: string; licenseNumber: string
}
const emptyRow = (): AthleteRow => ({
  firstName: '', lastName: '', dateOfBirth: '', gender: '', club: '', nation: '', licenseNumber: '',
})
function athleteToRow(a: Athlete): AthleteRow {
  return {
    firstName: a.firstName, lastName: a.lastName,
    dateOfBirth: a.dateOfBirth ?? '', gender: a.gender ?? '',
    club: a.club ?? '', nation: a.nation ?? '', licenseNumber: a.licenseNumber ?? '',
  }
}

const cell: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6, color: '#e8ecf3', fontSize: 13, padding: '4px 8px',
  width: '100%', boxSizing: 'border-box',
}

function InlineRow({ row, onChange, onSave, onCancel, pending, error }: {
  row: AthleteRow; onChange: (r: AthleteRow) => void
  onSave: () => void; onCancel: () => void
  pending: boolean; error?: string | null
}) {
  return (
    <tr style={{ background: 'rgba(108,240,194,0.06)' }}>
      <td style={{ padding: '6px 8px' }}>
        <input style={cell} value={row.lastName} placeholder="Nachname" onChange={e => onChange({ ...row, lastName: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px' }}>
        <input style={cell} value={row.firstName} placeholder="Vorname" onChange={e => onChange({ ...row, firstName: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px' }}>
        <input style={cell} type="date" value={row.dateOfBirth} onChange={e => onChange({ ...row, dateOfBirth: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px' }}>
        <select style={{ ...cell, cursor: 'pointer' }} value={row.gender} onChange={e => onChange({ ...row, gender: e.target.value })}>
          {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </td>
      <td style={{ padding: '6px 8px' }}>
        <input style={cell} value={row.club} placeholder="Verein" onChange={e => onChange({ ...row, club: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px' }}>
        <input style={{ ...cell, width: 60 }} value={row.nation} placeholder="DE" maxLength={3} onChange={e => onChange({ ...row, nation: e.target.value.toUpperCase() })} />
      </td>
      <td style={{ padding: '6px 8px' }}>
        <input style={cell} value={row.licenseNumber} placeholder="optional" onChange={e => onChange({ ...row, licenseNumber: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <PrimaryButton onClick={onSave} disabled={pending} style={{ padding: '4px 10px', fontSize: 12 }}>
              {pending ? '…' : 'Speichern'}
            </PrimaryButton>
            <GhostButton onClick={onCancel} style={{ padding: '4px 10px', fontSize: 12 }}>Abbrechen</GhostButton>
          </div>
          {error && <span style={{ color: '#ff5d6b', fontSize: 11 }}>{error}</span>}
        </div>
      </td>
    </tr>
  )
}

export function Athletes() {
  const qc = useQueryClient()
  const { data: org } = useQuery({ queryKey: ['org', 'mine'], queryFn: api.organizations.mine })
  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ['athletes', org?.id],
    queryFn: () => api.athletes.list(org!.id),
    enabled: !!org,
  })

  const [sortCol, setSortCol] = useState<SortCol>('lastName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    return [...(athletes as Athlete[])].sort((a, b) => {
      const av = (a[sortCol] ?? '') as string
      const bv = (b[sortCol] ?? '') as string
      const cmp = av.localeCompare(bv, 'de')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [athletes, sortCol, sortDir])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<AthleteRow>(emptyRow())
  const [newRow, setNewRow] = useState<AthleteRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function startEdit(a: Athlete) { setNewRow(null); setEditingId(a.id); setEditingRow(athleteToRow(a)) }
  function cancelEdit() { setEditingId(null) }
  function startNew() { setEditingId(null); setNewRow(emptyRow()) }
  function cancelNew() { setNewRow(null) }

  function buildPayload(row: AthleteRow) {
    return {
      orgId: org!.id,
      firstName: row.firstName, lastName: row.lastName,
      dateOfBirth: row.dateOfBirth || null,
      gender: row.gender || null,
      club: row.club || null,
      nation: row.nation || null,
      licenseNumber: row.licenseNumber || null,
    }
  }

  const updateAthlete = useMutation({
    mutationFn: () => api.athletes.update(editingId!, buildPayload(editingRow)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['athletes', org?.id] }); setEditingId(null) },
  })
  const createAthlete = useMutation({
    mutationFn: () => api.athletes.create(buildPayload(newRow!)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['athletes', org?.id] }); setNewRow(null) },
  })
  const deleteAthlete = useMutation({
    mutationFn: (id: string) => api.athletes.delete(id),
    onSuccess: () => { setDeleteError(null); qc.invalidateQueries({ queryKey: ['athletes', org?.id] }) },
    onError: (err: unknown) => {
      setDeleteError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
    },
  })

  const thBase: React.CSSProperties = {
    padding: '6px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap',
  }
  const thSort = (col: SortCol): React.CSSProperties => ({
    ...thBase, cursor: 'pointer', userSelect: 'none',
    color: sortCol === col ? '#6cf0c2' : '#6b7890',
  })
  const td: React.CSSProperties = { padding: '10px 8px', fontSize: 13, color: '#e8ecf3', borderBottom: '1px solid rgba(255,255,255,0.05)' }
  const arrow = (col: SortCol) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''
  const dash = <span style={{ color: '#6b7890' }}>—</span>

  if (isLoading) return <div style={{ color: '#a6b0c3' }}>Lädt…</div>

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ color: '#6cf0c2', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Verwaltung
          </p>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Athleten</h1>
        </div>
        {!newRow && <PrimaryButton onClick={startNew}>+ Athlet</PrimaryButton>}
      </div>

      {deleteError && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(255,93,107,0.10)', border: '1px solid rgba(255,93,107,0.3)',
          color: '#ff5d6b', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} style={{ background: 'none', border: 'none', color: '#ff5d6b', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
        </div>
      )}

      <div style={{ background: '#121a2b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thSort('lastName')} onClick={() => toggleSort('lastName')}>Nachname{arrow('lastName')}</th>
                <th style={thSort('firstName')} onClick={() => toggleSort('firstName')}>Vorname{arrow('firstName')}</th>
                <th style={thSort('dateOfBirth')} onClick={() => toggleSort('dateOfBirth')}>Geburtsdatum{arrow('dateOfBirth')}</th>
                <th style={thSort('gender')} onClick={() => toggleSort('gender')}>Geschlecht{arrow('gender')}</th>
                <th style={thSort('club')} onClick={() => toggleSort('club')}>Verein{arrow('club')}</th>
                <th style={thSort('nation')} onClick={() => toggleSort('nation')}>Nation{arrow('nation')}</th>
                <th style={thSort('licenseNumber')} onClick={() => toggleSort('licenseNumber')}>Lizenznr.{arrow('licenseNumber')}</th>
                <th style={thBase}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && !newRow && (
                <tr>
                  <td colSpan={8} style={{ ...td, color: '#a6b0c3', textAlign: 'center', padding: '32px 8px' }}>
                    Noch keine Athleten angelegt.
                  </td>
                </tr>
              )}
              {sorted.map(athlete =>
                editingId === athlete.id ? (
                  <InlineRow key={athlete.id}
                    row={editingRow} onChange={setEditingRow}
                    onSave={() => updateAthlete.mutate()} onCancel={cancelEdit}
                    pending={updateAthlete.isPending}
                    error={updateAthlete.isError ? (updateAthlete.error instanceof Error ? updateAthlete.error.message : 'Fehler') : null}
                  />
                ) : (
                  <tr key={athlete.id}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ ...td, fontWeight: 600 }}>{athlete.lastName}</td>
                    <td style={td}>{athlete.firstName}</td>
                    <td style={td}>
                      {athlete.dateOfBirth
                        ? new Date(athlete.dateOfBirth + 'T12:00:00').toLocaleDateString('de-DE')
                        : dash}
                    </td>
                    <td style={td}>{GENDERS.find(g => g.value === athlete.gender)?.label ?? dash}</td>
                    <td style={td}>{athlete.club ?? dash}</td>
                    <td style={td}>{athlete.nation ?? dash}</td>
                    <td style={td}>{athlete.licenseNumber ?? dash}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <GhostButton onClick={() => startEdit(athlete)} style={{ padding: '4px 10px', fontSize: 12 }}>Bearbeiten</GhostButton>
                        <DangerButton onClick={() => { if (confirm(`"${athlete.firstName} ${athlete.lastName}" wirklich löschen?`)) deleteAthlete.mutate(athlete.id) }} style={{ padding: '4px 10px', fontSize: 12 }}>Löschen</DangerButton>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {newRow && (
                <InlineRow
                  row={newRow} onChange={setNewRow}
                  onSave={() => createAthlete.mutate()} onCancel={cancelNew}
                  pending={createAthlete.isPending}
                  error={createAthlete.isError ? (createAthlete.error instanceof Error ? createAthlete.error.message : 'Fehler') : null}
                />
              )}
            </tbody>
          </table>
        </div>
        {athletes.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: '#6b7890' }}>
            {athletes.length} {athletes.length === 1 ? 'Athlet' : 'Athleten'}
          </div>
        )}
      </div>
    </div>
  )
}
