import { useEffect, useMemo, useRef, useState } from 'react'
import { BootSequence } from './components/BootSequence'
import { ControlPanel } from './components/ControlPanel'
import { HudShowcase } from './components/HudShowcase'
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
type PopupState =
  | 'idle'
  | 'prepared'
  | 'prepared-with-fallback'
  | 'blocked'
  | 'opened'
type GreetingKey = keyof typeof GREETING_OPTIONS

function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [micPermission, setMicPermission] =
    useState<MicPermissionState>('unknown')
  const [popupState, setPopupState] = useState<PopupState>('idle')
  const [monitorMode, setMonitorMode] = useState<MonitorMode>('unknown')
  const [greetingKey, setGreetingKey] = useState<GreetingKey>(DEFAULT_GREETING_KEY)
  const [supportMessage, setSupportMessage] = useState('')
  const [lastError, setLastError] = useState('')
  const [hasLaunched, setHasLaunched] = useState(false)
  const [clapCount, setClapCount] = useState(0)
  const [bootComplete, setBootComplete] = useState(false)
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

  useEffect(() => {
    let cancelled = false

    const requestMicOnEntry = async () => {
      try {
        const stream = await requestMicPermissionRef.current()

        if (cancelled || !stream) {
          return
        }

        setMicPermission('granted')
        setSupportMessage(
          'Microphone primed on entry. Start JARVIS to arm clap listening and popup launch.',
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        setMicPermission('denied')
        const message =
          error instanceof Error
            ? error.message
            : 'Microphone permission request failed on entry.'
        setSupportMessage(message)
      }
    }

    void requestMicOnEntry()

    return () => {
      cancelled = true
    }
  }, [])

  const statusItems = useMemo(
    () => [
      { label: 'State', value: appState },
      { label: 'Mic Permission', value: micPermission },
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
      micPermission,
      monitorMode,
      popupState,
      sessionStatus,
    ],
  )

  async function handleStartJarvis() {
    if (hasLaunched) {
      setSupportMessage('Reset before arming JARVIS again.')
      return
    }

    setLastError('')
    setSupportMessage(
      'Allow microphone access and keep popup permissions enabled for the launch sequence.',
    )
    setAppState('requesting_permissions')

    cleanupLaunchWindows(windowPrepRef.current)
    windowPrepRef.current = prepareLaunchWindows()
    setPopupState(windowPrepRef.current.status)

    try {
      const stream = await requestMicPermission()
      setMicPermission('granted')

      if (!stream) {
        throw new Error('Unable to access a microphone stream.')
      }

      await startClapListening()
      setClapCount(0)
      setAppState('armed')
      setMonitorMode(
        'getScreenDetails' in window
          ? 'checking-window-management'
          : 'single-screen',
      )

      if (!isRealtimeSupported) {
        setSupportMessage(SUPPORT_MESSAGES.realtimeUnsupported)
      }
    } catch (error) {
      setMicPermission('denied')
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
    setAppState('launching')
    stopClapListening()

    try {
      const placement = await attemptWindowLaunch()
      setPopupState('opened')
      setMonitorMode(placement)
      setAppState('greeting')
      focusLaunchWindows(windowPrepRef.current)

      const greetingPromise = speakGreeting(GREETING_OPTIONS[greetingKey])
      await initRealtimeVoiceSession(stream)
      await greetingPromise
      setAppState('voice_ready')
      startVoiceConversation()
      setSupportMessage(
        source === 'test-launch'
          ? 'Test launch completed. Realtime conversation is ready.'
          : 'JARVIS sequence completed. Hands-free conversation is active.',
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
    cleanupLaunchWindows(windowPrepRef.current)
    windowPrepRef.current = prepareLaunchWindows()
    setPopupState(windowPrepRef.current.status)

    try {
      const stream = streamRef.current ?? (await requestMicPermission())
      if (!stream) {
        throw new Error('Unable to access microphone for test launch.')
      }

      setMicPermission('granted')
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
    setPopupState('idle')
    setMonitorMode('unknown')
    setSupportMessage('')
    setLastError('')
    setHasLaunched(false)
    setClapCount(0)
  }

  return (
    <main className="app-shell">
      {!bootComplete ? <BootSequence onComplete={() => setBootComplete(true)} /> : null}
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <section className={`hud-card${bootComplete ? ' hud-card-live' : ' hud-card-hidden'}`}>
        <div className="eyebrow">Desktop Activation Prototype</div>
        <h1>JARVIS MODE</h1>
        <p className="subtitle">
          Double clap to wake your desktop assistant.
        </p>

        <HudShowcase
          appState={appState}
          assistantResponse={assistantResponse}
          clapCount={clapCount}
          connectionStatus={connectionStatus}
          currentTranscript={currentTranscript}
        />

        <div className="support-grid">
          <div className="support-callout">
            <span className="support-label">Popup Notice</span>
            <p>
              For the split-window launch to work reliably, allow popups when
              you click <strong>Start JARVIS</strong>.
            </p>
          </div>
          <div className="support-callout">
            <span className="support-label">Greeting</span>
            <select
              className="voice-select"
              value={greetingKey}
              onChange={(event) =>
                setGreetingKey(event.target.value as GreetingKey)
              }
            >
              {Object.entries(GREETING_OPTIONS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ControlPanel
          appState={appState}
          hasLaunched={hasLaunched}
          onReset={handleReset}
          onStart={handleStartJarvis}
          onStop={handleStopListening}
          onTestLaunch={handleTestLaunch}
        />

        <div className="inline-hints">
          <span className={clapCount === 1 ? 'hint active' : 'hint'}>
            {clapCount === 1 ? 'One more clap...' : 'Awaiting double clap'}
          </span>
          <span className="hint">
            {supportMessage ||
              'Realtime voice uses WebRTC with a server-issued session token.'}
          </span>
        </div>

        <StatusPanel items={statusItems} error={lastError} />
        <TranscriptPanel entries={transcriptEntries} />
      </section>
    </main>
  )
}

export default App
