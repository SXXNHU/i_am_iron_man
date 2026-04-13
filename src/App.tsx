import { useEffect, useMemo, useRef, useState } from 'react'
import { BootSequence } from './components/BootSequence'
import { ControlPanel } from './components/ControlPanel'
import { WeatherPanel } from './components/WeatherPanel'
import { SuitGallery, type AnalysisTab } from './components/SuitGallery'
import { useClapDetection } from './hooks/useClapDetection'
import { useRealtimeVoice } from './hooks/useRealtimeVoice'
import { useSharedMicrophone } from './hooks/useSharedMicrophone'
import { speakGreeting } from './utils/audioGreeting'
import { dispatchVoiceCommandAction } from './utils/actionDispatcher'
import {
  ACTIVATION_MODE_HELP,
  DEFAULT_GREETING_KEY,
  GREETING_OPTIONS,
  SUPPORT_MESSAGES,
  VOICE_COMMAND_COOLDOWN_MS,
} from './utils/constants'
import { matchVoiceCommand } from './utils/voiceCommands'
import {
  cleanupLaunchWindows,
  focusLaunchWindows,
  hasPreparedLaunchWindows,
  openWindowsMultiScreen,
  openWindowsSingleScreen,
  prepareLaunchWindows,
  refocusControlWindow,
  type LaunchPreparation,
  type MonitorMode,
} from './utils/windowLauncher'
import type { VoiceCommandDispatchResult } from './types/voiceCommands'

export type AppState =
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

export type ActivationMode = 'clap' | 'direct_voice' | 'manual'

type MicPermissionState = 'unknown' | 'granted' | 'denied'
type PermissionFlag = 'unknown' | 'granted' | 'denied' | 'unsupported' | 'pending-start'
type PopupState = 'idle' | 'prepared' | 'prepared-with-fallback' | 'blocked' | 'opened'
type OverlayPanel = 'none' | 'weather' | 'browser'

function HudClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const dateStr = now
    .toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
    .toUpperCase()

  return (
    <div className="hud-clock">
      <span className="hud-clock-time">{timeStr}</span>
      <span className="hud-clock-date">{dateStr}</span>
    </div>
  )
}

type SysDotStatus = 'idle' | 'online' | 'active' | 'standby' | 'error'

function SysItem({ label, status }: { label: string; status: SysDotStatus }) {
  return (
    <div className={`hud-sys-item${status !== 'idle' ? ' active' : ''}`}>
      <div className={`hud-sys-dot ${status}`} />
      {label}
    </div>
  )
}

function App() {
  const greetingText = GREETING_OPTIONS[DEFAULT_GREETING_KEY]
  const [activationMode, setActivationMode] = useState<ActivationMode>('clap')
  const [appState, setAppState] = useState<AppState>('idle')
  const [debugMode, setDebugMode] = useState(false)
  const [micPermission, setMicPermission] = useState<MicPermissionState>('unknown')
  const [redirectPermission, setRedirectPermission] = useState<PermissionFlag>('unknown')
  const [windowPermission, setWindowPermission] = useState<PermissionFlag>('unknown')
  const [popupState, setPopupState] = useState<PopupState>('idle')
  const [monitorMode, setMonitorMode] = useState<MonitorMode>('unknown')
  const [supportMessage, setSupportMessage] = useState('')
  const [lastError, setLastError] = useState('')
  const [clapCount, setClapCount] = useState(0)
  const [bootComplete, setBootComplete] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [showClapModal, setShowClapModal] = useState(false)
  const [windowsPrepared, setWindowsPrepared] = useState(false)
  const [windowsOpened, setWindowsOpened] = useState(false)
  const [overlayPanel, setOverlayPanel] = useState<OverlayPanel>('none')
  const [requestedAnalysisTab, setRequestedAnalysisTab] =
    useState<AnalysisTab>('armor')
  const windowPrepRef = useRef<LaunchPreparation | null>(null)
  const commandLockRef = useRef(false)
  const lastCommandRef = useRef<{ key: string; timestamp: number } | null>(null)

  const {
    ensureMicrophone,
    error: microphoneError,
    isSupported: isMicrophoneSupported,
    releaseMicrophone,
    streamRef,
  } = useSharedMicrophone()

  const {
    analyzerState,
    isSupported: isClapSupported,
    error: clapError,
    startClapListening,
    stopClapListening,
    resetClapDetection,
  } = useClapDetection({
    getStream: ensureMicrophone,
    onFirstClap: () => {
      setClapCount(1)
      setAppState('first_clap_detected')
    },
    onDoubleClap: () => {
      setClapCount(2)
      void triggerJarvisSequence('double-clap')
    },
  })

  const {
    assistantResponse,
    appendLocalTranscriptEntry,
    cancelAssistantResponse,
    connectionStatus,
    currentTranscript,
    error: realtimeError,
    initRealtimeVoiceSession,
    isSupported: isRealtimeSupported,
    requestAssistantResponse,
    resetRealtimeVoice,
    sessionStatus,
    startVoiceConversation,
    stopVoiceConversation,
    transcriptEntries,
  } = useRealtimeVoice({
    debugMode,
    onError: (message) => {
      setLastError(message)
      setAppState('error')
    },
    onStateChange: (nextState) => {
      if (nextState === 'voice_ready') {
        setAppState('voice_ready')
      }

      if (nextState === 'conversation_active') {
        setAppState('conversation_active')
      }

      if (nextState === 'stopped') {
        setAppState((current) => (current === 'error' ? current : 'stopped'))
      }
    },
    onUserTranscriptFinal: (text) => {
      void handleUserTranscriptFinal(text)
    },
  })

  useEffect(() => {
    if (!isMicrophoneSupported) {
      setSupportMessage('Microphone access is unavailable in this browser.')
      return
    }

    if (activationMode === 'clap' && !isClapSupported) {
      setSupportMessage(SUPPORT_MESSAGES.audioAnalysisUnsupported)
      return
    }

    if (!isRealtimeSupported) {
      setSupportMessage(SUPPORT_MESSAGES.realtimeUnsupported)
    }
  }, [activationMode, isClapSupported, isMicrophoneSupported, isRealtimeSupported])

  useEffect(() => {
    if (microphoneError) {
      setLastError(microphoneError)
      setMicPermission('denied')
      setAppState('error')
    }
  }, [microphoneError])

  useEffect(() => {
    if (clapError) {
      setLastError(clapError)
      setAppState('error')
    }
  }, [clapError])

  useEffect(() => {
    if (realtimeError) {
      setLastError(realtimeError)
      setAppState('error')
    }
  }, [realtimeError])

  useEffect(() => {
    if (appState === 'conversation_active') {
      stopClapListening()
      setShowClapModal(false)
    }
  }, [appState, stopClapListening])

  useEffect(() => {
    if (activationMode !== 'clap') {
      stopClapListening()
      setShowClapModal(false)
    }
  }, [activationMode, stopClapListening])

  useEffect(() => {
    if (appState === 'idle' && !lastError) {
      setSupportMessage(ACTIVATION_MODE_HELP[activationMode])
    }
  }, [activationMode, appState, lastError])

  useEffect(() => {
    return () => {
      cleanupLaunchWindows(windowPrepRef.current)
    }
  }, [])

  const isBrowserReady = windowsPrepared || windowsOpened

  const statusItems = useMemo(
    () => [
      { label: 'Ready Status', value: isReady ? 'COMPLETE' : 'PENDING' },
      { label: 'Mode', value: activationMode.toUpperCase() },
      { label: 'State', value: appState.toUpperCase() },
      { label: 'Mic Permission', value: micPermission.toUpperCase() },
      { label: 'Redirect', value: redirectPermission.toUpperCase() },
      { label: 'Window Mgmt', value: windowPermission.toUpperCase() },
      { label: 'Clap Count', value: String(clapCount) },
      { label: 'Popup Status', value: popupState.toUpperCase() },
      {
        label: 'Commands',
        value:
          appState === 'conversation_active' || appState === 'voice_ready'
            ? 'LIVE'
            : activationMode === 'clap'
              ? 'POST-CLAP'
              : 'POST-START',
      },
      { label: 'Monitor Mode', value: monitorMode.toUpperCase() },
      { label: 'Analyzer', value: analyzerState.toUpperCase() },
      { label: 'Session', value: sessionStatus.toUpperCase() },
      { label: 'Link', value: connectionStatus.toUpperCase() },
      { label: 'Transcript', value: currentTranscript || 'WAITING...' },
      { label: 'Response', value: assistantResponse || 'NO RESPONSE' },
    ],
    [
      activationMode,
      analyzerState,
      appState,
      assistantResponse,
      clapCount,
      connectionStatus,
      currentTranscript,
      isReady,
      micPermission,
      monitorMode,
      popupState,
      redirectPermission,
      sessionStatus,
      windowPermission,
    ],
  )

  async function safelyRun(action: () => Promise<void>) {
    if (commandLockRef.current) {
      return false
    }

    commandLockRef.current = true

    try {
      await action()
      return true
    } finally {
      commandLockRef.current = false
    }
  }

  async function primeSystemInternal() {
    setLastError('')
    setAppState('requesting_permissions')
    setSupportMessage(
      'Preparing microphone access and window placement permission before launch.',
    )

    const stream = await ensureMicrophone()
    setMicPermission('granted')

    if (!stream) {
      throw new Error('Unable to access a microphone stream.')
    }

    if ('getScreenDetails' in window) {
      try {
        await window.getScreenDetails?.()
        setWindowPermission('granted')
        setMonitorMode('checking-window-management')
      } catch {
        setWindowPermission('denied')
        setMonitorMode('single-screen')
      }
    } else {
      setWindowPermission('unsupported')
      setMonitorMode('single-screen')
    }

    setIsReady(true)
    setAppState('idle')
    setSupportMessage(
      activationMode === 'clap'
        ? 'Microphone and popup permissions primed. Arm clap mode when ready.'
        : activationMode === 'manual'
          ? 'Microphone primed. Manual mode will start voice without cinematic launch.'
          : 'Microphone primed. Start voice mode when ready.',
    )
  }

  async function handleReady() {
    await safelyRun(async () => {
      try {
        await primeSystemInternal()
      } catch (error) {
        setMicPermission('denied')
        setRedirectPermission('unknown')
        setLastError(error instanceof Error ? error.message : 'Failed to prepare JARVIS.')
        setAppState('error')
      }
    })
  }

  async function prepareBrowserWindows() {
    cleanupLaunchWindows(windowPrepRef.current)
    windowPrepRef.current = prepareLaunchWindows()
    setPopupState(windowPrepRef.current.status)

    const popupGranted = windowPrepRef.current.status !== 'blocked'
    setRedirectPermission(popupGranted ? 'granted' : 'denied')
    setWindowsPrepared(popupGranted)

    if (!popupGranted) {
      throw new Error(SUPPORT_MESSAGES.popupBlocked)
    }

    return windowPrepRef.current
  }

  async function ensureVoiceSession(stream: MediaStream) {
    if (sessionStatus === 'idle' || sessionStatus === 'stopped' || sessionStatus === 'error') {
      await initRealtimeVoiceSession(stream)
    }
  }

  async function startDirectVoiceExperience(source: 'direct' | 'manual' | 'command') {
    if (sessionStatus === 'active') {
      setSupportMessage('Conversation is already active.')
      return
    }

    const stream = await ensureMicrophone()
    setMicPermission('granted')
    stopClapListening()
    setShowClapModal(false)
    setAppState('greeting')
    await ensureVoiceSession(stream)
    startVoiceConversation()
    setRequestedAnalysisTab(source === 'manual' ? 'status' : 'log')
    setSupportMessage(
      source === 'manual'
        ? 'Manual mode is live. Voice commands are active, but browser/window actions remain explicit.'
        : 'Direct voice mode is live. Spoken commands and conversation are active.',
    )
  }

  async function handleStart() {
    await safelyRun(async () => {
      if (!isReady) {
        setSupportMessage('Press PRIME first to enable the microphone before starting voice mode.')
        return
      }

      setLastError('')
      setAppState('requesting_permissions')

      try {
        if (activationMode === 'clap') {
          await prepareBrowserWindows()
          refocusControlWindow()
          window.setTimeout(refocusControlWindow, 80)
          window.setTimeout(refocusControlWindow, 180)
          await startClapListening()
          setClapCount(0)
          setShowClapModal(true)
          setAppState('armed')
          setSupportMessage('Clap mode armed. Double clap to trigger the launch sequence.')
          return
        }

        await startDirectVoiceExperience(
          activationMode === 'manual' ? 'manual' : 'direct',
        )
      } catch (error) {
        setLastError(error instanceof Error ? error.message : 'Failed to start JARVIS.')
        setAppState('error')
      }
    })
  }

  async function triggerJarvisSequence(source: 'double-clap' | 'browser-button') {
    const stream = streamRef.current

    if (!stream) {
      setLastError('Microphone stream required before launch.')
      setAppState('error')
      return
    }

    setShowClapModal(false)
    setAppState('launching')
    stopClapListening()

    try {
      if (!windowPrepRef.current || !hasPreparedLaunchWindows(windowPrepRef.current)) {
        await prepareBrowserWindows()
      }

      const placement = await attemptWindowLaunch()
      setPopupState('opened')
      setMonitorMode(placement)
      setWindowsOpened(true)
      setOverlayPanel('browser')
      setAppState('greeting')
      focusLaunchWindows(windowPrepRef.current)

      const greetingPromise = speakGreeting(greetingText)
      await ensureVoiceSession(stream)
      await greetingPromise
      startVoiceConversation()
      setRequestedAnalysisTab('log')
      setSupportMessage(
        source === 'browser-button'
          ? 'Browser windows opened and voice conversation started.'
          : 'Launch sequence complete. Browser windows opened and voice is live.',
      )
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Launch sequence failed.')
      setAppState('error')
    }
  }

  async function attemptWindowLaunch(): Promise<MonitorMode> {
    const prepared = windowPrepRef.current

    if ('getScreenDetails' in window) {
      try {
        return await openWindowsMultiScreen(prepared)
      } catch {
        return openWindowsSingleScreen(prepared)
      }
    }

    return openWindowsSingleScreen(prepared)
  }

  async function openBrowserWindowsInternal() {
    setLastError('')

    if (!isReady) {
      await primeSystemInternal()
    }

    if (!windowPrepRef.current || !hasPreparedLaunchWindows(windowPrepRef.current)) {
      await prepareBrowserWindows()
    }

    const placement = await attemptWindowLaunch()
    setPopupState('opened')
    setMonitorMode(placement)
    setWindowsOpened(true)
    setOverlayPanel('browser')
    focusLaunchWindows(windowPrepRef.current)
    setSupportMessage('Browser windows are open and focused.')
  }

  async function handleBrowserWindows() {
    await safelyRun(async () => {
      try {
        await openBrowserWindowsInternal()
      } catch (error) {
        setLastError(
          error instanceof Error ? error.message : 'Unable to open browser windows.',
        )
        setAppState('error')
      }
    })
  }

  async function stopListeningInternal(message: string) {
    stopClapListening()
    setShowClapModal(false)
    await stopVoiceConversation()
    setAppState('stopped')
    setSupportMessage(message)
  }

  async function handleStopListening(message = 'Voice session terminated.') {
    await safelyRun(async () => {
      await stopListeningInternal(message)
    })
  }

  async function handleReset() {
    await safelyRun(async () => {
      cleanupLaunchWindows(windowPrepRef.current)
      windowPrepRef.current = null
      stopClapListening()
      setShowClapModal(false)
      await stopVoiceConversation()
      releaseMicrophone()
      resetClapDetection()
      resetRealtimeVoice()
      setActivationMode('clap')
      setAppState('idle')
      setMicPermission('unknown')
      setRedirectPermission('unknown')
      setWindowPermission('unknown')
      setPopupState('idle')
      setMonitorMode('unknown')
      setSupportMessage('')
      setLastError('')
      setClapCount(0)
      setIsReady(false)
      setWindowsPrepared(false)
      setWindowsOpened(false)
      setOverlayPanel('none')
      setRequestedAnalysisTab('armor')
      lastCommandRef.current = null
    })
  }

  async function handleUserTranscriptFinal(text: string) {
    const match = matchVoiceCommand(text)

    if (!match) {
      requestAssistantResponse()
      return
    }

    if (match.ambiguityReason) {
      requestAssistantResponse()
      return
    }

    const now = Date.now()
    const previous = lastCommandRef.current

    if (
      previous &&
      previous.key === match.normalizedText &&
      now - previous.timestamp < VOICE_COMMAND_COOLDOWN_MS
    ) {
      return
    }

    lastCommandRef.current = {
      key: match.normalizedText,
      timestamp: now,
    }

    cancelAssistantResponse()

    await safelyRun(async () => {
      const result = await dispatchVoiceCommandAction(match.intent, {
        hide_transcript: async () => {
          setRequestedAnalysisTab('status')
          return { handled: true, message: 'Transcript panel hidden.' }
        },
        open_browser_panel: async () => {
          setOverlayPanel('browser')
          return { handled: true, message: 'Browser panel opened.' }
        },
        open_browser_window: async () => {
          await openBrowserWindowsInternal()
          return { handled: true, message: 'Browser windows opened.' }
        },
        open_weather_panel: async () => {
          setOverlayPanel('weather')
          return {
            handled: true,
            message: 'Weather panel opened.',
          }
        },
        show_transcript: async () => {
          setRequestedAnalysisTab('log')
          return { handled: true, message: 'Transcript panel opened.' }
        },
        start_conversation: async () => {
          if (sessionStatus === 'active') {
            return { handled: true, message: 'Conversation is already active.' }
          }

          await startDirectVoiceExperience('command')
          return { handled: true, message: 'Conversation started.' }
        },
        stop_conversation: async () => {
          await stopListeningInternal('Voice session stopped after spoken command.')
          return { handled: true, message: 'Conversation stopped.' }
        },
      })

      handleVoiceDispatchResult(result)
      appendLocalTranscriptEntry(
        'system',
        `Local command executed: ${match.intent.replaceAll('_', ' ')}.`,
      )
    })
  }

  function handleVoiceDispatchResult(result: VoiceCommandDispatchResult) {
    if (!result.handled) {
      return
    }

    if (result.message) {
      setSupportMessage(result.message)
    }
  }

  const powerStatus: SysDotStatus = 'active'
  const neuralStatus: SysDotStatus =
    appState === 'conversation_active'
      ? 'active'
      : appState === 'voice_ready'
        ? 'online'
        : 'idle'
  const audioStatus: SysDotStatus =
    micPermission === 'granted'
      ? 'active'
      : appState === 'error'
        ? 'error'
        : 'idle'
  const voiceStatus: SysDotStatus =
    sessionStatus === 'active'
      ? 'active'
      : sessionStatus === 'ready'
        ? 'online'
        : sessionStatus === 'preparing'
          ? 'standby'
          : appState === 'error'
            ? 'error'
            : 'idle'

  const isClapArmed = appState === 'armed' || appState === 'first_clap_detected'
  const footerMessage =
    lastError ||
    supportMessage ||
    (appState === 'idle'
      ? 'ARMOR MANAGEMENT SYSTEM - AWAITING COMMAND'
      : appState === 'requesting_permissions'
        ? 'ACQUIRING SYSTEM PERMISSIONS...'
        : appState === 'armed'
          ? clapCount === 1
            ? '[ ONE MORE CLAP... ]'
            : '[ AWAITING DOUBLE CLAP ]'
          : appState === 'launching'
            ? 'INITIATING LAUNCH SEQUENCE...'
            : appState === 'greeting'
              ? 'J.A.R.V.I.S. INITIALIZING VOICE BRIDGE...'
              : appState === 'voice_ready'
                ? 'VOICE BRIDGE ONLINE - READY FOR CONVERSATION'
                : appState === 'conversation_active'
                  ? 'CONVERSATION ACTIVE - LISTENING...'
                  : appState === 'stopped'
                    ? 'SESSION TERMINATED'
                    : appState === 'error'
                      ? 'SYSTEM ERROR - CHECK DIAGNOSTICS'
                      : '')

  const revealClass = bootComplete ? ' visible' : ''

  return (
    <div className="app-shell">
      <div className="app-ambient left" />
      <div className="app-ambient right" />

      {!bootComplete && <BootSequence onComplete={() => setBootComplete(true)} />}

      <header className={`hud-header hud-reveal${revealClass}`}>
        <div className="hud-brand">
          <div className="hud-arc-icon">
            <div className="hud-arc-icon-ring" />
            <div className="hud-arc-icon-ring r2" />
            <div className="hud-arc-icon-core" />
          </div>
          <div className="hud-brand-text">
            <span className="hud-brand-name">STARK INDUSTRIES</span>
            <span className="hud-brand-sub">J.A.R.V.I.S. ARMOR MANAGEMENT SYSTEM</span>
          </div>
        </div>

        <div className="hud-sys-row">
          <SysItem label="POWER" status={powerStatus} />
          <SysItem label="NEURAL" status={neuralStatus} />
          <SysItem label="AUDIO" status={audioStatus} />
          <SysItem label="VOICE" status={voiceStatus} />
        </div>

        <HudClock />
      </header>

      <main className={`hud-main hud-reveal${revealClass}`}>
        <SuitGallery
          appState={appState}
          lastError={lastError}
          onAnalysisTabChange={setRequestedAnalysisTab}
          requestedAnalysisTab={requestedAnalysisTab}
          showDebugEntries={debugMode}
          statusItems={statusItems}
          transcriptEntries={transcriptEntries}
        />
      </main>

      <footer className={`hud-footer hud-reveal${revealClass}`}>
        <ControlPanel
          activationMode={activationMode}
          appState={appState}
          debugMode={debugMode}
          isBrowserReady={isBrowserReady}
          isReady={isReady}
          onActivationModeChange={setActivationMode}
          onDebugModeChange={setDebugMode}
          onReady={handleReady}
          onReset={handleReset}
          onStart={handleStart}
          onStop={() => void handleStopListening()}
          onTestLaunch={handleBrowserWindows}
        />
        <div className="footer-sep" />
        <div className="footer-status-area">
          <span
            className={`footer-status-msg${
              lastError ? ' error' : appState === 'conversation_active' ? ' active' : ''
            }`}
          >
            {footerMessage}
          </span>
        </div>
        {isClapArmed && (
          <div className="footer-clap-badge">
            {clapCount === 1 ? '2ND CLAP...' : 'AWAITING CLAP'}
          </div>
        )}
      </footer>

      {showClapModal && (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-labelledby="clap-modal-title"
            aria-modal="true"
            className="activation-modal"
            role="dialog"
          >
            <div className="modal-eyebrow">ACTIVATION ARMED</div>
            <h2 className="modal-title" id="clap-modal-title">
              Clap twice to wake J.A.R.V.I.S.
            </h2>
            <p className="modal-body">
              Launch windows are standing by. Keep this tab active, then clap twice
              in rapid succession to trigger the launch sequence.
            </p>
            <div className="modal-chips">
              <span className="modal-chip">MIC: {micPermission}</span>
              <span className="modal-chip">REDIRECT: {redirectPermission}</span>
              <span className="modal-chip">WINDOW: {windowPermission}</span>
            </div>
            <div className="modal-actions">
              <button className="hud-btn ghost" onClick={() => setShowClapModal(false)}>
                DISMISS
              </button>
            </div>
          </section>
        </div>
      )}

      {overlayPanel !== 'none' && (
        <div className="modal-backdrop" role="presentation">
          {overlayPanel === 'weather' ? (
            <WeatherPanel onClose={() => setOverlayPanel('none')} />
          ) : (
            <section aria-modal="true" className="activation-modal" role="dialog">
              <div className="modal-eyebrow">BROWSER PANEL</div>
              <h2 className="modal-title">Browser Control Panel</h2>
              <p className="modal-body">
                {isBrowserReady
                  ? 'Browser windows have been prepared for focus/open actions. Use spoken commands or the browser button to reopen them.'
                  : 'Browser windows are not prepared yet. Prime the system first, then open them by button or voice.'}
              </p>
              <div className="modal-chips">
                <span className="modal-chip">MODE: {activationMode}</span>
                <span className="modal-chip">SESSION: {sessionStatus}</span>
                <span className="modal-chip">POPUP: {popupState}</span>
              </div>
              <div className="modal-actions">
                <button className="hud-btn" onClick={() => void handleBrowserWindows()}>
                  OPEN WINDOWS
                </button>
                <button className="hud-btn ghost" onClick={() => setOverlayPanel('none')}>
                  CLOSE
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

export default App
