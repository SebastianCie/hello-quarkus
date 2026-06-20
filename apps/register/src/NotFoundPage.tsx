export function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🧗</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Link ungültig</h1>
      <p style={{ color: '#a6b0c3', fontSize: 15, textAlign: 'center' }}>
        Bitte den QR-Code erneut scannen oder den Wettkampfveranstalter kontaktieren.
      </p>
    </div>
  )
}
