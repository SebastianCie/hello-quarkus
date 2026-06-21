import { getToken } from './auth/keycloak'

const BASE = '/api/v1'

export type Athlete = {
  id: string; firstName: string; lastName: string
  dateOfBirth: string | null; gender: string | null
  club: string | null; nation: string | null
}

export type Competition = {
  id: string; name: string; slug: string; discipline: string; status: string
  startDate: string | null; endDate: string | null
  hallMapAvailable?: boolean
}

export type ScoreboardEntry = {
  rank: number | null
  registration: { id: string; startNumber: string | null }
  athlete: { firstName: string; lastName: string }
  totalPoints: number
  toppedCount: number
  zonedCount: number
}

export type ScoreboardData = {
  competition: { id: string; name: string; slug: string }
  scoringConfig: { eventType: string; points: number; label: string | null }[]
  categories: { category: { id: string; name: string }; athletes: ScoreboardEntry[] }[]
}

export type Category = {
  id: string; name: string; gender: string | null
}

export type Registration = {
  id: string; compId: string; athleteId: string
  categoryId: string | null; status: string; startNumber: string | null
}

export type ActiveRegistration = {
  registration: Registration
  competition: Competition
  category: Category | null
}

export type MeResponse = {
  athlete: Athlete
  registrations: ActiveRegistration[]
}

export type Route = {
  id: string; compId: string; categoryId: string | null
  routeNumber: string; name: string | null; grade: string | null
  maxScore: number | null; sortOrder: number
}

export type Score = {
  id: string; registrationId: string; routeId: string; athleteId: string
  attempts: number; topped: boolean; zoned: boolean
  bonusPoints: number; finalScore: number | null
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {}
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch(`${BASE}/athletes/me`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchRoutes(compId: string, categoryId: string | null): Promise<Route[]> {
  const params = new URLSearchParams({ compId })
  if (categoryId) params.set('categoryId', categoryId)
  const res = await fetch(`${BASE}/routes?${params}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchScores(registrationId: string): Promise<Score[]> {
  const res = await fetch(`${BASE}/scores?registrationId=${registrationId}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchScoreboard(slug: string): Promise<ScoreboardData> {
  const res = await fetch(`/api/v1/scoreboard/${slug}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function upsertScore(data: Omit<Score, 'id' | 'finalScore'> & { finalScore?: number | null }): Promise<Score> {
  const res = await fetch(`${BASE}/scores/upsert`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
