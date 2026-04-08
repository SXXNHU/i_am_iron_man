import type { AppState } from '../App'

type ControlPanelProps = {
  appState: AppState
  hasLaunched: boolean
  onReset: () => void
  onStart: () => void
  onStop: () => void
  onTestLaunch: () => void
}

export function ControlPanel({
  appState,
  hasLaunched,
  onReset,
  onStart,
  onStop,
  onTestLaunch,
}: ControlPanelProps) {
  const busy =
    appState === 'requesting_permissions' ||
    appState === 'launching' ||
    appState === 'greeting'

  return (
    <div className="control-panel">
      <button className="primary" disabled={busy || hasLaunched} onClick={onStart}>
        Start JARVIS
      </button>
      <button
        className="secondary"
        disabled={appState === 'idle' || appState === 'stopped'}
        onClick={onStop}
      >
        Stop Listening
      </button>
      <button
        className="secondary"
        disabled={busy || hasLaunched}
        onClick={onTestLaunch}
      >
        Test Launch
      </button>
      <button className="ghost" onClick={onReset}>
        Reset
      </button>
    </div>
  )
}
