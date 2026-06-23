import { DEV_MODE, getAccessToken } from '@/auth/auth'

const BASE = '/api/v1'

function authHeader(): Record<string, string> {
  if (DEV_MODE) return {}
  const token = getAccessToken()
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
  startDate: string | null
  endDate: string | null
  venue: string | null
  locationId: string | null
  selfRegistration: boolean
  genderBasedCategories: boolean
  registrationOpensAt: string | null
  registrationClosesAt: string | null
  registrationToken?: string | null
  hallMapAvailable?: boolean
  hallMapContentType?: string | null
}

export type CompetitionPublicView = {
  competition: Competition
  categories: CompetitionCategory[]
}

export type SelfRegisterPayload = {
  firstName: string
  lastName: string
  dateOfBirth: string | null
  gender: string | null
  club: string | null
  nation: string | null
  licenseNumber: string | null
  categoryId: string | null
}

export type CompetitionCategory = {
  id: string
  compId: string
  name: string
  gender: string | null
  ageMin: string | null
  ageMax: string | null
  maxParticipants: number | null
}

export type Route = {
  id: string
  compId: string
  routeNumber: string | null
  name: string | null
  grade: string | null
  maxScore: number | null
  sortOrder: number | null
  categoryId: string | null
  roundId: string | null
}

export type CompetitionRound = {
  id: string
  compId: string
  name: string
  slug: string
  sortOrder: number
  startAt: string | null
  endAt: string | null
  advancementCount: number | null
  status: string
}

export type AdvancementAthlete = {
  registrationId: string
  firstName: string
  lastName: string
  startNumber: string | null
  rank: number | null
  totalPoints: number
}

export type AdvancementCategory = {
  categoryId: string | null
  categoryName: string
  alreadyClosed: boolean
  advancementCount: number
  advancing: AdvancementAthlete[]
  eliminated: AdvancementAthlete[]
}

export type AdvancementPreview = {
  allScoresComplete: boolean
  missingScoreAthletes: string[]
  categories: AdvancementCategory[]
}

export type RoundCategoryStatus = {
  id: string
  roundId: string
  categoryId: string
  status: string
}

export type Registration = {
  id: string
  compId: string
  athleteId: string
  categoryId: string | null
  status: string
  startNumber: string | null
  registeredAt: string | null
  confirmedAt: string | null
}

export type RegistrationWithAthlete = {
  registration: Registration
  athlete: Athlete | null
}

export type Athlete = {
  id: string
  orgId: string | null
  firstName: string
  lastName: string
  dateOfBirth: string | null
  gender: string | null
  club: string | null
  nation: string | null
  licenseNumber: string | null
}

export type ScoringConfig = {
  id: string
  compId: string
  eventType: string
  points: number
  label: string | null
  sortOrder: number
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
    get: (id: string) =>
      request<Competition>(`/competitions/${id}`),
    create: (data: Omit<Competition, 'id'>) =>
      request<Competition>('/competitions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Competition>) =>
      request<Competition>(`/competitions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/competitions/${id}`, { method: 'DELETE' }),
    generateToken: (id: string) =>
      request<{ token: string }>(`/competitions/${id}/generate-token`, { method: 'POST' }),
    byToken: (token: string) =>
      request<CompetitionPublicView>(`/competitions/by-token/${token}`),
    selfRegister: (token: string, data: SelfRegisterPayload) =>
      request<unknown>(`/competitions/by-token/${token}/register`, { method: 'POST', body: JSON.stringify(data) }),
    hallMapUrl: (id: string) => `${BASE}/competitions/${id}/hall-map`,
    uploadHallMap: async (id: string, file: File): Promise<void> => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE}/competitions/${id}/hall-map`, {
        method: 'POST',
        headers: { ...authHeader() },
        body: form,
      })
      if (!res.ok) throw new Error(await res.text().catch(() => res.statusText))
    },
    deleteHallMap: (id: string) =>
      request<void>(`/competitions/${id}/hall-map`, { method: 'DELETE' }),
  },

  categories: {
    list: (compId: string) =>
      request<CompetitionCategory[]>(`/competition-categories?compId=${compId}`),
    create: (data: Omit<CompetitionCategory, 'id'>) =>
      request<CompetitionCategory>('/competition-categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CompetitionCategory>) =>
      request<CompetitionCategory>(`/competition-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/competition-categories/${id}`, { method: 'DELETE' }),
  },

  routes: {
    list: (compId: string, roundId?: string) =>
      request<Route[]>(roundId ? `/routes?roundId=${roundId}` : `/routes?compId=${compId}`),
    create: (data: Omit<Route, 'id'>) =>
      request<Route>('/routes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Route>) =>
      request<Route>(`/routes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/routes/${id}`, { method: 'DELETE' }),
  },

  rounds: {
    list: (compId: string) =>
      request<CompetitionRound[]>(`/rounds?compId=${compId}`),
    create: (data: Omit<CompetitionRound, 'id'>) =>
      request<CompetitionRound>('/rounds', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CompetitionRound>) =>
      request<CompetitionRound>(`/rounds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/rounds/${id}`, { method: 'DELETE' }),
    categoryStatuses: (id: string) =>
      request<RoundCategoryStatus[]>(`/rounds/${id}/category-statuses`),
    allCategoryStatuses: (compId: string) =>
      request<RoundCategoryStatus[]>(`/rounds/category-statuses?compId=${compId}`),
    advancementPreview: (id: string, categoryId?: string) =>
      request<AdvancementPreview>(`/rounds/${id}/advancement-preview${categoryId ? `?categoryId=${categoryId}` : ''}`),
    close: (id: string, categoryId: string | null, advancedRegistrationIds: string[]) =>
      request<unknown>(`/rounds/${id}/close`, { method: 'POST', body: JSON.stringify({ categoryId, advancedRegistrationIds }) }),
  },

  registrations: {
    list: (compId: string) =>
      request<RegistrationWithAthlete[]>(`/registrations?compId=${compId}`),
    create: (data: Omit<Registration, 'id' | 'registeredAt' | 'confirmedAt'>) =>
      request<Registration>('/registrations', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Registration>) =>
      request<Registration>(`/registrations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/registrations/${id}`, { method: 'DELETE' }),
  },

  settings: {
    getAll: () => request<Record<string, string>>('/settings'),
    update: (key: string, value: string) =>
      request<unknown>(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  },

  scoringConfigs: {
    list: (compId: string) =>
      request<ScoringConfig[]>(`/scoring-configs?compId=${compId}`),
    create: (data: Omit<ScoringConfig, 'id' | 'sortOrder'>) =>
      request<ScoringConfig>('/scoring-configs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ScoringConfig>) =>
      request<ScoringConfig>(`/scoring-configs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/scoring-configs/${id}`, { method: 'DELETE' }),
    replace: (compId: string, rules: Omit<ScoringConfig, 'id' | 'sortOrder'>[]) =>
      request<ScoringConfig[]>(`/scoring-configs/replace?compId=${compId}`, { method: 'POST', body: JSON.stringify(rules) }),
  },

  athletes: {
    list: (orgId: string) =>
      request<Athlete[]>(`/athletes?orgId=${orgId}`),
    create: (data: Omit<Athlete, 'id'>) =>
      request<Athlete>('/athletes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Athlete>) =>
      request<Athlete>(`/athletes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/athletes/${id}`, { method: 'DELETE' }),
  },
}
