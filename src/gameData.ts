import { CURRENT_F1_DRIVERS, type DriverArchetype, type DriverProfile } from './data/f1Drivers'

export type ModeKey = 'classic' | 'sprint' | 'survival' | 'precision' | 'dual'
export type TargetKind = 'real' | 'fake'
export type AchievementKey =
  | 'first_finish'
  | 'sub_250'
  | 'accuracy_95'
  | 'combo_10'
  | 'clean_sheet'
  | 'survival_60'
  | 'dual_20'
export type RankKey = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D'

export type OrbLayout = {
  id: string
  slot: string
  top: string
  left: string
}

export type ModeConfig = {
  key: ModeKey
  label: string
  tag: string
  description: string
  hint: string
  rounds?: number
  durationMs?: number
  lives?: number
  baseWindowMs: number
  minWindowMs: number
  baseGapMs: number
  baseScore: number
  speedBonus: number
  wrongPenalty: number
  orbScale: number
  hasFakeTarget?: boolean
}

export type ActiveTarget = {
  orbId: string
  kind: TargetKind
  spawnAt: number
  windowMs: number
  scale: number
}

export type SessionState = {
  mode: ModeKey
  runStartedAt: number
  clockStartedAt: number | null
  endsAt: number | null
  timeRemainingMs: number
  elapsedMs: number
  attemptsResolved: number
  hits: number
  misses: number
  wrongClicks: number
  totalClicks: number
  combo: number
  bestCombo: number
  perfectHits: number
  score: number
  lives: number
  maxLives: number
  lastOrbId: string | null
  lastReactionMs: number | null
  reactionTimes: number[]
}

export type RankInfo = {
  key: RankKey
  title: string
  subtitle: string
}

export type RunResult = {
  mode: ModeKey
  timestamp: number
  score: number
  averageMs: number
  fastestMs: number | null
  slowestMs: number | null
  accuracy: number
  hits: number
  misses: number
  wrongClicks: number
  totalClicks: number
  bestCombo: number
  perfectHits: number
  durationMs: number
  rank: RankInfo
  rating: number
  matchedDriver: DriverProfile
  distribution: number[]
  earlyAverageMs: number | null
  lateAverageMs: number | null
  unlockedAchievementKeys: AchievementKey[]
  beatPersonalBest: boolean
  previousBestScore: number
}

export type StoredProgress = {
  bestByMode: Partial<Record<ModeKey, RunResult>>
  history: RunResult[]
  achievements: AchievementKey[]
}

export type DailyMission = {
  label: string
  progress: number
  goal: number
  valueLabel: string
}

const RANKS: Array<{ threshold: number; rank: RankInfo }> = [
  {
    threshold: 0.92,
    rank: {
      key: 'S+',
      title: 'Elite Driver',
      subtitle: 'Near-instant, race-weekend sharpness.',
    },
  },
  {
    threshold: 0.84,
    rank: {
      key: 'S',
      title: 'Apex Reflex',
      subtitle: 'Fast enough to feel like a front-row launch.',
    },
  },
  {
    threshold: 0.72,
    rank: {
      key: 'A',
      title: 'Track Hunter',
      subtitle: 'Excellent balance between pace and precision.',
    },
  },
  {
    threshold: 0.58,
    rank: {
      key: 'B',
      title: 'Quick Hands',
      subtitle: 'Strong reactions with room to clean up mistakes.',
    },
  },
  {
    threshold: 0.42,
    rank: {
      key: 'C',
      title: 'Rookie',
      subtitle: 'Good base pace. Rhythm is the next step.',
    },
  },
  {
    threshold: 0,
    rank: {
      key: 'D',
      title: 'Slow Start',
      subtitle: 'Cautious opening lap. The next run starts fresh.',
    },
  },
]

export const STORAGE_KEY = 'f1-reaction-arena-progress-v2'

export const DEFAULT_PROGRESS: StoredProgress = {
  bestByMode: {},
  history: [],
  achievements: [],
}

export const ORB_LAYOUT: OrbLayout[] = [
  { id: 'orb-01', slot: '01', top: '14%', left: '16%' },
  { id: 'orb-02', slot: '02', top: '14%', left: '50%' },
  { id: 'orb-03', slot: '03', top: '14%', left: '84%' },
  { id: 'orb-04', slot: '04', top: '33%', left: '28%' },
  { id: 'orb-05', slot: '05', top: '33%', left: '72%' },
  { id: 'orb-06', slot: '06', top: '58%', left: '28%' },
  { id: 'orb-07', slot: '07', top: '58%', left: '72%' },
  { id: 'orb-08', slot: '08', top: '82%', left: '16%' },
  { id: 'orb-09', slot: '09', top: '82%', left: '50%' },
  { id: 'orb-10', slot: '10', top: '82%', left: '84%' },
]

export const MODE_CONFIGS: Record<ModeKey, ModeConfig> = {
  classic: {
    key: 'classic',
    label: 'Classic Reflex',
    tag: '20 SHOTS',
    description:
      'One live orb at a time for 20 total attempts. Built to benchmark average reaction time cleanly.',
    hint: 'Baseline mode for pure response speed.',
    rounds: 20,
    baseWindowMs: 1180,
    minWindowMs: 620,
    baseGapMs: 170,
    baseScore: 320,
    speedBonus: 260,
    wrongPenalty: 90,
    orbScale: 1,
  },
  sprint: {
    key: 'sprint',
    label: 'Sprint 30s',
    tag: '30 SECONDS',
    description:
      'Score as much as possible in 30 seconds. Pace matters, but accuracy still shapes the final result.',
    hint: 'Short, addictive score attack.',
    durationMs: 30_000,
    baseWindowMs: 920,
    minWindowMs: 430,
    baseGapMs: 90,
    baseScore: 250,
    speedBonus: 210,
    wrongPenalty: 105,
    orbScale: 0.98,
  },
  survival: {
    key: 'survival',
    label: 'Survival',
    tag: '3 LIVES',
    description:
      'The session accelerates as you go. Misses and wrong clicks cost lives, and the drill ends at zero.',
    hint: 'Pressure mode with the hardest pacing curve.',
    lives: 3,
    baseWindowMs: 980,
    minWindowMs: 250,
    baseGapMs: 75,
    baseScore: 360,
    speedBonus: 290,
    wrongPenalty: 135,
    orbScale: 0.96,
  },
  precision: {
    key: 'precision',
    label: 'Precision Mode',
    tag: 'SMALL ORBS',
    description:
      'Smaller orb hit areas and heavier penalties for wrong clicks. This mode exposes real control.',
    hint: 'Accuracy-first execution.',
    rounds: 18,
    baseWindowMs: 930,
    minWindowMs: 360,
    baseGapMs: 160,
    baseScore: 380,
    speedBonus: 320,
    wrongPenalty: 180,
    orbScale: 0.76,
  },
  dual: {
    key: 'dual',
    label: 'Dual Target',
    tag: 'FAKE TARGETS',
    description:
      'A real target and a decoy appear together. Decision speed matters as much as reaction speed.',
    hint: 'Judgement drill with visual noise.',
    rounds: 20,
    baseWindowMs: 1_040,
    minWindowMs: 450,
    baseGapMs: 120,
    baseScore: 400,
    speedBonus: 260,
    wrongPenalty: 170,
    orbScale: 0.92,
    hasFakeTarget: true,
  },
}

export const ACHIEVEMENTS = [
  {
    key: 'first_finish',
    label: 'First Green Flag',
    description: 'Complete your first session.',
  },
  {
    key: 'sub_250',
    label: 'Lights Out',
    description: 'Record an average reaction of 250ms or faster.',
  },
  {
    key: 'accuracy_95',
    label: 'Laser Accuracy',
    description: 'Finish a run at 95% accuracy or better.',
  },
  {
    key: 'combo_10',
    label: 'On Fire',
    description: 'Reach a combo of 10.',
  },
  {
    key: 'clean_sheet',
    label: 'No Misfire',
    description: 'Clear a run without misses or wrong clicks.',
  },
  {
    key: 'survival_60',
    label: 'Night Stint',
    description: 'Stay alive for 60 seconds in Survival.',
  },
  {
    key: 'dual_20',
    label: 'Decoy Reader',
    description: 'Reach 20 straight correct reads in Dual Target.',
  },
] as const

export const RIVAL_NAMES = [
  'GRID_GHOST',
  'PITWALL_77',
  'SECTOR_KILLER',
  'NIGHT_STINT',
  'GREEN_FLAG',
]

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mean(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function formatMs(value: number | null) {
  return value === null || Number.isNaN(value) ? '--' : `${Math.round(value)} ms`
}

export function formatScore(value: number) {
  return value.toLocaleString()
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

export function formatSeconds(value: number) {
  return `${(value / 1000).toFixed(1)}s`
}

export function getDateKey(timestamp: number) {
  const date = new Date(timestamp)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function loadStoredProgress() {
  if (typeof window === 'undefined') {
    return DEFAULT_PROGRESS
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return DEFAULT_PROGRESS
    }

    const parsed = JSON.parse(raw) as StoredProgress

    return {
      bestByMode: parsed.bestByMode ?? {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    }
  } catch {
    return DEFAULT_PROGRESS
  }
}

export function createSession(mode: ModeKey): SessionState {
  const config = MODE_CONFIGS[mode]

  return {
    mode,
    runStartedAt: Date.now(),
    clockStartedAt: null,
    endsAt: null,
    timeRemainingMs: config.durationMs ?? 0,
    elapsedMs: 0,
    attemptsResolved: 0,
    hits: 0,
    misses: 0,
    wrongClicks: 0,
    totalClicks: 0,
    combo: 0,
    bestCombo: 0,
    perfectHits: 0,
    score: 0,
    lives: config.lives ?? 0,
    maxLives: config.lives ?? 0,
    lastOrbId: null,
    lastReactionMs: null,
    reactionTimes: [],
  }
}

function difficulty(session: SessionState, config: ModeConfig) {
  if (config.durationMs && session.clockStartedAt !== null) {
    return clamp((performance.now() - session.clockStartedAt) / config.durationMs, 0, 1)
  }

  if (config.rounds) {
    return clamp(session.attemptsResolved / config.rounds, 0, 1)
  }

  return clamp(session.attemptsResolved / 22, 0, 1)
}

export function getWindowMs(session: SessionState, config: ModeConfig) {
  const ratio = difficulty(session, config)
  const shrink =
    config.baseWindowMs -
    ratio * (config.baseWindowMs - config.minWindowMs) -
    (config.key === 'survival' ? session.attemptsResolved * 12 : 0)

  return Math.max(config.minWindowMs, Math.round(shrink))
}

export function getGapMs(session: SessionState, config: ModeConfig) {
  return Math.max(50, Math.round(config.baseGapMs - difficulty(session, config) * 55))
}

export function getOrbScale(session: SessionState, config: ModeConfig) {
  const floor = config.key === 'precision' ? 0.62 : 0.76
  return clamp(config.orbScale - difficulty(session, config) * 0.16, floor, config.orbScale)
}

export function getComboMeta(combo: number) {
  if (combo >= 10) {
    return { multiplier: 2, label: 'ON FIRE' }
  }

  if (combo >= 5) {
    return { multiplier: 1.5, label: 'LIGHTNING' }
  }

  if (combo >= 3) {
    return { multiplier: 1.2, label: `COMBO x${combo}` }
  }

  return { multiplier: 1, label: 'CLEAN HIT' }
}

function rating(
  run: Omit<RunResult, 'matchedDriver' | 'unlockedAchievementKeys' | 'beatPersonalBest' | 'previousBestScore'>,
  config: ModeConfig,
) {
  const speed = run.averageMs > 0 ? clamp((710 - run.averageMs) / 530, 0, 1) : 0
  const accuracy = clamp(run.accuracy / 100, 0, 1)
  const combo = clamp(
    run.bestCombo / (config.key === 'sprint' || config.key === 'survival' ? 14 : 10),
    0,
    1,
  )
  const score = clamp(
    run.score / (config.key === 'survival' ? 9000 : config.key === 'sprint' ? 7500 : 6000),
    0,
    1,
  )
  const discipline = clamp(
    (run.hits - run.wrongClicks) / Math.max(run.hits + run.misses + run.wrongClicks, 1),
    0,
    1,
  )

  if (config.key === 'precision') {
    return clamp(speed * 0.24 + accuracy * 0.4 + combo * 0.14 + score * 0.1 + discipline * 0.12, 0, 1)
  }

  if (config.key === 'dual') {
    return clamp(speed * 0.25 + accuracy * 0.34 + combo * 0.14 + score * 0.11 + discipline * 0.16, 0, 1)
  }

  return clamp(speed * 0.34 + accuracy * 0.3 + combo * 0.16 + score * 0.14 + discipline * 0.06, 0, 1)
}

function archetype(run: RunResult): DriverArchetype {
  if (run.mode === 'precision' || run.accuracy >= 95) {
    return 'precision'
  }

  if (run.mode === 'dual') {
    return 'judgement'
  }

  if (run.mode === 'survival' || run.bestCombo >= 12) {
    return 'endurance'
  }

  if (run.averageMs > 0 && run.averageMs <= 235) {
    return 'aggression'
  }

  if (run.rank.key === 'S+' || run.rank.key === 'S') {
    return 'tempo'
  }

  return 'recovery'
}

function tier(rank: RankKey) {
  if (rank === 'S+' || rank === 'S') return 5
  if (rank === 'A') return 4
  if (rank === 'B') return 3
  if (rank === 'C') return 2
  return 1
}

function pickDriver(run: RunResult) {
  const targetTier = tier(run.rank.key)
  const targetArchetype = archetype(run)

  const candidates = CURRENT_F1_DRIVERS.map((driver) => {
    let score = Math.abs(driver.tier - targetTier) * 2

    if (driver.archetypes.includes(targetArchetype)) score -= 2
    if (run.mode === 'survival' && driver.archetypes.includes('endurance')) score -= 1
    if (run.mode === 'dual' && driver.archetypes.includes('judgement')) score -= 1
    if (
      run.averageMs > 0 &&
      run.averageMs <= 240 &&
      driver.archetypes.includes('aggression')
    ) {
      score -= 1
    }

    return { driver, score }
  }).sort((left, right) => left.score - right.score)

  const pool = candidates.filter((entry) => entry.score <= candidates[0].score + 1).slice(0, 4)

  return pool[Math.floor(Math.random() * pool.length)].driver
}

export function buildRunResult(session: SessionState, progress: StoredProgress): RunResult {
  const config = MODE_CONFIGS[session.mode]
  const early = session.reactionTimes.slice(0, Math.max(1, Math.floor(session.reactionTimes.length / 2)))
  const late = session.reactionTimes.slice(Math.max(1, Math.floor(session.reactionTimes.length / 2)))
  const previousBest = progress.bestByMode[session.mode]

  const draft: RunResult = {
    mode: session.mode,
    timestamp: Date.now(),
    score: session.score,
    averageMs: mean(session.reactionTimes),
    fastestMs: session.reactionTimes.length ? Math.min(...session.reactionTimes) : null,
    slowestMs: session.reactionTimes.length ? Math.max(...session.reactionTimes) : null,
    accuracy:
      (session.hits / Math.max(session.hits + session.misses + session.wrongClicks, 1)) *
      100,
    hits: session.hits,
    misses: session.misses,
    wrongClicks: session.wrongClicks,
    totalClicks: session.totalClicks,
    bestCombo: session.bestCombo,
    perfectHits: session.perfectHits,
    durationMs:
      session.clockStartedAt === null
        ? 0
        : Math.max(0, Math.round(performance.now() - session.clockStartedAt)),
    rank: RANKS[RANKS.length - 1].rank,
    rating: 0,
    matchedDriver: CURRENT_F1_DRIVERS[0],
    distribution: session.reactionTimes.slice(-12),
    earlyAverageMs: early.length ? mean(early) : null,
    lateAverageMs: late.length ? mean(late) : null,
    unlockedAchievementKeys: [],
    beatPersonalBest: previousBest ? session.score > previousBest.score : true,
    previousBestScore: previousBest?.score ?? 0,
  }

  draft.rating = rating(draft, config)
  draft.rank =
    RANKS.find((entry) => draft.rating >= entry.threshold)?.rank ??
    RANKS[RANKS.length - 1].rank
  draft.matchedDriver = pickDriver(draft)
  draft.unlockedAchievementKeys = ACHIEVEMENTS.filter((achievement) => {
    if (progress.achievements.includes(achievement.key)) return false
    if (achievement.key === 'first_finish') return true
    if (achievement.key === 'sub_250') return draft.averageMs > 0 && draft.averageMs <= 250
    if (achievement.key === 'accuracy_95') return draft.accuracy >= 95
    if (achievement.key === 'combo_10') return draft.bestCombo >= 10
    if (achievement.key === 'clean_sheet') return draft.wrongClicks === 0 && draft.misses === 0
    if (achievement.key === 'survival_60') return draft.mode === 'survival' && draft.durationMs >= 60_000
    return draft.mode === 'dual' && draft.bestCombo >= 20
  }).map((achievement) => achievement.key)

  return draft
}

export function mergeRun(progress: StoredProgress, run: RunResult): StoredProgress {
  const best = progress.bestByMode[run.mode]
  const nextBest = !best || run.score >= best.score ? run : best

  return {
    bestByMode: {
      ...progress.bestByMode,
      [run.mode]: nextBest,
    },
    history: [run, ...progress.history].slice(0, 24),
    achievements: Array.from(
      new Set<AchievementKey>([...progress.achievements, ...run.unlockedAchievementKeys]),
    ),
  }
}

export function buildDailyMissions(history: RunResult[]): DailyMission[] {
  const today = getDateKey(Date.now())
  const todayRuns = history.filter((run) => getDateKey(run.timestamp) === today)
  const sprintBest = todayRuns
    .filter((run) => run.mode === 'sprint')
    .reduce((best, run) => Math.max(best, run.score), 0)
  const accurateRuns = todayRuns.filter((run) => run.accuracy >= 90).length
  const fastRun = todayRuns.some((run) => run.averageMs > 0 && run.averageMs <= 230) ? 1 : 0

  return [
    {
      label: 'Play three sessions today',
      progress: Math.min(todayRuns.length, 3),
      goal: 3,
      valueLabel: `${todayRuns.length}/3`,
    },
    {
      label: 'Score 5,000 in Sprint',
      progress: Math.min(sprintBest, 5000),
      goal: 5000,
      valueLabel: `${formatScore(sprintBest)} / 5,000`,
    },
    {
      label: 'Break 230ms average',
      progress: fastRun,
      goal: 1,
      valueLabel: fastRun ? 'Done' : 'Open',
    },
    {
      label: 'Finish two runs at 90%+ accuracy',
      progress: Math.min(accurateRuns, 2),
      goal: 2,
      valueLabel: `${accurateRuns}/2`,
    },
  ]
}

export function buildLeaderboard(score: number) {
  const anchor = Math.max(score, 3400)

  return [
    ...RIVAL_NAMES.map((name, index) => ({
      name,
      score: Math.round(anchor * (1.16 - index * 0.08)),
    })),
    { name: 'YOU', score },
  ]
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
}

export function getAchievementMeta(key: AchievementKey) {
  return ACHIEVEMENTS.find((achievement) => achievement.key === key)
}
