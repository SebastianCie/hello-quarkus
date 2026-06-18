import { useState } from 'react'

export function BetaBattleLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={{ color: '#6cf0c2', flexShrink: 0 }}>
      <path d="M14 2L26 8v12l-12 6L2 20V8L14 2z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M14 2v24M2 8l12 6 12-6" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    </svg>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <span style={{ color: '#6cf0c2', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

export function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#e8ecf3' }}>
        {label}{required && <span style={{ color: '#ffa222', marginLeft: 4 }}>*</span>}
      </span>
      {children}
      {hint && <span style={{ fontSize: 12, color: '#a6b0c3' }}>{hint}</span>}
    </label>
  )
}

const controlStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  color: '#e8ecf3',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.15s',
  fontFamily: 'inherit',
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      style={{
        ...controlStyle,
        borderColor: focused ? 'rgba(108,240,194,0.5)' : 'rgba(255,255,255,0.14)',
        boxShadow: focused ? '0 0 0 3px rgba(108,240,194,0.08)' : undefined,
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      {...props}
      rows={props.rows ?? 3}
      style={{
        ...controlStyle,
        resize: 'vertical',
        borderColor: focused ? 'rgba(108,240,194,0.5)' : 'rgba(255,255,255,0.14)',
        boxShadow: focused ? '0 0 0 3px rgba(108,240,194,0.08)' : undefined,
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      {...props}
      style={{
        ...controlStyle,
        cursor: 'pointer',
        borderColor: focused ? 'rgba(108,240,194,0.5)' : 'rgba(255,255,255,0.14)',
        boxShadow: focused ? '0 0 0 3px rgba(108,240,194,0.08)' : undefined,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a6b0c3' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        appearance: 'none',
        paddingRight: 36,
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        background: '#ffa222', color: '#000', border: 'none', borderRadius: 10,
        padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        opacity: props.disabled ? 0.6 : 1, transition: 'opacity 0.15s, transform 0.06s',
        fontFamily: 'inherit', whiteSpace: 'nowrap',
        ...props.style,
      }}
      onMouseDown={e => { if (!props.disabled) e.currentTarget.style.transform = 'translateY(1px)' }}
      onMouseUp={e => { e.currentTarget.style.transform = '' }}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        background: 'rgba(255,255,255,0.06)', color: '#a6b0c3',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
        padding: '8px 14px', fontSize: 13, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'background 0.15s',
        ...props.style,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
    >
      {children}
    </button>
  )
}

export function DangerButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        background: 'rgba(255,93,107,0.12)', color: '#ff5d6b',
        border: '1px solid rgba(255,93,107,0.25)', borderRadius: 8,
        padding: '8px 14px', fontSize: 13, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'background 0.15s',
        ...props.style,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,93,107,0.2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,93,107,0.12)' }}
    >
      {children}
    </button>
  )
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#121a2b',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(2,2,49,0.85)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#0d1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8ecf3' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#a6b0c3', cursor: 'pointer',
              fontSize: 20, lineHeight: 1, padding: 4, fontFamily: 'inherit',
            }}
          >×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    DRAFT:  { background: 'rgba(166,176,195,0.15)', color: '#a6b0c3' },
    OPEN:   { background: 'rgba(108,240,194,0.15)', color: '#6cf0c2' },
    ACTIVE: { background: 'rgba(255,162,34,0.15)',  color: '#ffa222' },
    CLOSED: { background: 'rgba(255,93,107,0.12)',  color: '#ff5d6b' },
  }
  const labels: Record<string, string> = {
    DRAFT: 'Entwurf', OPEN: 'Offen', ACTIVE: 'Aktiv', CLOSED: 'Beendet',
  }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
      padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase',
      ...(styles[status] ?? styles.DRAFT),
    }}>
      {labels[status] ?? status}
    </span>
  )
}
