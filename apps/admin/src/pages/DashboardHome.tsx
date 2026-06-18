import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'

export function DashboardHome() {
  const { data: org } = useQuery({ queryKey: ['org', 'mine'], queryFn: api.organizations.mine })
  const { data: locations } = useQuery({
    queryKey: ['locations', org?.id],
    queryFn: () => api.locations.list(org!.id),
    enabled: !!org,
  })
  const { data: competitions } = useQuery({
    queryKey: ['competitions', org?.id],
    queryFn: () => api.competitions.list(org!.id),
    enabled: !!org,
  })

  const activeComps = competitions?.filter(c => c.status === 'ACTIVE' || c.status === 'OPEN').length ?? 0

  return (
    <div style={{ maxWidth: 900 }}>
      <p style={{ color: '#6cf0c2', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
        Dashboard
      </p>
      <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700 }}>
        {org ? `Willkommen, ${org.name}` : 'Willkommen'}
      </h1>
      <p style={{ color: '#a6b0c3', margin: '0 0 32px', fontSize: '1rem' }}>
        Verwalte Wettkämpfe, Standorte und Organisationseinstellungen.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Standorte', value: locations?.length ?? '—', to: '/dashboard/organisation' },
          { label: 'Wettkämpfe gesamt', value: competitions?.length ?? '—', to: '/dashboard/wettkampfe' },
          { label: 'Aktive Wettkämpfe', value: activeComps, to: '/dashboard/wettkampfe' },
        ].map(({ label, value, to }) => (
          <Link key={label} to={to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#121a2b', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '20px 24px', cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(108,240,194,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            >
              <div style={{ fontSize: 32, fontWeight: 700, color: '#6cf0c2', marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 13, color: '#a6b0c3' }}>{label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ background: '#121a2b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e8ecf3', marginBottom: 16 }}>Schnellzugriff</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: '+ Neuer Wettkampf', to: '/dashboard/wettkampfe' },
            { label: 'Organisation bearbeiten', to: '/dashboard/organisation' },
            { label: 'Standorte verwalten', to: '/dashboard/organisation' },
          ].map(({ label, to }) => (
            <Link key={label} to={to} style={{
              display: 'inline-block', textDecoration: 'none',
              background: 'rgba(255,255,255,0.05)', color: '#a6b0c3',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              padding: '8px 16px', fontSize: 13,
              transition: 'background 0.15s, color 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,240,194,0.08)'; e.currentTarget.style.color = '#6cf0c2' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#a6b0c3' }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
