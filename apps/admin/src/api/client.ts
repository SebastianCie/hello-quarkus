import { keycloak, DEV_MODE } from '@/auth/keycloak'

const BASE = '/api/v1'

function authHeader(): Record<string, string> {
  if (DEV_MODE) return {}
  const token = keycloak?.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export type Organization = {
  id: string
  name: string
  slug: string
  contactEmail: string | null
  logoUrl: string | null
}

export type SetupRequest = {
  name: string
  slug: string
  contactEmail: string | null
  logoUrl: string | null
  locationName: string
  locationCity: string | null
  locationAddress: string | null
}

export type AccountRegisterRequest = {
  username: string
  email?: string
  password: string
}

export const api = {
  account: {
    register: (data: AccountRegisterRequest) =>
      request<{ message: string }>('/account/register', { method: 'POST', body: JSON.stringify(data) }),
  },
  organizations: {
    setup: (data: SetupRequest) =>
      request<Organization>('/organizations/setup', { method: 'POST', body: JSON.stringify(data) }),
  },
}
