import { useEffect, useMemo, useRef, useState } from 'react'
import { BootSequence } from './components/BootSequence'
import { ControlPanel } from './components/ControlPanel'
import { SuitGallery } from './components/SuitGallery'
import { StatusPanel } from './components/StatusPanel'
import { TranscriptPanel } from './components/TranscriptPanel'
import { useClapDetection } from './hooks/useClapDetection'
import { useRealtimeVoice } from './hooks/useRealtimeVoice'
import { speakGreeting } from './utils/audioGreeting'
import {
  DEFAULT_GREETING_KEY,
  GREETING_OPTIONS,
  SUPPORT_MESSAGES,
} from './utils/constants'
import {
  cleanupLaunchWindows,
  focusLaunchWindows,
  openWindowsMultiScreen,
  openWindowsSingleScreen,
  prepareLaunchWindows,
  refocusControlWindow,
  type LaunchPreparation,
  type MonitorMode,
} from './utils/windowLauncher'

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

type MicPermissionState = 'unknown' | 'granted' | 'denied'
type PermissionFlag =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'pending-start'
type PopupState =
  | 'idle'
  | 'prepared'
  | 'prepared-with-fallback'
  | 'blocked'
  | 'opened'

function App() {
  const greetingText = GREETING_OPTIONS[DEFAULT_GREETING_KEY]
  const [appState, setAppState] = useState<AppState>('idle')
  const [micPermission, setMicPermission] =
    useState<MicPermissionState>('unknown')
  const [redirectPermission, setRedirectPermission] =
    useState<PermissionFlag>('unknown')
  const [windowPermission, setWindowPermission] =
    useState<PermissionFlag>('unknown')
  const [popupState, setPopupState] = useState<PopupState>('idle')
  const [monitorMode, setMonitorMode] = useState<MonitorMode>('unknown')
  const [supportMessage, setSupportMessage] = useState('')
  const [lastError, setLastError] = useState('')
  const [hasLaunched, setHasLaunched] = useState(false)
  const [clapCount, setClapCount] = useState(0)
  const [bootComplete, setBootComplete] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [showClapModal, setShowClapModal] = useState(false)
  const windowPrepRef = useRef<LaunchPreparation | null>(null)

  const {
    analyzerState,
    isSupported: isClapSupported,
    error: clapError,
    releaseMicrophone,
    streamRef,
    requestMicPermission,
    startClapListening,
    stopClapListening,
  } = useClapDetection({
    onFirstClap: () => {
      setClapCount(1)
      setAppState('first_clap_detected')
    },
    onDoubleClap: () => {
      setClapCount(2)
      void triggerJarvisSequence('double-clap')
    },
  })
  const requestMicPermissionRef = useRef(requestMicPermission)

  const {
    connectionStatus,
    sessionStatus,
    isSupported: isRealtimeSupported,
    error: realtimeError,
    currentTranscript,
    assistantResponse,
    transcriptEntries,
    initRealtimeVoiceSession,
    startVoiceConversation,
    stopVoiceConversation,
    resetRealtimeVoice,
  } = useRealtimeVoice({
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
    onStopRequested: (reason) => {
      setSupportMessage(reason)
      void handleStopListening()
    },
    onError: (message) => {
      setLastError(message)
      setAppState('error')
    },
  })

  useEffect(() => {
    if (!isClapSupported) {
      setSupportMessage(SUPPORT_MESSAGES.audioAnalysisUnsupported)
    } else if (!isRealtimeSupported) {
      setSupportMessage(SUPPORT_MESSAGES.realtimeUnsupported)
    }
  }, [isClapSupported, isRealtimeSupported])

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
    return () => {
      cleanupLaunchWindows(windowPrepRef.current)
    }
  }, [])

  useEffect(() => {
    requestMicPermissionRef.current = requestMicPermission
  }, [requestMicPermission])

  const statusItems = useMemo(
    () => [
      { label: 'Ready Status', value: isReady ? 'complete' : 'pending' },
      { label: 'State', value: appState },
      { label: 'Mic Permission', value: micPermission },
      { label: 'Redirect Permission', value: redirectPermission },
      { label: 'Window Permission', value: windowPermission },
      { label: 'Clap Count', value: String(clapCount) },
      { label: 'Popup Status', value: popupState },
      { label: 'Monitor Mode', value: monitorMode },
      { label: 'Analyzer', value: analyzerState },
      { label: 'Realtime Session', value: sessionStatus },
      { label: 'Realtime Link', value: connectionStatus },
      {
        label: 'Current Transcript',
        value: currentTranscript || 'Waiting for speech...',
      },
      {
        label: 'Assistant Response',
        value: assistantResponse || 'No response yet.',
      },
    ],
    [
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

  async function handleReady() {
    if (hasLaunched) {
      setSupportMessage('Reset before preparing JARVIS again.')
      return
    }

    setLastError('')
    setAppState('requesting_permissions')
    setSupportMessage(
      'Preparing microphone access and window placement permission before launch.',
    )
    cleanupLaunchWindows(windowPrepRef.current)
    windowPrepRef.current = null
    setPopupState('idle')
    setRedirectPermission('pending-start')

    try {
      const stream = await requestMicPermission()
      setMicPermission('granted')

      if (!stream) {
        throw new Error('Unable to access a microphone stream.')
      }

      let nextWindowPermission: PermissionFlag = 'unsupported'

      if ('getScreenDetails' in window) {
        try {
          await window.getScreenDetails?.()
          nextWindowPermission = 'granted'
          setWindowPermission('granted')
          setMonitorMode('checking-window-management')
        } catch {
          nextWindowPermission = 'denied'
          setWindowPermission('denied')
          setMonitorMode('single-screen')
        }
      } else {
        nextWindowPermission = 'unsupported'
        setWindowPermission('unsupported')
        setMonitorMode('single-screen')
      }

      const windowReady = nextWindowPermission !== 'denied'

      setIsReady(!!stream && windowReady)
      setAppState('idle')
      setSupportMessage(
        'Microphone and window permissions are primed. Press Start JARVIS to open the launch windows and begin clap detection.',
      )
    } catch (error) {
      setMicPermission('denied')
      setRedirectPermission('unknown')
      const message =
        error instanceof Error ? error.message : 'Failed to prepare JARVIS.'
      setLastError(message)
      setAppState('error')
    }
  }

  async function handleStartJarvis() {
    if (hasLaunched) {
      setSupportMessage('Reset before arming JARVIS again.')
      return
    }

    if (!isReady) {
      setSupportMessage('Press Ready first so microphone and popup permissions are already primed.')
      return
    }

    setLastError('')
    setAppState('requesting_permissions')

    try {
      cleanupLaunchWindows(windowPrepRef.current)
      windowPrepRef.current = prepareLaunchWindows()
      setPopupState(windowPrepRef.current.status)

      const popupGranted = windowPrepRef.current.status !== 'blocked'
      setRedirectPermission(popupGranted ? 'granted' : 'denied')

      if (!popupGranted) {
        throw new Error('Popup windows were blocked. Allow popups, then press Start JARVIS again.')
      }

      refocusControlWindow()
      window.setTimeout(refocusControlWindow, 80)
      window.setTimeout(refocusControlWindow, 180)

      await startClapListening()
      setClapCount(0)
      setShowClapModal(true)
      setSupportMessage(
        'JARVIS is armed. After the double clap, the YouTube gaming channel will open on the left and ChatGPT on the right.',
      )
      setAppState('armed')

      if (!isRealtimeSupported) {
        setSupportMessage(SUPPORT_MESSAGES.realtimeUnsupported)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start JARVIS.'
      setLastError(message)
      setAppState('error')
    }
  }

  async function triggerJarvisSequence(source: 'double-clap' | 'test-launch') {
    if (hasLaunched) {
      return
    }

    const stream = streamRef.current

    if (!stream) {
      setLastError('A live microphone stream is required before launch.')
      setAppState('error')
      return
    }

    setHasLaunched(true)
    setShowClapModal(false)
    setAppState('launching')
    stopClapListening()

    try {
      const placement = await attemptWindowLaunch()
      setPopupState('opened')
      setMonitorMode(placement)
      setAppState('greeting')
      focusLaunchWindows(windowPrepRef.current)

      const greetingPromise = speakGreeting(greetingText)
      await initRealtimeVoiceSession(stream)
      await greetingPromise
      setAppState('voice_ready')
      startVoiceConversation()
      setSupportMessage(
        source === 'test-launch'
          ? 'Test launch completed. Realtime conversation is ready.'
          : 'JARVIS sequence completed. YouTube should be visible on the left and ChatGPT on the right.',
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Launch sequence failed.'
      setLastError(message)
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

  async function handleTestLaunch() {
    if (hasLaunched) {
      setSupportMessage('Reset before running the test launch again.')
      return
    }

    setLastError('')
    setAppState('requesting_permissions')

    try {
      if (!isReady) {
        await handleReady()
      }

      const stream = streamRef.current ?? (await requestMicPermission())
      if (!stream) {
        throw new Error('Unable to access microphone for test launch.')
      }

      setMicPermission('granted')
      cleanupLaunchWindows(windowPrepRef.current)
      windowPrepRef.current = prepareLaunchWindows()
      setPopupState(windowPrepRef.current.status)
      const popupGranted = windowPrepRef.current.status !== 'blocked'
      setRedirectPermission(popupGranted ? 'granted' : 'denied')

      if (!popupGranted) {
        throw new Error('Popup windows were blocked. Allow popups, then run the test launch again.')
      }

      await triggerJarvisSequence('test-launch')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Test launch failed.'
      setLastError(message)
      setAppState('error')
    }
  }

  async function handleStopListening() {
    stopClapListening()
    setShowClapModal(false)
    await stopVoiceConversation()
    setAppState('stopped')
    setSupportMessage('Voice conversation stopped. Reset to arm JARVIS again.')
  }

  function handleReset() {
    cleanupLaunchWindows(windowPrepRef.current)
    windowPrepRef.current = null
    stopClapListening()
    void stopVoiceConversation()
    releaseMicrophone()
    resetRealtimeVoice()
    setAppState('idle')
    setMicPermission('unknown')
    setRedirectPermission('unknown')
    setWindowPermission('unknown')
    setPopupState('idle')
    setMonitorMode('unknown')
    setSupportMessage('')
    setLastError('')
    setHasLaunched(false)
    setClapCount(0)
    setIsReady(false)
    setShowClapModal(false)
  }

  return (
    <main className="app-shell">
      {!bootComplete ? <BootSequence onComplete={() => setBootComplete(true)} /> : null}
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <section className={`hud-card${bootComplete ? ' hud-card-live' : ' hud-card-hidden'}`}>
        <div className="eyebrow">J.A.R.V.I.S — HALL OF ARMOR</div>
        <h1>STARK INDUSTRIES</h1>
        <p className="subtitle">
          {appState === 'armed' || appState === 'first_clap_detected'
            ? clapCount === 1
              ? '[ ONE MORE CLAP... ]'
              : '[ AWAITING DOUBLE CLAP ]'
            : 'ARMOR MANAGEMENT SYSTEM — MARK I THROUGH L'}
        </p>

        <SuitGallery />

        <ControlPanel
          appState={appState}
          hasLaunched={hasLaunched}
          isReady={isReady}
          onReady={handleReady}
          onReset={handleReset}
          onStart={handleStartJarvis}
          onStop={handleStopListening}
          onTestLaunch={handleTestLaunch}
        />

        {supportMessage && (
          <div className="inline-hints">
            <span className="hint active">{supportMessage}</span>
          </div>
        )}

        <StatusPanel items={statusItems} error={lastError} />
        <TranscriptPanel entries={transcriptEntries} />
      </section>
      {showClapModal ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="permission-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clap-modal-title"
          >
            <span className="support-label">Activation Armed</span>
            <h2 id="clap-modal-title">Clap twice to wake JARVIS.</h2>
            <p>
              Launch windows are now open. Keep this tab active, then clap two
              times in quick succession to continue. After activation, YouTube
              should appear on the left and ChatGPT should appear on the right.
            </p>
            <div className="modal-chip-row">
              <span className="modal-chip">Mic: {micPermission}</span>
              <span className="modal-chip">Redirect: {redirectPermission}</span>
              <span className="modal-chip">Window: {windowPermission}</span>
            </div>
            <button className="secondary modal-dismiss" onClick={() => setShowClapModal(false)}>
              Dismiss
            </button>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default App
