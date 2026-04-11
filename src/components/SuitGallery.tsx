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

function warmModel(src: string, cache: Map<string, Promise<void>>) {
  const cached = cache.get(src)
  if (cached) return cached

  const request = fetch(src, { cache: 'force-cache' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to preload ${src}`)
      }

      return response.blob()
    })
    .then(() => undefined)
    .catch(() => undefined)

  cache.set(src, request)
  return request
}

function SuitSpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="suit-spec-row">
      <span className="suit-spec-label">{label}</span>
      <span className="suit-spec-value">{value}</span>
    </div>
  )
}

function SuitPod({
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
  return (
    <button
      className={[
        'suit-pod',
        isSelected ? 'suit-pod--selected' : '',
        isGlitching ? 'suit-pod--glitching' : '',
        showHint ? 'suit-pod--hint' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      aria-label={`Select ${asset.suit.name}`}
      style={
        {
          '--hologram-filter': `${asset.hologramTone} drop-shadow(0 0 8px rgba(89, 245, 255, 0.7)) drop-shadow(0 0 18px rgba(89, 245, 255, 0.28))`,
        } as CSSProperties
      }
    >
      <div className="suit-pod-case">
        <div className="suit-pod-figure">
          <img
            src={asset.hologramSrc}
            alt={`${asset.suit.name} hologram`}
            className="suit-pod-hologram"
            loading="lazy"
          />
          <div className="suit-pod-scanline" />
          <div className="suit-pod-glow" />
        </div>
        {showHint ? (
          <div className="suit-pod-hint-indicator">
            <div className="suit-pod-hint-chevron" />
            <span>ACTIVATE</span>
          </div>
        ) : null}
      </div>
      <div className="suit-pod-label">
        <span className="suit-pod-designation">{asset.suit.designation}</span>
        <span className={`suit-pod-status suit-pod-status--${asset.suit.status.toLowerCase()}`}>
          {asset.suit.status}
        </span>
      </div>
    </button>
  )
}

function PlatformDisplay({
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

    if (!viewer || !asset) {
      return
    }

    const handleLoad = () => {
      onModelReady()
    }

    const handleError = () => {
      onModelReady()
    }

    viewer.addEventListener('load', handleLoad)
    viewer.addEventListener('error', handleError)

    return () => {
      viewer.removeEventListener('load', handleLoad)
      viewer.removeEventListener('error', handleError)
    }
  }, [asset, onModelReady])

  return (
    <div className={`platform-display platform-display--${phase}`}>
      <div className="platform-model-area">
        <div
          className={`platform-hologram platform-hologram--${phase}${
            isLoading ? ' platform-hologram--loading' : ''
          }`}
        >
          <div className="platform-hologram-scanlines" />
          <div className="platform-hologram-glow" />
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
                rotation-per-second="12deg"
                shadow-intensity="0"
                exposure="1.08"
                interaction-prompt="none"
                class="platform-model-viewer"
              />
              {isLoading ? (
                <div className="platform-loading-rig" aria-hidden="true">
                  <div className="platform-loading-beam platform-loading-beam--core" />
                  <div className="platform-loading-beam platform-loading-beam--left" />
                  <div className="platform-loading-beam platform-loading-beam--right" />
                  <div className="platform-loading-orbit" />
                  <div className="platform-loading-copy">
                    <span>ARMOR SYNC</span>
                    <strong>Materializing {asset.suit.designation}</strong>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="platform-idle-hint">
              <div className="platform-idle-ring platform-idle-ring--outer" />
              <div className="platform-idle-ring platform-idle-ring--mid" />
              <div className="platform-idle-ring platform-idle-ring--inner" />
              <div className="platform-idle-text">
                <span className="platform-idle-label">SELECT A SUIT</span>
                <span className="platform-idle-sub">MARK I / MK-III / MK-LXXXV / HULKBUSTER</span>
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
  const [loadingSuitId, setLoadingSuitId] = useState<string | null>(null)
  const [showHintIndex, setShowHintIndex] = useState<number | null>(null)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintCycleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const preloadCacheRef = useRef<Map<string, Promise<void>>>(new Map())

  const leftAssets = SHOWCASE_SUITS.slice(0, 2)
  const rightAssets = SHOWCASE_SUITS.slice(2, 4)
  const selectedAsset = SHOWCASE_SUITS.find((asset) => asset.suit.id === selectedId) ?? null

  useEffect(() => {
    const preloadAll = () => {
      SHOWCASE_SUITS.reduce<Promise<void>>((chain, asset) => {
        return chain.then(() => warmModel(asset.modelSrc, preloadCacheRef.current))
      }, Promise.resolve())
    }

    const supportsIdleCallback = typeof window.requestIdleCallback === 'function'
    const idleHandle: number = supportsIdleCallback
      ? window.requestIdleCallback(() => {
          preloadAll()
        })
      : window.setTimeout(preloadAll, 600)

    return () => {
      if (!supportsIdleCallback) {
        window.clearTimeout(idleHandle)
      } else {
        window.cancelIdleCallback(idleHandle)
      }
    }
  }, [])

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
        index = (index + 1) % SHOWCASE_SUITS.length
        setShowHintIndex(index)
      }, 2200)
    }, 2200)

    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
      if (hintCycleRef.current) clearInterval(hintCycleRef.current)
    }
  }, [selectedId])

  function handleSelectSuit(asset: ShowcaseAsset) {
    if (glitchingId) return

    if (selectedId === asset.suit.id) {
      setSelectedId(null)
      setPlatformPhase('idle')
      setLoadingSuitId(null)
      setShowHintIndex(null)
      return
    }

    setGlitchingId(asset.suit.id)
    setPlatformPhase('idle')
    setShowHintIndex(null)

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
    setLoadingSuitId((current) => (current === selectedAsset.suit.id ? null : current))
    setPlatformPhase('active')
  }

  return (
    <div className="hall-of-armor hall-of-armor--quad">
      <div className="armor-wing armor-wing--left">
        {leftAssets.map((asset, index) => (
          <SuitPod
            key={asset.suit.id}
            asset={asset}
            isSelected={selectedId === asset.suit.id}
            isGlitching={glitchingId === asset.suit.id}
            showHint={showHintIndex === index}
            onClick={() => handleSelectSuit(asset)}
          />
        ))}
      </div>

      <div className="armor-center">
        <PlatformDisplay
          asset={selectedAsset}
          phase={platformPhase}
          isLoading={loadingSuitId === selectedAsset?.suit.id}
          onModelReady={handleModelReady}
        />
        {selectedAsset && platformPhase === 'active' ? (
          <SuitInfoPanel suit={selectedAsset.suit} />
        ) : null}
      </div>

      <div className="armor-wing armor-wing--right">
        {rightAssets.map((asset, index) => (
          <SuitPod
            key={asset.suit.id}
            asset={asset}
            isSelected={selectedId === asset.suit.id}
            isGlitching={glitchingId === asset.suit.id}
            showHint={showHintIndex === index + 2}
            onClick={() => handleSelectSuit(asset)}
          />
        ))}
      </div>
    </div>
  )
}
