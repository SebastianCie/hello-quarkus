const BASE = '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
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

export type Location = {
  id: string
  orgId: string
  name: string
  address: string | null
  city: string | null
  country: string
}

export const api = {
  organizations: {
    create: (data: Omit<Organization, 'id'>) =>
      request<Organization>('/organizations', { method: 'POST', body: JSON.stringify(data) }),
  },
  locations: {
    create: (data: Omit<Location, 'id'>) =>
      request<Location>('/locations', { method: 'POST', body: JSON.stringify(data) }),
  },
}
