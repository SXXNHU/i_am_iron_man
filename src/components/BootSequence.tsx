import { useEffect, useMemo, useState } from 'react'

type BootSequenceProps = {
  onComplete: () => void
}

const bootMilestones = [
  'Optical lattice synchronizing',
  'Servo deck indexing',
  'Voice bridge stabilizing',
  'Assistant core awakening',
] as const

const cellCount = 32
const bootProgressSegments = [
  { duration: 520, from: 0, to: 18 },
  { duration: 180, from: 18, to: 18 },
  { duration: 760, from: 18, to: 44 },
  { duration: 260, from: 44, to: 44 },
  { duration: 700, from: 44, to: 71 },
  { duration: 140, from: 71, to: 71 },
  { duration: 940, from: 71, to: 100 },
] as const

const bootSequenceDuration = bootProgressSegments.reduce(
  (total, segment) => total + segment.duration,
  0,
)

function getProgressAtElapsed(elapsed: number) {
  let consumed = 0

  for (const segment of bootProgressSegments) {
    const segmentEnd = consumed + segment.duration

    if (elapsed <= segmentEnd) {
      const segmentElapsed = elapsed - consumed
      const progressRatio = Math.max(0, segmentElapsed) / segment.duration

      return segment.from + (segment.to - segment.from) * progressRatio
    }

    consumed = segmentEnd
  }

  return 100
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [progress, setProgress] = useState(0)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const startedAt = performance.now()
    let frameId = 0
    let leaveTimer: number | null = null

    const tick = () => {
      const elapsed = performance.now() - startedAt
      const nextProgress = Math.min(100, getProgressAtElapsed(elapsed))
      setProgress(nextProgress)
      setPhaseIndex(
        Math.min(
          bootMilestones.length - 1,
          Math.floor((nextProgress / 100) * bootMilestones.length),
        ),
      )

      if (elapsed < bootSequenceDuration) {
        frameId = window.requestAnimationFrame(tick)
        return
      }

      setIsLeaving(true)
      leaveTimer = window.setTimeout(onComplete, 650)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameId)
      if (leaveTimer) {
        window.clearTimeout(leaveTimer)
      }
    }
  }, [onComplete])

  const highlightedMilestones = useMemo(
    () =>
      bootMilestones.map((milestone, index) => ({
        milestone,
        state:
          index < phaseIndex
            ? 'done'
            : index === phaseIndex
              ? 'active'
              : 'pending',
      })),
    [phaseIndex],
  )

  const activeCellCount = Math.round((progress / 100) * cellCount)

  return (
    <div className={`boot-overlay${isLeaving ? ' leaving' : ''}`}>
      <div className="boot-grid" />
      <div className="boot-vignette" />
      <div className="boot-stars" />

      <section className="boot-stage">
        <div className="boot-core">
          <div className="boot-orbit orbit-shell-1" />
          <div className="boot-orbit orbit-shell-2" />
          <div className="boot-orbit orbit-shell-3" />
          <div className="boot-orbit orbit-shell-4" />
          <div className="boot-dot-ring" />
          <div className="boot-wire-sphere" />
          <div className="boot-reticle reticle-h" />
          <div className="boot-reticle reticle-v" />
          <div className="boot-scan-bar" />

          <div className="boot-center-core">
            <div className="boot-center-disc disc-outer" />
            <div className="boot-center-disc disc-mid" />
            <div className="boot-center-disc disc-inner" />
            <div className="boot-center-label">
              <span>JARVIS</span>
              <strong>{Math.round(progress)}%</strong>
            </div>
          </div>

          <div className="boot-side-mark side-mark-left" />
          <div className="boot-side-mark side-mark-right" />
          <div className="boot-side-mark side-mark-top" />
          <div className="boot-side-mark side-mark-bottom" />

        </div>

        <div className="boot-copy">
          <span className="boot-kicker">Desktop Aide Initialization</span>
          <h2>Neural Interface Sequencing</h2>
          <p>
            Arc channels, visual reticles, and command surfaces are phasing into
            a coherent assistant shell.
          </p>
        </div>

        <div className="boot-status-panel">
          <div className="boot-status-header">
            <span>Boot Sequence</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <div className="boot-progress-track segmented">
            <div className="boot-progress-segments">
              {Array.from({ length: cellCount }, (_, index) => (
                <span
                  key={index}
                  className={`boot-progress-segment${index < activeCellCount ? ' active' : ''}`}
                  style={{ animationDelay: `${index * 42}ms` }}
                />
              ))}
            </div>
          </div>
          <div className="boot-milestones">
            {highlightedMilestones.map(({ milestone, state }) => (
              <div key={milestone} className={`boot-milestone ${state}`}>
                <span className="boot-milestone-dot" />
                <span>{milestone}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
