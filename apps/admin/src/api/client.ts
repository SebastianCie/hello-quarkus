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
    let message = res.statusText
    try {
      const body = await res.json()
      message = body.message ?? body.error ?? JSON.stringify(body)
    } catch {
      message = await res.text().catch(() => res.statusText)
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type Organization = {
  id: string
  name: string
  slug: string
  contactEmail: string | null
  logoUrl: string | null
}

export type Location = {
  id: string
  orgId: string
  name: string
  address: string | null
  city: string | null
  country: string
}

export type Competition = {
  id: string
  orgId: string
  name: string
  slug: string
  discipline: string
  format: string
  status: string
  eventDate: string | null
  venue: string | null
  locationId: string | null
  selfRegistration: boolean
  registrationOpensAt: string | null
  registrationClosesAt: string | null
}

export type SetupRequest = {
  name: string; slug: string; contactEmail: string | null; logoUrl: string | null
  locationName: string; locationCity: string | null; locationAddress: string | null
}

export type AccountRegisterRequest = {
  username: string; email?: string; password: string
}

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  account: {
    register: (data: AccountRegisterRequest) =>
      request<{ message: string }>('/account/register', { method: 'POST', body: JSON.stringify(data) }),
  },

  organizations: {
    mine: () =>
      request<Organization>('/organizations/mine'),
    update: (id: string, data: Partial<Organization>) =>
      request<Organization>(`/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    setup: (data: SetupRequest) =>
      request<Organization>('/organizations/setup', { method: 'POST', body: JSON.stringify(data) }),
  },

  locations: {
    list: (orgId: string) =>
      request<Location[]>(`/locations?orgId=${orgId}`),
    create: (data: Omit<Location, 'id'>) =>
      request<Location>('/locations', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Location>) =>
      request<Location>(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/locations/${id}`, { method: 'DELETE' }),
  },

  competitions: {
    list: (orgId: string) =>
      request<Competition[]>(`/competitions?orgId=${orgId}`),
    create: (data: Omit<Competition, 'id'>) =>
      request<Competition>('/competitions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Competition>) =>
      request<Competition>(`/competitions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/competitions/${id}`, { method: 'DELETE' }),
  },
}
