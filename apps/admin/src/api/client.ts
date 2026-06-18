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
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export type Organization = {
  id: string
  name: string
  slug: string
  contactEmail: string | null
  logoUrl: string | null
}

export type RegisterRequest = {
  name: string
  slug: string
  contactEmail: string | null
  logoUrl: string | null
  locationName: string
  locationCity: string | null
  locationAddress: string | null
}

export const api = {
  organizations: {
    register: (data: RegisterRequest) =>
      request<Organization>('/organizations/register', { method: 'POST', body: JSON.stringify(data) }),
  },
}
