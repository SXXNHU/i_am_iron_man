import type { AppState } from '../App'

type HudShowcaseProps = {
  appState: AppState
  assistantResponse: string
  clapCount: number
  connectionStatus: string
  currentTranscript: string
}

const telemetryLeft = [
  { label: 'Core Usage', value: '81.0%', accent: 'cyan' },
  { label: 'Wake Grid', value: '63.0%', accent: 'cyan' },
  { label: 'Voice Mesh', value: '59.0%', accent: 'red' },
] as const

const telemetryRight = [
  { label: 'Thermal Balance', value: '15 C', accent: 'cyan' },
  { label: 'Clap Sync', value: '2X', accent: 'red' },
  { label: 'Window Route', value: 'READY', accent: 'cyan' },
] as const

const moduleLabels = [
  'LPR',
  'CMP',
  'SOC',
  'CTL',
  'AUX',
  'DSP',
  'VAD',
  'RTX',
  'NLP',
  'SYNC',
  'NAV',
  'SFX',
] as const

export function HudShowcase({
  appState,
  assistantResponse,
  clapCount,
  connectionStatus,
  currentTranscript,
}: HudShowcaseProps) {
  return (
    <section className="showcase-shell">
      <div className="showcase-column">
        {telemetryLeft.map((item, index) => (
          <article key={item.label} className="telemetry-card">
            <div className="telemetry-topline">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="telemetry-meter">
              <div
                className={`telemetry-meter-fill ${item.accent}`}
                style={{ width: `${72 - index * 14}%` }}
              />
            </div>
            <div className="telemetry-grid">
              <span>INPUT</span>
              <span>{appState}</span>
              <span>WAKE</span>
              <span>{clapCount}/2</span>
            </div>
          </article>
        ))}
      </div>

      <div className="showcase-core">
        <div className="showcase-radar-ring radar-ring-outer" />
        <div className="showcase-radar-ring radar-ring-middle" />
        <div className="showcase-radar-ring radar-ring-inner" />
        <div className="showcase-radar-scan" />

        <div className="showcase-module-orbit">
          {moduleLabels.map((label, index) => {
            const angle = (360 / moduleLabels.length) * index
            return (
              <div
                key={label}
                className="orbit-module"
                style={{
                  transform: `rotate(${angle}deg) translateY(calc(var(--showcase-orbit-radius, 214px) * -1))`,
                }}
              >
                <span>{label}</span>
              </div>
            )
          })}
        </div>

        <div className="showcase-core-center">
          <div className="core-center-ring" />
          <div className="core-center-ring secondary" />
          <div className="core-center-text">
            <span>J.A.R.V.I.S</span>
            <strong>{connectionStatus}</strong>
          </div>
        </div>

        <div className="showcase-axis axis-top" />
        <div className="showcase-axis axis-right" />
        <div className="showcase-axis axis-bottom" />
        <div className="showcase-axis axis-left" />
      </div>

      <div className="showcase-column">
        {telemetryRight.map((item, index) => (
          <article key={item.label} className="telemetry-card">
            <div className="telemetry-topline">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="telemetry-inline">
              <span className={`telemetry-pip ${item.accent}`} />
              <span>{index === 0 ? 'Nominal envelope' : index === 1 ? 'Impact window stable' : 'Split launch armed'}</span>
            </div>
            <div className="telemetry-grid">
              <span>VOICE</span>
              <span>{connectionStatus}</span>
              <span>TRACE</span>
              <span>{currentTranscript ? 'LIVE' : 'IDLE'}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="showcase-footer">
        <div className="showcase-waveform">
          {Array.from({ length: 56 }, (_, index) => (
            <span
              key={index}
              className={`wave-bar ${index % 9 === 0 ? 'accent' : ''}`}
              style={{ height: `${8 + ((index * 13) % 36)}px` }}
            />
          ))}
        </div>
        <div className="showcase-footer-copy">
          <span>assistant channel</span>
          <strong>{assistantResponse || 'Awaiting polished response output.'}</strong>
        </div>
      </div>
    </section>
  )
}
