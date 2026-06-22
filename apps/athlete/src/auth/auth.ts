let _accessToken: string | null = null

export function getAccessToken(): string | null {
  return _accessToken
}

export function setAccessToken(token: string | null): void {
  _accessToken = token
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/auth/token', { method: 'POST', credentials: 'include' })
    if (!res.ok) return null
    const data: { access_token: string } = await res.json()
    setAccessToken(data.access_token)
    return data.access_token
  } catch {
    return null
  }
}

export async function doLogin(email: string, password: string): Promise<string> {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? 'Anmeldung fehlgeschlagen')
  }
  const data: { access_token: string } = await res.json()
  setAccessToken(data.access_token)
  return data.access_token
}

export async function doLogout(): Promise<void> {
  await fetch('/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
  setAccessToken(null)
}
