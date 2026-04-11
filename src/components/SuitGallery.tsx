import { useEffect, useRef, useState } from 'react'
import '@google/model-viewer'
import ironmanHologram from '../assets/ironman_hologram.png'
import ironManModel from '../assets/iron_man.glb?url'
import { IRON_MAN_SUITS, type IronManSuit } from '../data/suits'

// ─── SVG Suit Shapes ────────────────────────────────────────────────────────

function ClassicSuitPaths() {
  return (
    <>
      {/* Helmet */}
      <path d="M50,4 C30,4 24,18 24,28 L24,42 L76,42 L76,28 C76,18 70,4 50,4 Z" />
      {/* Visor left */}
      <path d="M28,22 L45,22 L45,32 L28,32 Z" rx="2" opacity="0.9" />
      {/* Visor right */}
      <path d="M55,22 L72,22 L72,32 L55,32 Z" rx="2" opacity="0.9" />
      {/* Mouth grille */}
      <rect x="34" y="34" width="32" height="5" rx="2" opacity="0.6" />
      {/* Neck */}
      <rect x="40" y="41" width="20" height="11" rx="2" />
      {/* Chest plate */}
      <path d="M18,50 L82,50 L86,114 L14,114 Z" />
      {/* Arc reactor outer */}
      <circle cx="50" cy="74" r="10" opacity="0.4" />
      {/* Arc reactor inner */}
      <circle cx="50" cy="74" r="6" opacity="0.8" />
      {/* Arc reactor core */}
      <circle cx="50" cy="74" r="2.5" opacity="1" />
      {/* Chest details */}
      <path d="M24,58 L40,58 L38,66 L24,63 Z" opacity="0.5" />
      <path d="M76,58 L60,58 L62,66 L76,63 Z" opacity="0.5" />
      {/* Shoulder left */}
      <path d="M0,44 C8,40 16,42 18,50 L18,76 L2,70 Z" />
      {/* Shoulder right */}
      <path d="M100,44 C92,40 84,42 82,50 L82,76 L98,70 Z" />
      {/* Upper arm left */}
      <rect x="1" y="68" width="18" height="44" rx="6" />
      {/* Upper arm right */}
      <rect x="81" y="68" width="18" height="44" rx="6" />
      {/* Forearm left */}
      <rect x="2" y="110" width="16" height="26" rx="4" />
      {/* Forearm right */}
      <rect x="82" y="110" width="16" height="26" rx="4" />
      {/* Repulsor left */}
      <ellipse cx="10" cy="140" rx="9" ry="8" opacity="0.5" />
      <circle cx="10" cy="140" r="5" opacity="0.9" />
      {/* Repulsor right */}
      <ellipse cx="90" cy="140" rx="9" ry="8" opacity="0.5" />
      <circle cx="90" cy="140" r="5" opacity="0.9" />
      {/* Waist */}
      <rect x="24" y="112" width="52" height="16" rx="4" />
      {/* Thigh left */}
      <rect x="22" y="126" width="22" height="38" rx="5" />
      {/* Thigh right */}
      <rect x="56" y="126" width="22" height="38" rx="5" />
      {/* Knee left */}
      <rect x="20" y="160" width="26" height="8" rx="3" opacity="0.8" />
      {/* Knee right */}
      <rect x="54" y="160" width="26" height="8" rx="3" opacity="0.8" />
      {/* Shin left */}
      <rect x="21" y="166" width="22" height="22" rx="4" />
      {/* Shin right */}
      <rect x="57" y="166" width="22" height="22" rx="4" />
      {/* Boot left */}
      <path d="M16,186 L46,186 L48,196 L14,196 Z" />
      {/* Boot right */}
      <path d="M54,186 L84,186 L86,196 L52,196 Z" />
    </>
  )
}

function WarMachinePaths() {
  return (
    <>
      {/* Helmet - squarer, more military */}
      <path d="M50,4 C28,4 22,16 22,26 L22,44 L78,44 L78,26 C78,16 72,4 50,4 Z" />
      {/* Visor left - narrower slit */}
      <path d="M26,20 L44,20 L44,28 L26,28 Z" opacity="0.9" />
      {/* Visor right */}
      <path d="M56,20 L74,20 L74,28 L56,28 Z" opacity="0.9" />
      {/* Mouth grille - multiple lines */}
      <rect x="30" y="34" width="40" height="4" rx="1" opacity="0.7" />
      <rect x="33" y="39" width="34" height="3" rx="1" opacity="0.4" />
      {/* Neck - wider */}
      <rect x="36" y="43" width="28" height="10" rx="2" />
      {/* Bulky chest */}
      <path d="M14,52 L86,52 L90,118 L10,118 Z" />
      {/* Arc reactor */}
      <circle cx="50" cy="78" r="11" opacity="0.4" />
      <circle cx="50" cy="78" r="7" opacity="0.8" />
      <circle cx="50" cy="78" r="3" />
      {/* Huge shoulders */}
      <path d="M0,42 C10,36 18,38 14,52 L14,82 L0,76 Z" />
      <path d="M100,42 C90,36 82,38 86,52 L86,82 L100,76 Z" />
      {/* Gun barrel on right shoulder */}
      <rect x="88" y="32" width="12" height="34" rx="3" opacity="0.8" />
      <rect x="90" y="30" width="8" height="6" rx="2" />
      {/* Upper arms - bulkier */}
      <rect x="0" y="74" width="16" height="44" rx="5" />
      <rect x="84" y="74" width="16" height="44" rx="5" />
      {/* Forearms */}
      <rect x="1" y="116" width="14" height="26" rx="3" />
      <rect x="85" y="116" width="14" height="26" rx="3" />
      {/* Gauntlets */}
      <ellipse cx="8" cy="146" rx="8" ry="7" opacity="0.5" />
      <circle cx="8" cy="146" r="4" opacity="0.9" />
      <ellipse cx="92" cy="146" rx="8" ry="7" opacity="0.5" />
      <circle cx="92" cy="146" r="4" opacity="0.9" />
      {/* Waist - wider */}
      <rect x="20" y="116" width="60" height="18" rx="4" />
      {/* Thighs */}
      <rect x="20" y="132" width="24" height="36" rx="5" />
      <rect x="56" y="132" width="24" height="36" rx="5" />
      {/* Knees */}
      <rect x="18" y="164" width="28" height="8" rx="3" opacity="0.8" />
      <rect x="54" y="164" width="28" height="8" rx="3" opacity="0.8" />
      {/* Shins */}
      <rect x="19" y="170" width="24" height="20" rx="4" />
      <rect x="57" y="170" width="24" height="20" rx="4" />
      {/* Boots */}
      <path d="M14,188 L46,188 L48,196 L12,196 Z" />
      <path d="M54,188 L86,188 L88,196 L52,196 Z" />
    </>
  )
}

function StealthSuitPaths() {
  return (
    <>
      {/* Helmet - sleeker, taller */}
      <path d="M50,2 C32,2 26,16 26,26 L26,40 L74,40 L74,26 C74,16 68,2 50,2 Z" />
      {/* Visor - single wide visor */}
      <path d="M30,18 L70,18 L68,30 L32,30 Z" opacity="0.9" />
      {/* Neck */}
      <rect x="40" y="39" width="20" height="10" rx="2" />
      {/* Slim torso */}
      <path d="M22,48 L78,48 L80,112 L20,112 Z" />
      {/* Arc reactor */}
      <circle cx="50" cy="70" r="8" opacity="0.4" />
      <circle cx="50" cy="70" r="5" opacity="0.8" />
      <circle cx="50" cy="70" r="2" />
      {/* Slim shoulders */}
      <path d="M2,46 C10,42 18,44 22,48 L22,68 L6,64 Z" />
      <path d="M98,46 C90,42 82,44 78,48 L78,68 L94,64 Z" />
      {/* Upper arms */}
      <rect x="3" y="62" width="16" height="44" rx="5" />
      <rect x="81" y="62" width="16" height="44" rx="5" />
      {/* Forearms - sleeker */}
      <rect x="4" y="104" width="14" height="28" rx="4" />
      <rect x="82" y="104" width="14" height="28" rx="4" />
      {/* Hands */}
      <ellipse cx="11" cy="136" rx="8" ry="7" opacity="0.5" />
      <circle cx="11" cy="136" r="4" opacity="0.9" />
      <ellipse cx="89" cy="136" rx="8" ry="7" opacity="0.5" />
      <circle cx="89" cy="136" r="4" opacity="0.9" />
      {/* Waist */}
      <rect x="26" y="110" width="48" height="14" rx="4" />
      {/* Thighs */}
      <rect x="24" y="122" width="20" height="40" rx="5" />
      <rect x="56" y="122" width="20" height="40" rx="5" />
      {/* Shins */}
      <rect x="22" y="160" width="22" height="28" rx="4" />
      <rect x="56" y="160" width="22" height="28" rx="4" />
      {/* Boots */}
      <path d="M17,186 L47,186 L48,196 L16,196 Z" />
      <path d="M53,186 L83,186 L84,196 L52,196 Z" />
    </>
  )
}

export function SuitSVG({
  suit,
  size = 'pod',
}: {
  suit: IronManSuit
  size?: 'pod' | 'platform'
}) {
  const height = size === 'platform' ? 280 : 140
  const width = size === 'platform' ? 140 : 70

  return (
    <svg
      viewBox="0 0 100 200"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={size === 'platform' ? '0.8' : '1.2'}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="suit-svg"
    >
      {suit.variant === 'warmachine' ? (
        <WarMachinePaths />
      ) : suit.variant === 'stealth' ? (
        <StealthSuitPaths />
      ) : (
        <ClassicSuitPaths />
      )}
    </svg>
  )
}

// ─── Stat Bar ────────────────────────────────────────────────────────────────

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="suit-stat">
      <span className="suit-stat-label">{label}</span>
      <div className="suit-stat-track">
        <div
          className="suit-stat-fill"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="suit-stat-value">{value}</span>
    </div>
  )
}

// ─── Suit Pod ────────────────────────────────────────────────────────────────

interface SuitPodProps {
  suit: IronManSuit
  isSelected: boolean
  isGlitching: boolean
  isEmpty: boolean
  showHint: boolean
  onClick: () => void
}

function SuitPod({ suit, isSelected, isGlitching, isEmpty, showHint, onClick }: SuitPodProps) {
  return (
    <button
      className={[
        'suit-pod',
        isSelected ? 'suit-pod--selected' : '',
        isGlitching ? 'suit-pod--glitching' : '',
        isEmpty ? 'suit-pod--empty' : '',
        showHint ? 'suit-pod--hint' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      aria-label={`Select ${suit.name}`}
      style={{ '--hue': suit.accentHue } as React.CSSProperties}
    >
      <div className="suit-pod-case">
        {!isEmpty && (
          <div className="suit-pod-figure">
            <img
              src={ironmanHologram}
              alt={`${suit.name} hologram`}
              className="suit-pod-hologram"
              loading="lazy"
            />
            <div className="suit-pod-scanline" />
            <div className="suit-pod-glow" />
          </div>
        )}
        {isEmpty && (
          <div className="suit-pod-empty-state">
            <div className="suit-pod-empty-ring" />
            <span className="suit-pod-empty-label">DEPLOYED</span>
          </div>
        )}
        {showHint && !isEmpty && (
          <div className="suit-pod-hint-indicator">
            <div className="suit-pod-hint-chevron" />
            <span>ACTIVATE</span>
          </div>
        )}
      </div>
      <div className="suit-pod-label">
        <span className="suit-pod-designation">{suit.designation}</span>
        <span className={`suit-pod-status suit-pod-status--${suit.status.toLowerCase()}`}>
          {suit.status}
        </span>
      </div>
    </button>
  )
}

// ─── Platform Display ─────────────────────────────────────────────────────────

interface PlatformDisplayProps {
  selectedSuit: IronManSuit | null
  phase: 'idle' | 'materializing' | 'active'
}

function PlatformDisplay({ selectedSuit, phase }: PlatformDisplayProps) {
  return (
    <div className={`platform-display platform-display--${phase}`}>
      <div className="platform-model-area">
        <div
          className={`platform-hologram platform-hologram--${phase}`}
          style={{ '--hue': selectedSuit?.accentHue ?? '190deg' } as React.CSSProperties}
        >
          <div className="platform-hologram-scanlines" />
          <div className="platform-hologram-glow" />
          <model-viewer
            src={ironManModel}
            camera-controls={false}
            disable-zoom
            disable-pan
            auto-rotate
            rotation-per-second="18deg"
            shadow-intensity="0"
            exposure="1.08"
            interaction-prompt="none"
            class="platform-model-viewer"
          />
        </div>
      </div>

      <div className="platform-base">
        <div className="platform-base-ring platform-base-ring--outer" />
        <div className="platform-base-ring platform-base-ring--mid" />
        <div className="platform-base-ring platform-base-ring--inner" />
        <div className="platform-base-light" />
        <div className="platform-base-label">
          {selectedSuit ? selectedSuit.designation : 'IRON MAN'}
        </div>
      </div>
    </div>
  )
}

// ─── Info Panel ───────────────────────────────────────────────────────────────

function SuitInfoPanel({ suit }: { suit: IronManSuit }) {
  return (
    <div className="suit-info-panel">
      <div className="suit-info-header">
        <span className="suit-info-designation">{suit.designation}</span>
        <span className={`suit-info-status suit-info-status--${suit.status.toLowerCase()}`}>
          ● {suit.status}
        </span>
      </div>

      <h3 className="suit-info-name">{suit.name}</h3>
      <p className="suit-info-year">DEPLOYED {suit.year}</p>
      <p className="suit-info-desc">{suit.description}</p>

      <div className="suit-info-stats">
        <StatBar label="POWER" value={suit.stats.power} />
        <StatBar label="SPEED" value={suit.stats.speed} />
        <StatBar label="ARMOR" value={suit.stats.armor} />
        <StatBar label="STEALTH" value={suit.stats.stealth} />
      </div>

      <div className="suit-info-caps">
        <span className="suit-info-caps-label">CAPABILITIES</span>
        <ul className="suit-info-caps-list">
          {suit.capabilities.map((cap) => (
            <li key={cap}>{cap}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ─── Main Gallery ─────────────────────────────────────────────────────────────

export function SuitGallery() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [glitchingId, setGlitchingId] = useState<string | null>(null)
  const [platformPhase, setPlatformPhase] = useState<'idle' | 'materializing' | 'active'>('idle')
  const [showHintIndex, setShowHintIndex] = useState<number | null>(null)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintCycleRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const leftSuits = IRON_MAN_SUITS.slice(0, 3)
  const rightSuits = IRON_MAN_SUITS.slice(3, 6)
  const selectedSuit = IRON_MAN_SUITS.find((s) => s.id === selectedId) ?? null

  // Hint cycle: if nothing selected in 3s, pulse suits one by one
  useEffect(() => {
    if (selectedId) {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
      if (hintCycleRef.current) clearInterval(hintCycleRef.current)
      return
    }

    hintTimerRef.current = setTimeout(() => {
      let idx = 0
      setShowHintIndex(idx)
      hintCycleRef.current = setInterval(() => {
        idx = (idx + 1) % IRON_MAN_SUITS.length
        setShowHintIndex(idx)
      }, 1800)
    }, 3000)

    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
      if (hintCycleRef.current) clearInterval(hintCycleRef.current)
    }
  }, [selectedId])

  function handleSelectSuit(suit: IronManSuit) {
    if (glitchingId) return

    // If already selected, deselect
    if (selectedId === suit.id) {
      setSelectedId(null)
      setPlatformPhase('idle')
      setShowHintIndex(null)
      return
    }

    // Start glitch-out on previous suit's pod (if any)
    // then glitch-out on new suit's pod

    setGlitchingId(suit.id)
    setPlatformPhase('idle')
    setShowHintIndex(null)

    // After glitch-out, trigger materialization
    setTimeout(() => {
      setSelectedId(suit.id)
      setGlitchingId(null)
      setPlatformPhase('materializing')

      setTimeout(() => {
        setPlatformPhase('active')
      }, 900)
    }, 600)
  }

  return (
    <div className="hall-of-armor">
      {/* Left wing */}
      <div className="armor-wing armor-wing--left">
        {leftSuits.map((suit, i) => (
          <SuitPod
            key={suit.id}
            suit={suit}
            isSelected={selectedId === suit.id}
            isGlitching={glitchingId === suit.id}
            isEmpty={selectedId === suit.id && platformPhase !== 'idle'}
            showHint={showHintIndex === i}
            onClick={() => handleSelectSuit(suit)}
          />
        ))}
      </div>

      {/* Center platform + info */}
      <div className="armor-center">
        <PlatformDisplay selectedSuit={selectedSuit} phase={platformPhase} />
        {selectedSuit && platformPhase === 'active' && (
          <SuitInfoPanel suit={selectedSuit} />
        )}
      </div>

      {/* Right wing */}
      <div className="armor-wing armor-wing--right">
        {rightSuits.map((suit, i) => (
          <SuitPod
            key={suit.id}
            suit={suit}
            isSelected={selectedId === suit.id}
            isGlitching={glitchingId === suit.id}
            isEmpty={selectedId === suit.id && platformPhase !== 'idle'}
            showHint={showHintIndex === i + 3}
            onClick={() => handleSelectSuit(suit)}
          />
        ))}
      </div>
    </div>
  )
}
