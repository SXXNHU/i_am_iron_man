import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import {
  ACHIEVEMENTS,
  MODE_CONFIGS,
  ORB_LAYOUT,
  STORAGE_KEY,
  buildDailyMissions,
  buildLeaderboard,
  buildRunResult,
  clamp,
  createSession,
  formatMs,
  formatPercent,
  formatScore,
  formatSeconds,
  getAchievementMeta,
  getComboMeta,
  getDateKey,
  getGapMs,
  getOrbScale,
  getWindowMs,
  loadStoredProgress,
  mergeRun,
  type ActiveTarget,
  type DailyMission,
  type ModeConfig,
  type ModeKey,
  type RunResult,
  type SessionState,
  type StoredProgress,
} from './gameData'

type Phase = 'hangar' | 'countdown' | 'live' | 'results'
export type AppState =
  | Phase
  | 'idle'
  | 'requesting_permissions'
  | 'armed'
  | 'first_clap_detected'
  | 'launching'
  | 'greeting'
  | 'voice_ready'
  | 'conversation_active'
  | 'stopped'
  | 'error'
type FlashTone = 'neutral' | 'success' | 'warning'
type FlashMessage = { text: string; detail: string; tone: FlashTone; token: number }
type ImpactState = { orbId: string; tone: 'success' | 'warning'; token: number }
type Viewport = 'desktop' | 'mobile'

type ModeGarageProps = {
  selectedMode: ModeKey
  phase: Phase
  onSelectMode: (mode: ModeKey) => void
}

type MissionBoardProps = {
  missions: DailyMission[]
  title?: string
}

type MetricsRibbonProps = {
  phase: Phase
  liveMode: ModeConfig
  session: SessionState | null
  result: RunResult | null
}

type ArenaBoardProps = {
  viewport: Viewport
  phase: Phase
  selectedMode: ModeKey
  activeMode: ModeConfig
  liveMode: ModeConfig
  session: SessionState | null
  result: RunResult | null
  activeTargets: ActiveTarget[]
  impact: ImpactState | null
  flashMessage: FlashMessage | null
  countdownIndex: number | null
  shareCopied: boolean
  onOrbClick: (orbId: string) => void
  onStart: (mode: ModeKey) => void
  onReset: () => void
  onCopyShare: () => Promise<void>
}

type ResultRailProps = {
  result: RunResult
  shareCopied: boolean
  onCopyShare: () => Promise<void>
}

type InsightsRailProps = {
  leaderboard: Array<{ name: string; score: number }>
  progress: StoredProgress
  recentAchievementLabels: string[]
}

type ShellProps = {
  phase: Phase
  selectedMode: ModeKey
  activeMode: ModeConfig
  liveMode: ModeConfig
  session: SessionState | null
  result: RunResult | null
  progress: StoredProgress
  bestForMode: RunResult | null
  todayBest?: RunResult
  weeklyBest?: RunResult
  dailyMissions: DailyMission[]
  leaderboard: Array<{ name: string; score: number }>
  activeTargets: ActiveTarget[]
  impact: ImpactState | null
  flashMessage: FlashMessage | null
  countdownIndex: number | null
  shareCopied: boolean
  recentAchievementLabels: string[]
  onSelectMode: (mode: ModeKey) => void
  onOrbClick: (orbId: string) => void
  onStart: (mode: ModeKey) => void
  onReset: () => void
  onCopyShare: () => Promise<void>
}

const COUNTDOWN_STEPS = ['3', '2', '1', 'GO'] as const
const SITE_TABS = ['Schedule', 'Standings', 'Training Modes', 'Latest']
const wallClockNow = () => Date.now()
const monotonicNow = () => performance.now()

function getStatusLabel(phase: Phase) {
  if (phase === 'live') return 'Live Session'
  if (phase === 'countdown') return 'Grid Countdown'
  if (phase === 'results') return 'Results Ready'
  return 'Garage Open'
}

function getAccuracy(session: SessionState | null, result: RunResult | null) {
  if (session) {
    return (
      (session.hits /
        Math.max(session.hits + session.misses + session.wrongClicks, 1)) *
      100
    )
  }

  return result?.accuracy ?? 0
}

function SiteBar({ phase, liveMode }: { phase: Phase; liveMode: ModeConfig }) {
  return (
    <header className="site-bar">
      <div className="site-brand">
        <span className="site-brand-mark">F1</span>
        <div className="site-brand-copy">
          <strong>Reaction Arena</strong>
          <span>Official-grid inspired reflex training</span>
        </div>
      </div>
      <nav className="site-nav" aria-label="Primary">
        {SITE_TABS.map((tab) => (
          <span className="site-nav-pill" key={tab}>
            {tab}
          </span>
        ))}
      </nav>
      <div className="site-status">
        <span>{getStatusLabel(phase)}</span>
        <strong>{liveMode.label}</strong>
      </div>
    </header>
  )
}

function ModeGarage({ selectedMode, phase, onSelectMode }: ModeGarageProps) {
  return (
    <section className="system-panel">
      <div className="panel-title-row">
        <div>
          <p className="panel-eyebrow">Training Modes</p>
          <h2>Garage Selector</h2>
        </div>
      </div>
      <div className="mode-garage">
        {Object.values(MODE_CONFIGS).map((mode) => (
          <button
            key={mode.key}
            className={`mode-garage-card${selectedMode === mode.key ? ' mode-garage-card-active' : ''}`}
            disabled={phase === 'countdown' || phase === 'live'}
            onClick={() => onSelectMode(mode.key)}
            type="button"
          >
            <div className="mode-garage-head">
              <strong>{mode.label}</strong>
              <span>{mode.tag}</span>
            </div>
            <p>{mode.description}</p>
            <small>{mode.hint}</small>
          </button>
        ))}
      </div>
    </section>
  )
}

function MissionBoard({ missions, title = 'Pit Wall Missions' }: MissionBoardProps) {
  return (
    <section className="system-panel">
      <div className="panel-title-row">
        <div>
          <p className="panel-eyebrow">Daily Progress</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="mission-board">
        {missions.map((mission) => (
          <article className="mission-card" key={mission.label}>
            <div className="mission-card-head">
              <strong>{mission.label}</strong>
              <span>{mission.valueLabel}</span>
            </div>
            <div className="mission-card-track">
              <span style={{ width: `${clamp(mission.progress / mission.goal, 0, 1) * 100}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function MetricsRibbon({ phase, liveMode, session, result }: MetricsRibbonProps) {
  const cards = [
    {
      label: 'Mode',
      value: liveMode.label,
      detail: phase === 'live' ? 'Telemetry live' : 'Pre-session',
    },
    {
      label: 'Score',
      value: formatScore(session?.score ?? result?.score ?? 0),
      detail: 'Combo weighted',
    },
    {
      label: 'Combo',
      value: `x${session?.combo ?? result?.bestCombo ?? 0}`,
      detail: `Best ${session?.bestCombo ?? result?.bestCombo ?? 0}`,
    },
    {
      label: 'Timer',
      value: liveMode.durationMs
        ? formatSeconds(session?.timeRemainingMs ?? liveMode.durationMs)
        : formatSeconds(session?.elapsedMs ?? result?.durationMs ?? 0),
      detail: liveMode.key === 'survival'
        ? `Lives ${session?.lives ?? liveMode.lives ?? 0}`
        : `${session?.attemptsResolved ?? result?.hits ?? 0} resolved`,
    },
    {
      label: 'Accuracy',
      value: formatPercent(getAccuracy(session, result)),
      detail: 'Hits vs errors',
    },
  ]

  return (
    <section className="metrics-ribbon">
      {cards.map((card) => (
        <article className="metric-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.detail}</p>
        </article>
      ))}
    </section>
  )
}

function ArenaBoard(props: ArenaBoardProps) {
  const {
    viewport,
    phase,
    selectedMode,
    activeMode,
    liveMode,
    session,
    result,
    activeTargets,
    impact,
    flashMessage,
    countdownIndex,
    shareCopied,
    onOrbClick,
    onStart,
    onReset,
    onCopyShare,
  } = props

  return (
    <section className={`arena-shell arena-shell-${viewport}`}>
      <div className="arena-header">
        <div>
          <p className="panel-eyebrow">Reaction Deck</p>
          <h2>{phase === 'live' ? liveMode.label : activeMode.label}</h2>
        </div>
        <div className="arena-header-tags">
          <span>{liveMode.tag}</span>
          <span>{viewport === 'desktop' ? 'Desktop race deck' : 'Mobile pit view'}</span>
        </div>
      </div>

      <div className={`arena-surface arena-surface-${viewport}`}>
        {ORB_LAYOUT.map((orb) => {
          const target = activeTargets.find((item) => item.orbId === orb.id)
          const scale = target?.scale ?? liveMode.orbScale
          const sizeClass =
            scale <= 0.68 ? 'arena-orb-small' : scale <= 0.82 ? 'arena-orb-tight' : ''

          return (
            <button
              key={orb.id}
              className={`arena-orb ${sizeClass}${target?.kind === 'real' ? ' arena-orb-real' : ''}${target?.kind === 'fake' ? ' arena-orb-fake' : ''}`}
              onClick={() => onOrbClick(orb.id)}
              style={{ top: orb.top, left: orb.left }}
              type="button"
            >
              <span className="arena-orb-core" />
              <span className="arena-orb-slot">{orb.slot}</span>
              {target ? (
                <span className="arena-orb-status">
                  {target.kind === 'real' ? 'Live' : 'Decoy'}
                </span>
              ) : null}
              {impact?.orbId === orb.id ? (
                <span
                  className={`arena-orb-ripple${impact.tone === 'warning' ? ' arena-orb-ripple-warning' : ''}`}
                  key={impact.token}
                />
              ) : null}
            </button>
          )
        })}

        {phase === 'hangar' ? (
          <section className="arena-overlay-card">
            <p className="panel-eyebrow">Ferrari editorial hero x F1 telemetry</p>
            <h3>{activeMode.label}</h3>
            <p>{activeMode.description}</p>
            <div className="overlay-chip-row">
              <span>{activeMode.tag}</span>
              <span>{activeMode.hint}</span>
            </div>
            <div className="overlay-action-row">
              <button className="primary-action" onClick={() => onStart(selectedMode)} type="button">
                Start Session
              </button>
              <button className="secondary-action" onClick={onReset} type="button">
                Reset Grid
              </button>
            </div>
          </section>
        ) : null}

        {phase === 'countdown' ? (
          <section className="arena-overlay-card arena-overlay-card-countdown">
            <p className="panel-eyebrow">Lights out sequence</p>
            <strong>{countdownIndex === null ? '3' : COUNTDOWN_STEPS[countdownIndex]}</strong>
            <span>Wait for the redline moment, then hit the active orb immediately.</span>
          </section>
        ) : null}

        {phase === 'live' ? (
          <section className="arena-live-card">
            <span>{liveMode.key === 'dual' ? 'Hit the red target, ignore the decoy.' : 'Hit the lit orb before the window closes.'}</span>
            <strong>{formatMs(session?.lastReactionMs ?? null)}</strong>
            <p>Last reaction</p>
          </section>
        ) : null}

        {phase === 'results' && result ? (
          <section className="arena-overlay-card arena-overlay-card-result">
            <p className="panel-eyebrow">Session result</p>
            <h3>
              {result.rank.key} {result.rank.title}
            </h3>
            <p>{result.rank.subtitle}</p>
            <div className="overlay-stat-grid">
              <article>
                <span>Average</span>
                <strong>{formatMs(result.averageMs)}</strong>
              </article>
              <article>
                <span>Accuracy</span>
                <strong>{formatPercent(result.accuracy)}</strong>
              </article>
              <article>
                <span>Best Combo</span>
                <strong>x{result.bestCombo}</strong>
              </article>
              <article>
                <span>Score</span>
                <strong>{formatScore(result.score)}</strong>
              </article>
            </div>
            <div className="overlay-action-row">
              <button className="primary-action" onClick={() => onStart(selectedMode)} type="button">
                Run Again
              </button>
              <button className="secondary-action" onClick={() => void onCopyShare()} type="button">
                {shareCopied ? 'Copied' : 'Copy Share Card'}
              </button>
            </div>
          </section>
        ) : null}

        {flashMessage ? (
          <div className={`flash-banner flash-banner-${flashMessage.tone}`} key={flashMessage.token}>
            <strong>{flashMessage.text}</strong>
            <span>{flashMessage.detail}</span>
          </div>
        ) : null}
      </div>

      <div className="arena-footer">
        <span>Brand direction: F1 red, carbon black, editorial white space.</span>
        <span>Dual mode uses a live target and one deliberate decoy.</span>
      </div>
    </section>
  )
}

function ResultRail({ result, shareCopied, onCopyShare }: ResultRailProps) {
  return (
    <div className="result-rail">
      <section className="system-panel system-panel-highlight">
        <div className="panel-title-row">
          <div>
            <p className="panel-eyebrow">Closest Driver</p>
            <h2>Current F1 Match</h2>
          </div>
        </div>
        <article className="driver-profile-card">
          <span className="driver-number-chip">#{result.matchedDriver.number}</span>
          <h3>{result.matchedDriver.name}</h3>
          <p className="driver-meta">
            {result.matchedDriver.team} / {result.matchedDriver.nationality}
          </p>
          <strong>{result.matchedDriver.title}</strong>
          <p>{result.matchedDriver.summary}</p>
          <div className="driver-callout">
            Closest match: this run felt most like <span>{result.matchedDriver.name}</span>.
          </div>
        </article>
      </section>

      <section className="system-panel">
        <div className="panel-title-row">
          <div>
            <p className="panel-eyebrow">Telemetry</p>
            <h2>Performance Split</h2>
          </div>
        </div>
        <div className="result-stat-grid">
          <article className="result-stat-card">
            <span>Fastest</span>
            <strong>{formatMs(result.fastestMs)}</strong>
          </article>
          <article className="result-stat-card">
            <span>Slowest</span>
            <strong>{formatMs(result.slowestMs)}</strong>
          </article>
          <article className="result-stat-card">
            <span>Hits / Fails</span>
            <strong>
              {result.hits} / {result.misses + result.wrongClicks}
            </strong>
          </article>
          <article className="result-stat-card">
            <span>Perfect Hits</span>
            <strong>{result.perfectHits}</strong>
          </article>
        </div>
        <div className="distribution-chart">
          {result.distribution.length > 0 ? (
            result.distribution.map((value, index) => (
              <div className="distribution-column" key={`${value}-${index}`}>
                <span style={{ height: `${clamp((430 - value) / 260, 0.18, 1) * 100}%` }} />
                <small>{Math.round(value)}</small>
              </div>
            ))
          ) : (
            <p className="distribution-empty">No registered hits yet.</p>
          )}
        </div>
        <div className="trend-grid">
          <article className="trend-chip">
            <span>Opening Half</span>
            <strong>{formatMs(result.earlyAverageMs)}</strong>
          </article>
          <article className="trend-chip">
            <span>Closing Half</span>
            <strong>{formatMs(result.lateAverageMs)}</strong>
          </article>
          <article className="trend-chip">
            <span>PB Delta</span>
            <strong>
              {result.previousBestScore > 0
                ? `${result.score - result.previousBestScore >= 0 ? '+' : ''}${formatScore(result.score - result.previousBestScore)}`
                : 'NEW'}
            </strong>
          </article>
        </div>
      </section>

      <section className="system-panel system-panel-share">
        <div className="panel-title-row">
          <div>
            <p className="panel-eyebrow">Share Card</p>
            <h2>Race Weekend Summary</h2>
          </div>
        </div>
        <article className="share-card">
          <span className="share-rank-line">
            {result.rank.key} / {result.rank.title}
          </span>
          <strong>{formatScore(result.score)} pts</strong>
          <p>{formatMs(result.averageMs)} average reaction</p>
          <small>I matched closest to {result.matchedDriver.name} in F1 Reaction Arena.</small>
          <button className="share-card-button" onClick={() => void onCopyShare()} type="button">
            {shareCopied ? 'Copied' : 'Copy Card Text'}
          </button>
        </article>
      </section>
    </div>
  )
}

function InsightsRail({ leaderboard, progress, recentAchievementLabels }: InsightsRailProps) {
  return (
    <div className="insights-rail">
      <section className="system-panel">
        <div className="panel-title-row">
          <div>
            <p className="panel-eyebrow">Leaderboard</p>
            <h2>Local Timing Board</h2>
          </div>
        </div>
        <div className="leaderboard-stack">
          {leaderboard.map((entry, index) => (
            <article
              className={`leaderboard-row${entry.name === 'YOU' ? ' leaderboard-row-user' : ''}`}
              key={`${entry.name}-${entry.score}`}
            >
              <span>#{index + 1}</span>
              <strong>{entry.name}</strong>
              <p>{formatScore(entry.score)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="system-panel">
        <div className="panel-title-row">
          <div>
            <p className="panel-eyebrow">Achievements</p>
            <h2>Unlocked Pressure Marks</h2>
          </div>
        </div>
        <div className="achievement-grid">
          {ACHIEVEMENTS.map((achievement) => (
            <article
              className={`achievement-card${progress.achievements.includes(achievement.key) ? ' achievement-card-live' : ''}`}
              key={achievement.key}
            >
              <strong>{achievement.label}</strong>
              <p>{achievement.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="system-panel">
        <div className="panel-title-row">
          <div>
            <p className="panel-eyebrow">Design Note</p>
            <h2>Reference Blend</h2>
          </div>
        </div>
        <div className="notes-stack">
          <article className="note-card">
            <strong>F1 rhythm</strong>
            <p>Strong red top bars, dense information cards, fast scanning, and telemetry hierarchy.</p>
          </article>
          <article className="note-card">
            <strong>Ferrari restraint</strong>
            <p>Editorial spacing, off-white surfaces, and a more premium product-story presentation.</p>
          </article>
          <article className="note-card note-card-accent">
            <strong>Latest unlocks</strong>
            <p>{recentAchievementLabels.length > 0 ? recentAchievementLabels.join(' / ') : 'No recent unlocks yet.'}</p>
          </article>
        </div>
      </section>
    </div>
  )
}

function DesktopShell(props: ShellProps) {
  const {
    phase,
    selectedMode,
    activeMode,
    liveMode,
    session,
    result,
    progress,
    bestForMode,
    todayBest,
    weeklyBest,
    dailyMissions,
    leaderboard,
    activeTargets,
    impact,
    flashMessage,
    countdownIndex,
    shareCopied,
    recentAchievementLabels,
    onSelectMode,
    onOrbClick,
    onStart,
    onReset,
    onCopyShare,
  } = props

  const heroCards = [
    {
      label: 'Today Best',
      value: todayBest ? formatScore(todayBest.score) : '----',
      detail: todayBest ? MODE_CONFIGS[todayBest.mode].label : 'Waiting for first session',
    },
    {
      label: 'Week Best',
      value: weeklyBest ? formatScore(weeklyBest.score) : '----',
      detail: weeklyBest ? weeklyBest.rank.title : 'No weekly record yet',
    },
    {
      label: 'Personal Best',
      value: bestForMode ? formatScore(bestForMode.score) : 'NO RECORD',
      detail: bestForMode ? formatMs(bestForMode.averageMs) : 'Selected mode has no run yet',
    },
    {
      label: 'Achievements',
      value: String(progress.achievements.length),
      detail: 'Permanent unlock count',
    },
  ]

  return (
    <section className="desktop-shell">
      <div className="shell-frame">
        <SiteBar phase={phase} liveMode={liveMode} />

        <section className="desktop-hero">
          <article className="hero-editorial-card">
            <p className="panel-eyebrow">2026 training edition</p>
            <h1>Redline Reaction Control</h1>
            <p className="hero-copy">
              Built with the current Formula 1 homepage rhythm in mind: red-first hierarchy, schedule-and-standings density, sharp card rails, and Ferrari-like editorial calm in the white space. The result is a race-weekend reflex sim with a cleaner premium shell.
            </p>
            <div className="hero-chip-row">
              <span>F1 red telemetry</span>
              <span>Ferrari editorial spacing</span>
              <span>Desktop-first race deck</span>
            </div>
            <div className="hero-action-row">
              <button className="primary-action" onClick={() => onStart(selectedMode)} type="button">
                Start {activeMode.label}
              </button>
              <button className="secondary-action" onClick={onReset} type="button">
                Reset Session
              </button>
            </div>
          </article>

          <div className="hero-stats-column">
            {heroCards.map((card) => (
              <article className="hero-stat-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="desktop-main">
          <aside className="desktop-side desktop-side-left">
            <ModeGarage phase={phase} selectedMode={selectedMode} onSelectMode={onSelectMode} />
            <MissionBoard missions={dailyMissions} />
          </aside>

          <section className="desktop-center">
            <MetricsRibbon phase={phase} liveMode={liveMode} result={result} session={session} />
            <ArenaBoard
              viewport="desktop"
              phase={phase}
              selectedMode={selectedMode}
              activeMode={activeMode}
              liveMode={liveMode}
              session={session}
              result={result}
              activeTargets={activeTargets}
              impact={impact}
              flashMessage={flashMessage}
              countdownIndex={countdownIndex}
              shareCopied={shareCopied}
              onOrbClick={onOrbClick}
              onStart={onStart}
              onReset={onReset}
              onCopyShare={onCopyShare}
            />
          </section>

          <aside className="desktop-side desktop-side-right">
            {result ? (
              <ResultRail result={result} shareCopied={shareCopied} onCopyShare={onCopyShare} />
            ) : (
              <InsightsRail
                leaderboard={leaderboard}
                progress={progress}
                recentAchievementLabels={recentAchievementLabels}
              />
            )}
          </aside>
        </section>
      </div>
    </section>
  )
}

function MobileShell(props: ShellProps) {
  const {
    phase,
    selectedMode,
    activeMode,
    liveMode,
    session,
    result,
    progress,
    bestForMode,
    todayBest,
    weeklyBest,
    dailyMissions,
    leaderboard,
    activeTargets,
    impact,
    flashMessage,
    countdownIndex,
    shareCopied,
    recentAchievementLabels,
    onSelectMode,
    onOrbClick,
    onStart,
    onReset,
    onCopyShare,
  } = props

  return (
    <section className="mobile-shell">
      <div className="shell-frame">
        <SiteBar phase={phase} liveMode={liveMode} />

        <section className="mobile-hero-card">
          <p className="panel-eyebrow">Redline mobile deck</p>
          <h1>Desktop logic, mobile focus.</h1>
          <p>
            The mobile layout keeps the same training logic but compresses the information hierarchy into a tighter pit-wall flow: status first, arena second, management panels last.
          </p>
          <div className="hero-action-row">
            <button className="primary-action" onClick={() => onStart(selectedMode)} type="button">
              Start {activeMode.label}
            </button>
            <button className="secondary-action" onClick={onReset} type="button">
              Reset
            </button>
          </div>
        </section>

        <section className="mobile-summary-scroll" aria-label="Key summaries">
          <article className="mobile-summary-card">
            <span>Today Best</span>
            <strong>{todayBest ? formatScore(todayBest.score) : '----'}</strong>
            <p>{todayBest ? MODE_CONFIGS[todayBest.mode].label : 'No run yet'}</p>
          </article>
          <article className="mobile-summary-card">
            <span>Week Best</span>
            <strong>{weeklyBest ? formatScore(weeklyBest.score) : '----'}</strong>
            <p>{weeklyBest ? weeklyBest.rank.title : 'Open leaderboard'}</p>
          </article>
          <article className="mobile-summary-card">
            <span>Selected PB</span>
            <strong>{bestForMode ? formatScore(bestForMode.score) : '----'}</strong>
            <p>{bestForMode ? formatMs(bestForMode.averageMs) : activeMode.label}</p>
          </article>
          <article className="mobile-summary-card">
            <span>Achievements</span>
            <strong>{progress.achievements.length}</strong>
            <p>Total unlocked</p>
          </article>
        </section>

        <MetricsRibbon phase={phase} liveMode={liveMode} result={result} session={session} />

        <ArenaBoard
          viewport="mobile"
          phase={phase}
          selectedMode={selectedMode}
          activeMode={activeMode}
          liveMode={liveMode}
          session={session}
          result={result}
          activeTargets={activeTargets}
          impact={impact}
          flashMessage={flashMessage}
          countdownIndex={countdownIndex}
          shareCopied={shareCopied}
          onOrbClick={onOrbClick}
          onStart={onStart}
          onReset={onReset}
          onCopyShare={onCopyShare}
        />

        <div className="mobile-stack">
          <ModeGarage phase={phase} selectedMode={selectedMode} onSelectMode={onSelectMode} />
          <MissionBoard missions={dailyMissions} title="Mobile Mission Stack" />
          {result ? (
            <ResultRail result={result} shareCopied={shareCopied} onCopyShare={onCopyShare} />
          ) : (
            <InsightsRail
              leaderboard={leaderboard}
              progress={progress}
              recentAchievementLabels={recentAchievementLabels}
            />
          )}
        </div>
      </div>
    </section>
  )
}

function App() {
  const [phase, setPhase] = useState<Phase>('hangar')
  const [selectedMode, setSelectedMode] = useState<ModeKey>('classic')
  const [session, setSession] = useState<SessionState | null>(null)
  const [countdownIndex, setCountdownIndex] = useState<number | null>(null)
  const [activeTargets, setActiveTargets] = useState<ActiveTarget[]>([])
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null)
  const [impact, setImpact] = useState<ImpactState | null>(null)
  const [result, setResult] = useState<RunResult | null>(null)
  const [progress, setProgress] = useState<StoredProgress>(() => loadStoredProgress())
  const [shareCopied, setShareCopied] = useState(false)
  const [referenceNow] = useState(() => wallClockNow())

  const sessionRef = useRef<SessionState | null>(null)
  const targetsRef = useRef<ActiveTarget[]>([])
  const progressRef = useRef(progress)
  const finishGuardRef = useRef(false)
  const spawnTimeoutRef = useRef<number | null>(null)
  const expireTimeoutRef = useRef<number | null>(null)
  const countdownTimeoutRef = useRef<number | null>(null)
  const flashTimeoutRef = useRef<number | null>(null)
  const impactTimeoutRef = useRef<number | null>(null)
  const copyTimeoutRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const scheduleNextWaveRef = useRef<(delayMs: number) => void>(() => undefined)

  const activeMode = MODE_CONFIGS[selectedMode]
  const liveMode = session ? MODE_CONFIGS[session.mode] : activeMode
  const bestForMode = progress.bestByMode[selectedMode] ?? null
  const todayKey = getDateKey(referenceNow)
  const todayBest = progress.history
    .filter((run) => getDateKey(run.timestamp) === todayKey)
    .sort((a, b) => b.score - a.score)[0]
  const weeklyBest = progress.history
    .filter((run) => referenceNow - run.timestamp <= 7 * 24 * 60 * 60 * 1000)
    .sort((a, b) => b.score - a.score)[0]
  const dailyMissions = buildDailyMissions(progress.history)
  const leaderboard = buildLeaderboard(
    result?.mode === selectedMode
      ? result.score
      : bestForMode?.score ?? todayBest?.score ?? 4200,
  )
  const recentAchievementLabels = progress.achievements
    .slice(-3)
    .map((key) => getAchievementMeta(key)?.label ?? '')
    .filter(Boolean)

  const commitSession = useCallback((next: SessionState | null) => {
    sessionRef.current = next
    setSession(next)
  }, [])

  const commitTargets = useCallback((next: ActiveTarget[]) => {
    targetsRef.current = next
    setActiveTargets(next)
  }, [])

  const commitProgress = useCallback((next: StoredProgress) => {
    progressRef.current = next
    setProgress(next)
  }, [])

  const clearWaveTimers = useCallback(() => {
    if (spawnTimeoutRef.current !== null) window.clearTimeout(spawnTimeoutRef.current)
    if (expireTimeoutRef.current !== null) window.clearTimeout(expireTimeoutRef.current)
    spawnTimeoutRef.current = null
    expireTimeoutRef.current = null
  }, [])

  const clearTransientTimers = useCallback(() => {
    if (countdownTimeoutRef.current !== null) window.clearTimeout(countdownTimeoutRef.current)
    if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current)
    if (impactTimeoutRef.current !== null) window.clearTimeout(impactTimeoutRef.current)
    if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current)
    countdownTimeoutRef.current = null
    flashTimeoutRef.current = null
    impactTimeoutRef.current = null
    copyTimeoutRef.current = null
  }, [])

  const ensureAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext()
    }

    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume()
    }

    return audioContextRef.current
  }, [])

  const playTone = useCallback(
    (
      frequency: number,
      durationMs: number,
      type: OscillatorType,
      gainValue: number,
      delay = 0,
    ) => {
      const context = ensureAudio()
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      const now = context.currentTime + delay

      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, now)
      gainNode.gain.setValueAtTime(0.0001, now)
      gainNode.gain.exponentialRampToValueAtTime(gainValue, now + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + durationMs / 1000 + 0.05)
    },
    [ensureAudio],
  )

  const playSfx = useCallback(
    (kind: 'countdown' | 'go' | 'hit' | 'miss' | 'combo' | 'finish') => {
      if (kind === 'countdown') playTone(520, 120, 'square', 0.028)
      if (kind === 'go') {
        playTone(600, 150, 'square', 0.03)
        playTone(860, 200, 'triangle', 0.018, 0.12)
      }
      if (kind === 'hit') {
        playTone(760, 110, 'triangle', 0.02)
        playTone(980, 70, 'sine', 0.016, 0.05)
      }
      if (kind === 'miss') playTone(220, 190, 'sawtooth', 0.022)
      if (kind === 'combo') {
        playTone(880, 90, 'triangle', 0.026)
        playTone(1180, 120, 'triangle', 0.02, 0.08)
      }
      if (kind === 'finish') {
        playTone(420, 120, 'triangle', 0.022)
        playTone(560, 140, 'triangle', 0.02, 0.11)
        playTone(720, 200, 'triangle', 0.018, 0.24)
      }
    },
    [playTone],
  )

  const showFlash = useCallback((text: string, detail: string, tone: FlashTone) => {
    setFlashMessage({ text, detail, tone, token: wallClockNow() })
    if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current)
    flashTimeoutRef.current = window.setTimeout(() => setFlashMessage(null), 1000)
  }, [])

  const showImpact = useCallback((orbId: string, tone: 'success' | 'warning') => {
    setImpact({ orbId, tone, token: wallClockNow() })
    if (impactTimeoutRef.current !== null) window.clearTimeout(impactTimeoutRef.current)
    impactTimeoutRef.current = window.setTimeout(() => setImpact(null), 240)
  }, [])

  const finishRun = useCallback(
    (snapshot?: SessionState) => {
      if (finishGuardRef.current) return

      const finalSession = snapshot ?? sessionRef.current
      if (!finalSession) return

      finishGuardRef.current = true
      clearWaveTimers()
      commitTargets([])

      const run = buildRunResult(finalSession, progressRef.current)
      const nextProgress = mergeRun(progressRef.current, run)

      playSfx('finish')
      showFlash(
        run.rank.key,
        run.rank.title,
        run.rank.key === 'S+' || run.rank.key === 'S' ? 'success' : 'neutral',
      )

      startTransition(() => {
        commitProgress(nextProgress)
        setResult(run)
        setPhase('results')
        commitSession(finalSession)
      })
    },
    [clearWaveTimers, commitProgress, commitSession, commitTargets, playSfx, showFlash],
  )

  const scheduleNextWave = useCallback(
    (delayMs: number) => {
      clearWaveTimers()
      spawnTimeoutRef.current = window.setTimeout(() => {
        const current = sessionRef.current
        if (!current || phase !== 'live') return

        const config = MODE_CONFIGS[current.mode]
        if (
          (config.rounds && current.attemptsResolved >= config.rounds) ||
          (config.durationMs && current.timeRemainingMs <= 0) ||
          (config.lives && current.lives <= 0)
        ) {
          finishRun(current)
          return
        }

        const choices = ORB_LAYOUT.filter((orb) => orb.id !== current.lastOrbId)
        const real = choices[Math.floor(Math.random() * choices.length)] ?? ORB_LAYOUT[0]
        const windowMs = getWindowMs(current, config)
        const scale = getOrbScale(current, config)
        const targets: ActiveTarget[] = [
          { orbId: real.id, kind: 'real', spawnAt: monotonicNow(), windowMs, scale },
        ]

        if (config.hasFakeTarget) {
          const decoys = ORB_LAYOUT.filter((orb) => orb.id !== real.id)
          const fake = decoys[Math.floor(Math.random() * decoys.length)] ?? ORB_LAYOUT[1]
          targets.push({
            orbId: fake.id,
            kind: 'fake',
            spawnAt: monotonicNow(),
            windowMs,
            scale: Math.max(0.72, scale - 0.04),
          })
        }

        commitTargets(targets)

        expireTimeoutRef.current = window.setTimeout(() => {
          const latest = sessionRef.current
          if (!latest) return

          const next = {
            ...latest,
            attemptsResolved: latest.attemptsResolved + 1,
            misses: latest.misses + 1,
            combo: 0,
            score: Math.max(0, latest.score - Math.round(config.wrongPenalty * 0.55)),
            lives: config.key === 'survival' ? Math.max(0, latest.lives - 1) : latest.lives,
            lastOrbId: real.id,
          }

          commitTargets([])
          commitSession(next)
          showImpact(real.id, 'warning')
          playSfx('miss')
          showFlash('MISS', 'Target window closed before contact.', 'warning')

          if (
            (config.rounds && next.attemptsResolved >= config.rounds) ||
            (config.lives && next.lives <= 0)
          ) {
            finishRun(next)
          } else {
            scheduleNextWaveRef.current(getGapMs(next, config))
          }
        }, windowMs)
      }, delayMs)
    },
    [clearWaveTimers, commitSession, commitTargets, finishRun, phase, playSfx, showFlash, showImpact],
  )

  const resolveCorrect = useCallback(
    (target: ActiveTarget) => {
      const current = sessionRef.current
      if (!current) return

      const config = MODE_CONFIGS[current.mode]
      const reactionMs = monotonicNow() - target.spawnAt
      const combo = current.combo + 1
      const comboMeta = getComboMeta(combo)
      const speedRatio = clamp((target.windowMs - reactionMs) / target.windowMs, 0, 1)
      const perfect = reactionMs <= 230
      const gain =
        (config.baseScore + Math.round(config.speedBonus * speedRatio)) *
          comboMeta.multiplier +
        (perfect ? 120 : 0)

      const next = {
        ...current,
        attemptsResolved: current.attemptsResolved + 1,
        hits: current.hits + 1,
        totalClicks: current.totalClicks + 1,
        combo,
        bestCombo: Math.max(current.bestCombo, combo),
        perfectHits: current.perfectHits + (perfect ? 1 : 0),
        score: current.score + Math.round(gain),
        lastOrbId: target.orbId,
        lastReactionMs: reactionMs,
        reactionTimes: [...current.reactionTimes, reactionMs],
      }

      clearWaveTimers()
      commitTargets([])
      commitSession(next)
      showImpact(target.orbId, 'success')
      playSfx('hit')

      if (combo === 3 || combo === 5 || combo === 10) {
        playSfx('combo')
        showFlash(comboMeta.label, perfect ? 'PERFECT REACTION' : 'Clean pressure build.', 'success')
      } else {
        showFlash(perfect ? 'PERFECT' : 'CLEAN', `${Math.round(reactionMs)} ms`, perfect ? 'success' : 'neutral')
      }

      if (config.rounds && next.attemptsResolved >= config.rounds) {
        finishRun(next)
      } else {
        scheduleNextWave(getGapMs(next, config))
      }
    },
    [clearWaveTimers, commitSession, commitTargets, finishRun, playSfx, scheduleNextWave, showFlash, showImpact],
  )

  const resolveWrong = useCallback(
    (orbId: string, hitFake: boolean) => {
      const current = sessionRef.current
      if (!current) return

      const config = MODE_CONFIGS[current.mode]
      const next = {
        ...current,
        attemptsResolved: current.attemptsResolved + 1,
        wrongClicks: current.wrongClicks + 1,
        totalClicks: current.totalClicks + 1,
        combo: 0,
        score: Math.max(0, current.score - config.wrongPenalty),
        lives: config.key === 'survival' ? Math.max(0, current.lives - 1) : current.lives,
        lastOrbId: orbId,
      }

      clearWaveTimers()
      commitTargets([])
      commitSession(next)
      showImpact(orbId, 'warning')
      playSfx('miss')
      showFlash(
        hitFake ? 'DECOY HIT' : 'MISFIRE',
        hitFake ? 'Wrong target. The decoy was never live.' : 'Inactive orb pressed.',
        'warning',
      )

      if (
        (config.rounds && next.attemptsResolved >= config.rounds) ||
        (config.lives && next.lives <= 0)
      ) {
        finishRun(next)
      } else {
        scheduleNextWave(getGapMs(next, config))
      }
    },
    [clearWaveTimers, commitSession, commitTargets, finishRun, playSfx, scheduleNextWave, showFlash, showImpact],
  )

  const handleOrbClick = useCallback(
    (orbId: string) => {
      if (phase !== 'live') return

      const target = targetsRef.current.find((item) => item.orbId === orbId)
      if (!target) {
        if (targetsRef.current.length > 0) resolveWrong(orbId, false)
        return
      }

      if (target.kind === 'fake') {
        resolveWrong(orbId, true)
        return
      }

      resolveCorrect(target)
    },
    [phase, resolveCorrect, resolveWrong],
  )

  const startRun = useCallback(
    (mode: ModeKey) => {
      clearWaveTimers()
      clearTransientTimers()
      finishGuardRef.current = false
      setResult(null)
      setFlashMessage(null)
      setImpact(null)
      setShareCopied(false)
      setSelectedMode(mode)
      commitTargets([])
      commitSession(createSession(mode))
      setPhase('countdown')
      setCountdownIndex(0)
    },
    [clearTransientTimers, clearWaveTimers, commitSession, commitTargets],
  )

  const resetArena = useCallback(() => {
    clearWaveTimers()
    clearTransientTimers()
    finishGuardRef.current = false
    setCountdownIndex(null)
    setFlashMessage(null)
    setImpact(null)
    setShareCopied(false)
    commitTargets([])
    commitSession(null)
    setPhase('hangar')
  }, [clearTransientTimers, clearWaveTimers, commitSession, commitTargets])

  const copyShare = useCallback(async () => {
    if (!result || !navigator.clipboard) return

    const lines = [
      '[F1 Reaction Arena]',
      `${result.rank.key} ${result.rank.title}`,
      `Mode: ${MODE_CONFIGS[result.mode].label}`,
      `Score: ${formatScore(result.score)}`,
      `Average: ${formatMs(result.averageMs)}`,
      `Accuracy: ${formatPercent(result.accuracy)}`,
      `Closest Driver: ${result.matchedDriver.name} / ${result.matchedDriver.team}`,
    ]

    await navigator.clipboard.writeText(lines.join('\n'))
    setShareCopied(true)
    if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current)
    copyTimeoutRef.current = window.setTimeout(() => setShareCopied(false), 1500)
  }, [result])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    targetsRef.current = activeTargets
  }, [activeTargets])

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    scheduleNextWaveRef.current = scheduleNextWave
  }, [scheduleNextWave])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  useEffect(() => {
    if (phase !== 'countdown' || countdownIndex === null) return

    const label = COUNTDOWN_STEPS[countdownIndex]
    if (label === 'GO') playSfx('go')
    else playSfx('countdown')

    countdownTimeoutRef.current = window.setTimeout(() => {
      if (countdownIndex < COUNTDOWN_STEPS.length - 1) {
        setCountdownIndex((current) => (current === null ? null : current + 1))
        return
      }

      const current = sessionRef.current
      if (!current) return

      const startAt = monotonicNow()
      const config = MODE_CONFIGS[current.mode]
      commitSession({
        ...current,
        clockStartedAt: startAt,
        endsAt: config.durationMs ? startAt + config.durationMs : null,
        timeRemainingMs: config.durationMs ?? 0,
      })
      setCountdownIndex(null)
      setPhase('live')
      scheduleNextWave(220)
    }, label === 'GO' ? 420 : 780)

    return () => {
      if (countdownTimeoutRef.current !== null) {
        window.clearTimeout(countdownTimeoutRef.current)
      }
    }
  }, [countdownIndex, commitSession, phase, playSfx, scheduleNextWave])

  useEffect(() => {
    if (phase !== 'live') return

    const interval = window.setInterval(() => {
      const current = sessionRef.current
      if (!current || current.clockStartedAt === null) return

      const config = MODE_CONFIGS[current.mode]
      if (config.durationMs && current.endsAt !== null) {
        const remaining = Math.max(0, current.endsAt - monotonicNow())
        const next = {
          ...current,
          timeRemainingMs: remaining,
          elapsedMs: monotonicNow() - current.clockStartedAt,
        }

        commitSession(next)
        if (remaining <= 0) finishRun(next)
      } else {
        commitSession({
          ...current,
          elapsedMs: monotonicNow() - current.clockStartedAt,
        })
      }
    }, 90)

    return () => window.clearInterval(interval)
  }, [commitSession, finishRun, phase])

  useEffect(
    () => () => {
      clearWaveTimers()
      clearTransientTimers()
      if (audioContextRef.current) void audioContextRef.current.close()
    },
    [clearTransientTimers, clearWaveTimers],
  )

  const shellProps: ShellProps = {
    phase,
    selectedMode,
    activeMode,
    liveMode,
    session,
    result,
    progress,
    bestForMode,
    todayBest,
    weeklyBest,
    dailyMissions,
    leaderboard,
    activeTargets,
    impact,
    flashMessage,
    countdownIndex,
    shareCopied,
    recentAchievementLabels,
    onSelectMode: setSelectedMode,
    onOrbClick: handleOrbClick,
    onStart: startRun,
    onReset: resetArena,
    onCopyShare: copyShare,
  }

  return (
    <main className="f1-arena-app">
      <DesktopShell {...shellProps} />
      <MobileShell {...shellProps} />
    </main>
  )
}

export default App
