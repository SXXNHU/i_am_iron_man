import type { AppState } from '../App'

type ActivationMode = 'clap' | 'direct_voice' | 'manual'

type ControlPanelProps = {
  activationMode: ActivationMode
  appState: AppState
  debugMode: boolean
  isBrowserReady: boolean
  isReady: boolean
  onActivationModeChange: (mode: ActivationMode) => void
  onDebugModeChange: (enabled: boolean) => void
  onReady: () => void
  onReset: () => void
  onStart: () => void
  onStop: () => void
  onTestLaunch: () => void
}

export function ControlPanel({
  activationMode,
  appState,
  debugMode,
  isBrowserReady,
  isReady,
  onActivationModeChange,
  onDebugModeChange,
  onReady,
  onReset,
  onStart,
  onStop,
  onTestLaunch,
}: ControlPanelProps) {
  const busy =
    appState === 'requesting_permissions' ||
    appState === 'launching' ||
    appState === 'greeting'

const canStop =
    appState !== 'idle' &&
    appState !== 'stopped' &&
    appState !== 'requesting_permissions'

  const startLabel =
    activationMode === 'clap'
      ? 'ARM CLAP'
      : activationMode === 'manual'
        ? 'START MANUAL'
        : 'START VOICE'

  return (
    <div className="control-panel">
      <select
        aria-label="Activation mode"
        className="hud-btn ghost"
        onChange={(event) => onActivationModeChange(event.target.value as ActivationMode)}
        value={activationMode}
      >
        <option value="clap">CLAP</option>
        <option value="direct_voice">DIRECT VOICE</option>
        <option value="manual">MANUAL</option>
      </select>

      <button
        aria-pressed={debugMode}
        className={`hud-btn ghost${debugMode ? ' primary' : ''}`}
        onClick={() => onDebugModeChange(!debugMode)}
        type="button"
      >
        {debugMode ? 'DEBUG ON' : 'DEBUG OFF'}
      </button>

      <button className="hud-btn" disabled={busy} onClick={onReady}>
        {isReady ? 'PRIMED' : 'PRIME'}
      </button>

      <button
        className="hud-btn primary"
        disabled={busy || !isReady}
        onClick={onStart}
        title={`Start ${activationMode.replace('_', ' ')} mode`}
      >
        {startLabel}
      </button>

      <button className="hud-btn danger" disabled={!canStop} onClick={onStop}>
        TERMINATE
      </button>

      <button
        className="hud-btn"
        disabled={busy || !isBrowserReady}
        onClick={onTestLaunch}
      >
        BROWSER
      </button>

      <button className="hud-btn ghost" onClick={onReset}>
        RESET
      </button>
    </div>
  )
}
