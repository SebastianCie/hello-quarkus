import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BetaBattleLogo } from '@/components/FormUI'

export function VerifyEmail() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setStatus('error')
      setMessage('Kein Token angegeben.')
      return
    }

    fetch(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async res => {
        const body = await res.json().catch(() => ({}))
        if (res.ok) {
          setStatus('success')
          setMessage(body.message ?? 'E-Mail erfolgreich bestätigt!')
        } else {
          setStatus('error')
          setMessage(body.message ?? 'Ungültiger oder abgelaufener Bestätigungslink.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Netzwerkfehler. Bitte versuche es erneut.')
      })
  }, []) // params sind stabil beim Mount

  const accentColor = status === 'error' ? '#ff5d6b' : '#6cf0c2'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(138deg, #020231 53%, rgba(130,4,255,0.35) 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#121a2b', border: `1px solid ${accentColor}33`, borderRadius: 20,
        padding: 48, maxWidth: 440, width: '100%', textAlign: 'center',
        boxShadow: '0 0 0 1px rgba(108,240,194,0.1), 0 20px 50px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
          <BetaBattleLogo />
          <span style={{ fontWeight: 700, color: '#e8ecf3', fontSize: 16 }}>Beta Battle</span>
        </div>

        <div style={{ fontSize: 52, marginBottom: 16 }}>
          {status === 'loading' ? '…' : status === 'success' ? '✓' : '✕'}
        </div>

        <h2 style={{ color: accentColor, margin: '0 0 12px', fontSize: 22 }}>
          {status === 'loading' ? 'Wird verifiziert…' : status === 'success' ? 'E-Mail bestätigt!' : 'Fehler'}
        </h2>

        <p style={{ color: '#a6b0c3', margin: '0 0 28px', lineHeight: 1.6, fontSize: 14 }}>{message}</p>

        {status !== 'loading' && (
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#6cf0c2', color: '#020231', border: 'none', borderRadius: 10,
              padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Zum Login
          </button>
        )}
      </div>
    </div>
  )
}
