import { useEffect, useRef, useState, type CSSProperties } from 'react'
import '@google/model-viewer'
import hulkbusterModel from '../assets/hulkbuster.glb?url'
import hulkbusterHologram from '../assets/hulkbuster_hologram.png'
import ironManModel from '../assets/iron_man.glb?url'
import markOneModel from '../assets/iron_man_-_mark_1.glb?url'
import markEightyFiveModel from '../assets/iron_man_mark_85.glb?url'
import ironmanHologram from '../assets/ironman_hologram.png'
import markOneHologram from '../assets/mk-1_hologram.png'
import { IRON_MAN_SUITS, type IronManSuit } from '../data/suits'
import type { TranscriptEntry } from '../hooks/useRealtimeVoice'
import type { AppState } from '../App'

type ShowcaseAsset = {
  suit: IronManSuit
  modelSrc: string
  hologramSrc: string
  hologramTone: string
  modelOrientation?: string
  cameraOrbit?: string
}

const SHOWCASE_SUITS: ShowcaseAsset[] = [
  {
    suit: IRON_MAN_SUITS[0],
    modelSrc: markOneModel,
    hologramSrc: markOneHologram,
    hologramTone:
      'saturate(0.1) brightness(0.58) contrast(1.1) grayscale(0.75) sepia(0.2)',
    cameraOrbit: '0deg 78deg auto',
  },
  {
    suit: IRON_MAN_SUITS[1],
    modelSrc: ironManModel,
    hologramSrc: ironmanHologram,
    hologramTone:
      'saturate(0.18) brightness(1.15) contrast(1.05) grayscale(0.55)',
    cameraOrbit: '0deg 78deg auto',
  },
  {
    suit: IRON_MAN_SUITS[2],
    modelSrc: markEightyFiveModel,
    hologramSrc: ironmanHologram,
    hologramTone:
      'saturate(0.12) brightness(1.05) contrast(1.08) grayscale(0.35) hue-rotate(18deg)',
    modelOrientation: '0deg 180deg 0deg',
    cameraOrbit: '0deg 76deg auto',
  },
  {
    suit: IRON_MAN_SUITS[3],
    modelSrc: hulkbusterModel,
    hologramSrc: hulkbusterHologram,
    hologramTone:
      'saturate(0.22) brightness(0.82) contrast(1.15) grayscale(0.48)',
    modelOrientation: '0deg 180deg 0deg',
    cameraOrbit: '0deg 82deg auto',
  },
]

const MATERIALIZATION_LASERS = [
  { id: 'crown-left',   angle: '-126deg', length: '238px', delay: '0s',    hue: '0deg' },
  { id: 'spine-left',   angle: '-108deg', length: '258px', delay: '0.08s', hue: '-8deg' },
  { id: 'core',         angle:  '-92deg', length: '288px', delay: '0.16s', hue: '4deg' },
  { id: 'spine-right',  angle:  '-76deg', length: '246px', delay: '0.24s', hue: '10deg' },
  { id: 'crown-right',  angle:  '-58deg', length: '214px', delay: '0.32s', hue: '18deg' },
  { id: 'flare-left',   angle: '-142deg', length: '190px', delay: '0.14s', hue: '-16deg' },
  { id: 'flare-right',  angle:  '-40deg', length: '184px', delay: '0.4s',  hue: '14deg' },
]

function warmModel(src: string, cache: Map<string, Promise<void>>) {
  const cached = cache.get(src)
  if (cached) return cached
  const request = fetch(src, { cache: 'force-cache' })
    .then((r) => { if (!r.ok) throw new Error(`Failed to preload ${src}`); return r.blob() })
    .then(() => undefined)
    .catch(() => undefined)
  cache.set(src, request)
  return request
}

// ── Roster Pod (left panel item) ────────────────────────────────
function RosterPod({
  asset,
  isSelected,
  isGlitching,
  showHint,
  onClick,
}: {
  asset: ShowcaseAsset
  isSelected: boolean
  isGlitching: boolean
  showHint: boolean
  onClick: () => void
}) {
  const statusClass = asset.suit.status.toLowerCase()
  return (
    <button
      className={[
        'roster-pod',
        isSelected ? 'selected' : '',
        isGlitching ? 'glitching' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-label={`Select ${asset.suit.name}`}
      style={{
        '--hologram-filter': `${asset.hologramTone} drop-shadow(0 0 6px rgba(0,212,255,0.65)) drop-shadow(0 0 14px rgba(0,212,255,0.22))`,
      } as CSSProperties}
    >
      <div className="roster-pod-thumb">
        <img src={asset.hologramSrc} alt={`${asset.suit.name} hologram`} loading="lazy" />
      </div>
      <div className="roster-pod-info">
        <span className="roster-pod-designation">{asset.suit.designation}</span>
        <span className="roster-pod-name">{asset.suit.name}</span>
        <span className="roster-pod-year">{asset.suit.year}</span>
      </div>
      <span className={`roster-pod-status ${statusClass}`}>{asset.suit.status}</span>
      {showHint && (
        <div className="roster-pod-hint" aria-hidden="true">
          <div className="roster-pod-hint-chevron" />
        </div>
      )}
    </button>
  )
}

// ── Armor Stage (center 3D display) ─────────────────────────────
function ArmorStage({
  asset,
  phase,
  isLoading,
  onModelReady,
}: {
  asset: ShowcaseAsset | null
  phase: 'idle' | 'materializing' | 'active'
  isLoading: boolean
  onModelReady: () => void
}) {
  const viewerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !asset) return
    const onLoad  = () => onModelReady()
    const onError = () => onModelReady()
    viewer.addEventListener('load', onLoad)
    viewer.addEventListener('error', onError)
    return () => {
      viewer.removeEventListener('load', onLoad)
      viewer.removeEventListener('error', onError)
    }
  }, [asset, onModelReady])

  return (
    <div className={`platform-display platform-display--${phase}`}>
      <div className="platform-model-area">
        <div className={[
          'platform-hologram',
          `platform-hologram--${phase}`,
          isLoading ? 'platform-hologram--loading' : '',
        ].filter(Boolean).join(' ')}>
          <div className="platform-hologram-scanlines" />
          <div className="platform-hologram-glow" />
          <div className="platform-pedestal" aria-hidden="true">
            <div className="platform-pedestal-shadow" />
            <div className="platform-pedestal-rim" />
            <div className="platform-pedestal-top" />
            <div className="platform-pedestal-wall" />
            <div className="platform-pedestal-core" />
          </div>

          {asset ? (
            <>
              <model-viewer
                key={asset.suit.id}
                ref={viewerRef}
                src={asset.modelSrc}
                orientation={asset.modelOrientation}
                camera-orbit={asset.cameraOrbit}
                camera-controls={false}
                disable-zoom
                disable-pan
                auto-rotate
                rotation-per-second="10deg"
                shadow-intensity="0"
                exposure="1.1"
                interaction-prompt="none"
                class="platform-model-viewer"
              />
              {isLoading && (
                <div className="platform-loading-rig" aria-hidden="true">
                  <div className="platform-loading-emitter" />
                  <div className="platform-loading-orbit" />
                  <div className="platform-loading-scan-cone" />
                  {MATERIALIZATION_LASERS.map((laser) => (
                    <div
                      key={laser.id}
                      className="platform-loading-laser"
                      style={{
                        '--laser-angle':  laser.angle,
                        '--laser-length': laser.length,
                        '--laser-delay':  laser.delay,
                        '--laser-hue':    laser.hue,
                      } as CSSProperties}
                    />
                  ))}
                  <div className="platform-loading-copy">
                    <span>ARMOR SYNC</span>
                    <strong>Materializing {asset.suit.designation}</strong>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="platform-idle-hint">
              <div className="platform-idle-ring platform-idle-ring--outer" />
              <div className="platform-idle-ring platform-idle-ring--mid" />
              <div className="platform-idle-ring platform-idle-ring--inner" />
              <div className="platform-idle-text">
                <span className="platform-idle-label">SELECT A SUIT</span>
                <span className="platform-idle-sub">MK-I · MK-III · MK-LXXXV · MK-XLIV</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="platform-base">
        <div className="platform-base-ring platform-base-ring--outer" />
        <div className="platform-base-ring platform-base-ring--mid" />
        <div className="platform-base-ring platform-base-ring--inner" />
        <div className="platform-base-light" />
        <div className="platform-base-label">
          {asset ? asset.suit.designation : 'IRON MAN ARMORY'}
        </div>
      </div>
    </div>
  )
}

// ── Analysis Panel (right) ───────────────────────────────────────
export type AnalysisTab = 'armor' | 'status' | 'log'

function AnalysisPanel({
  suit,
  statusItems,
  transcriptEntries,
  lastError,
  showDebugEntries = false,
  requestedTab,
  onTabChange,
}: {
  suit: IronManSuit | null
  statusItems: Array<{ label: string; value: string }>
  transcriptEntries: TranscriptEntry[]
  lastError: string
  showDebugEntries?: boolean
  requestedTab?: AnalysisTab
  onTabChange?: (tab: AnalysisTab) => void
}) {
  const [internalTab, setInternalTab] = useState<AnalysisTab>('armor')
  const activeTab = requestedTab ?? internalTab
  const visibleTranscriptEntries = showDebugEntries
    ? transcriptEntries
    : transcriptEntries.filter((entry) => !entry.debug)

  const frameProfile =
    suit?.variant === 'hulkbuster'
      ? 'Siege Countermeasure Frame'
      : suit?.variant === 'stealth'
        ? 'Stealth Infiltration Frame'
        : 'Aerial Combat Frame'

  const statusClass = suit?.status.toLowerCase() ?? ''

  // Colorize specific status tile values
  function tileValueClass(label: string, value: string): string {
    const v = value.toLowerCase()
    if (v === 'complete' || v === 'active' || v === 'granted' || v === 'connected') return 'green'
    if (v === 'error' || v === 'denied') return 'red'
    if (v === 'pending' || v === 'standby' || v === 'checking-window-management' || v === 'connecting') return 'gold'
    if (label === 'State' && v !== 'idle') return 'cyan'
    return ''
  }

  return (
    <div className="armor-analysis">
      {/* Tabs */}
      <div className="analysis-tabs" role="tablist">
        {(['armor', 'status', 'log'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`analysis-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => {
              setInternalTab(tab)
              onTabChange?.(tab)
            }}
          >
            <span className="analysis-tab-dot" />
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── ARMOR TAB ── */}
      {activeTab === 'armor' && (
        <div className="analysis-content" role="tabpanel">
          {suit ? (
            <div className="analysis-panel-scroll">
              {/* Header */}
              <div className="analysis-suit-header">
                <div className="analysis-suit-head-left">
                  <span className="analysis-suit-designation">{suit.designation}</span>
                  <span className="analysis-suit-name">{suit.name}</span>
                  <span className="analysis-suit-meta">{frameProfile} · DEPLOYED {suit.year}</span>
                </div>
                <span className={`analysis-suit-status-badge ${statusClass}`}>
                  {suit.status}
                </span>
              </div>

              {/* Mission Profile */}
              <div className="analysis-section">
                <div className="analysis-section-title">MISSION PROFILE</div>
                <p className="analysis-description">{suit.description}</p>
              </div>

              {/* Technical Specs */}
              <div className="analysis-section">
                <div className="analysis-section-title">TECHNICAL SPECS</div>
                {suit.specSheet.map((spec) => (
                  <div key={spec.label} className="analysis-spec-item">
                    <span className="analysis-spec-label">{spec.label}</span>
                    <span className="analysis-spec-value">{spec.value}</span>
                  </div>
                ))}
              </div>

              {/* Active Systems */}
              <div className="analysis-section">
                <div className="analysis-section-title">ACTIVE SYSTEMS</div>
                <ul className="analysis-cap-list">
                  {suit.capabilities.map((cap) => (
                    <li key={cap} className="analysis-cap-item">
                      <span className="analysis-cap-pip" aria-hidden="true" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer chips */}
              <div className="analysis-card-footer">
                <span className="analysis-footer-chip">{suit.variant.toUpperCase()} FRAME</span>
                <span className="analysis-footer-chip">{suit.capabilities.length} SYSTEMS</span>
                <span className="analysis-footer-chip">{suit.specSheet.length} SPEC NODES</span>
              </div>
            </div>
          ) : (
            <div className="analysis-empty">
              <div className="analysis-empty-reactor" aria-hidden="true" />
              <p className="analysis-empty-text">
                SELECT AN ARMOR UNIT<br />FROM THE ROSTER TO<br />LOAD ANALYSIS DATA
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── STATUS TAB ── */}
      {activeTab === 'status' && (
        <div className="analysis-content" role="tabpanel">
          <div className="status-tab-content">
            <div className="status-tab-header">
              SYSTEM STATUS
              <span className="status-live-dot">
                <span className="status-live-pip" />
                LIVE
              </span>
            </div>
            <div className="status-grid">
              {statusItems.map((item) => {
                const cls = tileValueClass(item.label, item.value)
                return (
                  <div key={item.label} className="status-tile">
                    <span className="status-tile-label">{item.label}</span>
                    <span className={`status-tile-value${cls ? ` ${cls}` : ''}`}>{item.value}</span>
                  </div>
                )
              })}
            </div>
            {lastError && (
              <div className="status-error-block">
                <span className="status-error-label">CRITICAL ERROR LOG</span>
                <span className="status-error-text">{lastError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LOG TAB ── */}
      {activeTab === 'log' && (
        <div className="analysis-content" role="tabpanel">
          <div className="log-tab-content">
            {visibleTranscriptEntries.length === 0 ? (
              <p className="log-empty">
                REALTIME SESSION EVENTS<br />AND TRANSCRIPT ENTRIES<br />WILL APPEAR HERE
              </p>
            ) : (
              visibleTranscriptEntries.map((entry) => (
                <article key={entry.id} className={`log-entry ${entry.role}`}>
                  <div className="log-entry-meta">
                    <span className="log-entry-role">{entry.role}</span>
                    <span className="log-entry-time">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="log-entry-text">{entry.text}</p>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── SuitGallery (main export, 3-column layout) ───────────────────
export function SuitGallery({
  statusItems = [],
  transcriptEntries = [],
  lastError = '',
  appState,
  showDebugEntries = false,
  requestedAnalysisTab,
  onAnalysisTabChange,
}: {
  statusItems?: Array<{ label: string; value: string }>
  transcriptEntries?: TranscriptEntry[]
  lastError?: string
  appState?: AppState
  showDebugEntries?: boolean
  requestedAnalysisTab?: AnalysisTab
  onAnalysisTabChange?: (tab: AnalysisTab) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [glitchingId, setGlitchingId] = useState<string | null>(null)
  const [platformPhase, setPlatformPhase] = useState<'idle' | 'materializing' | 'active'>('idle')
  const [loadingSuitId, setLoadingSuitId] = useState<string | null>(null)
  const [showHintIndex, setShowHintIndex] = useState<number | null>(null)
  const hintTimerRef  = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const hintCycleRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const preloadCacheRef = useRef<Map<string, Promise<void>>>(new Map())

  const selectedAsset = SHOWCASE_SUITS.find((a) => a.suit.id === selectedId) ?? null

  // Preload all models on idle
  useEffect(() => {
    const preloadAll = () => {
      SHOWCASE_SUITS.reduce<Promise<void>>(
        (chain, asset) => chain.then(() => warmModel(asset.modelSrc, preloadCacheRef.current)),
        Promise.resolve(),
      )
    }
    const supportsIdle = typeof window.requestIdleCallback === 'function'
    const handle = supportsIdle
      ? window.requestIdleCallback(preloadAll)
      : window.setTimeout(preloadAll, 600)
    return () => {
      if (!supportsIdle) window.clearTimeout(handle as number)
      else window.cancelIdleCallback(handle as number)
    }
  }, [])

  // Hint cycle when nothing selected
  useEffect(() => {
    if (selectedId) {
      if (hintTimerRef.current)  clearTimeout(hintTimerRef.current)
      if (hintCycleRef.current)  clearInterval(hintCycleRef.current)
      return
    }
    hintTimerRef.current = setTimeout(() => {
      let idx = 0
      setShowHintIndex(idx)
      hintCycleRef.current = setInterval(() => {
        idx = (idx + 1) % SHOWCASE_SUITS.length
        setShowHintIndex(idx)
      }, 2200)
    }, 2200)
    return () => {
      if (hintTimerRef.current)  clearTimeout(hintTimerRef.current)
      if (hintCycleRef.current)  clearInterval(hintCycleRef.current)
    }
  }, [selectedId])

  function handleSelectSuit(asset: ShowcaseAsset) {
    if (glitchingId) return

    if (selectedId === asset.suit.id) {
      setSelectedId(null)
      setPlatformPhase('idle')
      setLoadingSuitId(null)
      return
    }

    setGlitchingId(asset.suit.id)
    setPlatformPhase('idle')

    window.setTimeout(() => {
      setSelectedId(asset.suit.id)
      setGlitchingId(null)
      setLoadingSuitId(asset.suit.id)
      setPlatformPhase('materializing')
      void warmModel(asset.modelSrc, preloadCacheRef.current)
    }, 480)
  }

  function handleModelReady() {
    if (!selectedAsset) return
    setLoadingSuitId((cur) => (cur === selectedAsset.suit.id ? null : cur))
    setPlatformPhase('active')
  }

  // State label shown in the roster footer
  const stateLabel =
    appState === 'armed'              ? 'ARMED — AWAITING CLAP' :
    appState === 'first_clap_detected'? 'FIRST CLAP — ONE MORE' :
    appState === 'conversation_active'? 'CONVERSATION ACTIVE'  :
    appState === 'voice_ready'        ? 'VOICE BRIDGE ONLINE'  :
    appState === 'launching'          ? 'LAUNCHING...'         :
    appState === 'greeting'           ? 'INITIALIZING...'      :
    appState === 'stopped'            ? 'SESSION STOPPED'      :
    appState === 'error'              ? 'SYSTEM ERROR'         :
    appState === 'requesting_permissions' ? 'ACQUIRING PERMS...' :
    'STANDBY'

  return (
    <>
      {/* ── Left: Armor Roster ── */}
      <div className="armor-roster">
        <div className="roster-header">
          <div className="roster-header-row">
            <span className="roster-title">ARMOR ROSTER</span>
            <span className="roster-count-badge">{SHOWCASE_SUITS.length} UNITS</span>
          </div>
          <div className="roster-accent-bar" />
        </div>

        <div className="roster-list">
          {SHOWCASE_SUITS.map((asset, index) => (
            <RosterPod
              key={asset.suit.id}
              asset={asset}
              isSelected={selectedId === asset.suit.id}
              isGlitching={glitchingId === asset.suit.id}
              showHint={!selectedId && showHintIndex === index}
              onClick={() => handleSelectSuit(asset)}
            />
          ))}
        </div>

        <div className="roster-footer">
          <span className="roster-footer-label">J.A.R.V.I.S. STATUS</span>
          <span className="roster-state-chip">{stateLabel}</span>
        </div>
      </div>

      {/* ── Center: Armor Stage ── */}
      <div className="armor-stage">
        <div className="stage-bracket tl" aria-hidden="true" />
        <div className="stage-bracket tr" aria-hidden="true" />
        <div className="stage-bracket bl" aria-hidden="true" />
        <div className="stage-bracket br" aria-hidden="true" />
        <div className="stage-reticle r1" aria-hidden="true" />
        <div className="stage-reticle r2" aria-hidden="true" />
        <div className="stage-reticle r3" aria-hidden="true" />
        <ArmorStage
          asset={selectedAsset}
          phase={platformPhase}
          isLoading={loadingSuitId === selectedAsset?.suit.id}
          onModelReady={handleModelReady}
        />
      </div>

      {/* ── Right: Analysis Panel ── */}
      <AnalysisPanel
        suit={selectedAsset?.suit ?? null}
        statusItems={statusItems}
        transcriptEntries={transcriptEntries}
        lastError={lastError}
        showDebugEntries={showDebugEntries}
        requestedTab={requestedAnalysisTab}
        onTabChange={onAnalysisTabChange}
      />
    </>
  )
}
