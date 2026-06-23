const BASE = '/api/v1'

export type ScoreDto = {
  routeId: string; topped: boolean; zoned: boolean; attempts: number
}

export type AthleteEntry = {
  rank: number | null
  registration: { id: string; startNumber: string | null }
  athlete: { firstName: string; lastName: string }
  totalPoints: number
  toppedCount: number
  zonedCount: number
  scores: ScoreDto[]
}

export type CategoryBoard = {
  category: { id: string; name: string }
  athletes: AthleteEntry[]
}

export type ScoringConfigDto = {
  eventType: string; points: number; label: string | null
}

export type RoundDto = {
  id: string; name: string; slug: string; status: string; sortOrder: number
}

export type ScoreboardData = {
  competition: { id: string; name: string; slug: string; discipline: string; status: string }
  round: RoundDto | null
  allRounds: RoundDto[]
  scoringConfig: ScoringConfigDto[]
  categories: CategoryBoard[]
  totalRoutes: number
}

export type AppSettingsMap = Record<string, string>

export async function fetchScoreboard(slug: string, roundSlug?: string): Promise<ScoreboardData> {
  const path = roundSlug ? `${BASE}/scoreboard/${slug}/${roundSlug}` : `${BASE}/scoreboard/${slug}`
  const res = await fetch(path)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchSettings(): Promise<AppSettingsMap> {
  const res = await fetch(`${BASE}/settings`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
