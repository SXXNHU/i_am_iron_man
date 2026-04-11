import { useEffect, useRef, useState, type CSSProperties } from 'react'
import '@google/model-viewer'
import ironmanHologram from '../assets/ironman_hologram.png'
import ironManModel from '../assets/iron_man.glb?url'
import { IRON_MAN_SUITS, type IronManSuit } from '../data/suits'

function SuitSpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="suit-spec-row">
      <span className="suit-spec-label">{label}</span>
      <span className="suit-spec-value">{value}</span>
    </div>
  )
}

interface SuitPodProps {
  suit: IronManSuit
  isSelected: boolean
  isGlitching: boolean
  isEmpty: boolean
  showHint: boolean
  onClick: () => void
}

function SuitPod({
  suit,
  isSelected,
  isGlitching,
  isEmpty,
  showHint,
  onClick,
}: SuitPodProps) {
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
      style={{ '--hue': suit.accentHue } as CSSProperties}
    >
      <div className="suit-pod-case">
        {!isEmpty ? (
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
        ) : (
          <div className="suit-pod-empty-state">
            <div className="suit-pod-empty-ring" />
            <span className="suit-pod-empty-label">DEPLOYED</span>
          </div>
        )}
        {showHint && !isEmpty ? (
          <div className="suit-pod-hint-indicator">
            <div className="suit-pod-hint-chevron" />
            <span>ACTIVATE</span>
          </div>
        ) : null}
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

function PlatformDisplay({
  selectedSuit,
  phase,
}: {
  selectedSuit: IronManSuit | null
  phase: 'idle' | 'materializing' | 'active'
}) {
  return (
    <div className={`platform-display platform-display--${phase}`}>
      <div className="platform-model-area">
        <div
          className={`platform-hologram platform-hologram--${phase}`}
          style={{ '--hue': selectedSuit?.accentHue ?? '190deg' } as CSSProperties}
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

function SuitInfoPanel({ suit }: { suit: IronManSuit }) {
  return (
    <div className="suit-info-panel">
      <div className="suit-info-header">
        <span className="suit-info-designation">{suit.designation}</span>
        <span className={`suit-info-status suit-info-status--${suit.status.toLowerCase()}`}>
          {suit.status}
        </span>
      </div>

      <h3 className="suit-info-name">{suit.name}</h3>
      <p className="suit-info-year">DEPLOYED {suit.year}</p>
      <p className="suit-info-desc">{suit.description}</p>

      <div className="suit-info-specs">
        {suit.specSheet.map((spec) => (
          <SuitSpecRow key={spec.label} label={spec.label} value={spec.value} />
        ))}
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

export function SuitGallery() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [glitchingId, setGlitchingId] = useState<string | null>(null)
  const [platformPhase, setPlatformPhase] = useState<'idle' | 'materializing' | 'active'>('idle')
  const [showHintIndex, setShowHintIndex] = useState<number | null>(null)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintCycleRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const leftSuits = IRON_MAN_SUITS.slice(0, 3)
  const rightSuits = IRON_MAN_SUITS.slice(3, 6)
  const selectedSuit = IRON_MAN_SUITS.find((suit) => suit.id === selectedId) ?? null

  useEffect(() => {
    if (selectedId) {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
      if (hintCycleRef.current) clearInterval(hintCycleRef.current)
      return
    }

    hintTimerRef.current = setTimeout(() => {
      let index = 0
      setShowHintIndex(index)
      hintCycleRef.current = setInterval(() => {
        index = (index + 1) % IRON_MAN_SUITS.length
        setShowHintIndex(index)
      }, 1800)
    }, 3000)

    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
      if (hintCycleRef.current) clearInterval(hintCycleRef.current)
    }
  }, [selectedId])

  function handleSelectSuit(suit: IronManSuit) {
    if (glitchingId) return

    if (selectedId === suit.id) {
      setSelectedId(null)
      setPlatformPhase('idle')
      setShowHintIndex(null)
      return
    }

    setGlitchingId(suit.id)
    setPlatformPhase('idle')
    setShowHintIndex(null)

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
      <div className="armor-wing armor-wing--left">
        {leftSuits.map((suit, index) => (
          <SuitPod
            key={suit.id}
            suit={suit}
            isSelected={selectedId === suit.id}
            isGlitching={glitchingId === suit.id}
            isEmpty={selectedId === suit.id && platformPhase !== 'idle'}
            showHint={showHintIndex === index}
            onClick={() => handleSelectSuit(suit)}
          />
        ))}
      </div>

      <div className="armor-center">
        <PlatformDisplay selectedSuit={selectedSuit} phase={platformPhase} />
        {selectedSuit && platformPhase === 'active' ? (
          <SuitInfoPanel suit={selectedSuit} />
        ) : null}
      </div>

      <div className="armor-wing armor-wing--right">
        {rightSuits.map((suit, index) => (
          <SuitPod
            key={suit.id}
            suit={suit}
            isSelected={selectedId === suit.id}
            isGlitching={glitchingId === suit.id}
            isEmpty={selectedId === suit.id && platformPhase !== 'idle'}
            showHint={showHintIndex === index + 3}
            onClick={() => handleSelectSuit(suit)}
          />
        ))}
      </div>
    </div>
  )
}
