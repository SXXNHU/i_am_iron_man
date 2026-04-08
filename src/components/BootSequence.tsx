import { useEffect, useMemo, useState } from 'react'

type BootSequenceProps = {
  onComplete: () => void
}

const bootMilestones = [
  'Calibrating arc lattice',
  'Sequencing servo clusters',
  'Aligning flight surfaces',
  'Bringing aide core online',
] as const

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
      const nextProgress = Math.min(100, (elapsed / 4600) * 100)
      setProgress(nextProgress)
      setPhaseIndex(
        Math.min(
          bootMilestones.length - 1,
          Math.floor((nextProgress / 100) * bootMilestones.length),
        ),
      )

      if (nextProgress < 100) {
        frameId = window.requestAnimationFrame(tick)
        return
      }

      setIsLeaving(true)
      leaveTimer = window.setTimeout(onComplete, 600)
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

  return (
    <div className={`boot-overlay${isLeaving ? ' leaving' : ''}`}>
      <div className="boot-grid" />
      <div className="boot-vignette" />

      <section className="boot-stage">
        <div className="boot-core">
          <div className="boot-ring boot-ring-outer" />
          <div className="boot-ring boot-ring-middle" />
          <div className="boot-ring boot-ring-inner" />
          <div className="boot-scan" />
          <div className="boot-diamond" />

          <div className="boot-assembly">
            <div className="boot-assembly-bar">
              <div className="boot-assembly-fill" style={{ width: `${progress}%` }} />
              <div className="boot-assembly-stripes" />
            </div>
            <div className="boot-assembly-node">
              <span>{Math.round(progress)}</span>
            </div>
          </div>

          <div className="boot-shards">
            <span className="boot-shard shard-top-left" />
            <span className="boot-shard shard-top-right" />
            <span className="boot-shard shard-bottom-left" />
            <span className="boot-shard shard-bottom-right" />
            <span className="boot-shard shard-left" />
            <span className="boot-shard shard-right" />
          </div>

          <div className="boot-arc-reactor">
            <div className="boot-arc-shell" />
            <div className="boot-arc-blades">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="boot-arc-center" />
          </div>
        </div>

        <div className="boot-copy">
          <span className="boot-kicker">Desktop Aide Initialization</span>
          <h2>Assembling Interface Matrix</h2>
          <p>
            Mechanical subsystems, optical rings, and assistant channels are
            phasing into alignment.
          </p>
        </div>

        <div className="boot-status-panel">
          <div className="boot-status-header">
            <span>Boot Sequence</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <div className="boot-progress-track">
            <div className="boot-progress-fill" style={{ width: `${progress}%` }} />
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
