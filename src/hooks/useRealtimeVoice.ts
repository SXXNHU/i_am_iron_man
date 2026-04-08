import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_SESSION_ENDPOINT,
  REALTIME_MODEL,
  REALTIME_SYSTEM_PROMPT,
  REALTIME_VOICE,
  STOP_LISTENING_PHRASES,
} from '../utils/constants'

export type TranscriptEntryRole =
  | 'assistant'
  | 'user'
  | 'event'
  | 'error'
  | 'system'

export type TranscriptEntry = {
  id: string
  role: TranscriptEntryRole
  text: string
  timestamp: number
}

type RealtimeState = 'idle' | 'preparing' | 'ready' | 'active' | 'stopped' | 'error'

type RealtimeSessionPayload = {
  clientSecret: string
  expiresAt: number
  model: string
  voice: string
}

type UseRealtimeVoiceOptions = {
  onError: (message: string) => void
  onStateChange: (state: 'voice_ready' | 'conversation_active' | 'stopped') => void
  onStopRequested: (reason: string) => void
}

export function useRealtimeVoice({
  onError,
  onStateChange,
  onStopRequested,
}: UseRealtimeVoiceOptions) {
  const [connectionStatus, setConnectionStatus] = useState('idle')
  const [sessionStatus, setSessionStatus] = useState<RealtimeState>('idle')
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [assistantResponse, setAssistantResponse] = useState('')
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([])
  const [error, setError] = useState('')

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const bufferedAssistantRef = useRef('')

  const isSupported =
    typeof window !== 'undefined' &&
    !!window.RTCPeerConnection &&
    !!navigator.mediaDevices?.getUserMedia

  function appendEntry(role: TranscriptEntryRole, text: string) {
    setTranscriptEntries((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}-${role}`,
        role,
        text,
        timestamp: Date.now(),
      },
    ])
  }

  async function initRealtimeVoiceSession(stream: MediaStream) {
    if (!isSupported) {
      throw new Error('Realtime voice requires WebRTC-capable browser support.')
    }

    if (peerConnectionRef.current) {
      return
    }

    setSessionStatus('preparing')
    setConnectionStatus('requesting-session')
    streamRef.current = stream

    try {
      const session = await createRealtimeSession()
      appendEntry(
        'system',
        `Realtime session prepared for ${session.model}. Expires at ${new Date(
          session.expiresAt,
        ).toLocaleTimeString()}.`,
      )

      const peer = new RTCPeerConnection()
      peerConnectionRef.current = peer

      peer.onconnectionstatechange = () => {
        setConnectionStatus(peer.connectionState)

        if (peer.connectionState === 'failed') {
          reportError('Realtime peer connection failed.')
        }
      }

      peer.ontrack = (event) => {
        if (!remoteAudioRef.current) {
          return
        }

        remoteAudioRef.current.srcObject = event.streams[0]
      }

      for (const track of stream.getAudioTracks()) {
        track.enabled = false
        peer.addTrack(track, stream)
      }

      const dataChannel = peer.createDataChannel('oai-events')
      dataChannelRef.current = dataChannel
      dataChannel.onopen = () => {
        setConnectionStatus('data-channel-open')
        // Server VAD keeps the experience hands-free once the mic track is enabled.
        sendClientEvent({
          type: 'session.update',
          session: {
            instructions: REALTIME_SYSTEM_PROMPT,
            voice: session.voice,
            modalities: ['text', 'audio'],
            input_audio_transcription: {
              model: 'gpt-4o-mini-transcribe',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.55,
              silence_duration_ms: 650,
              prefix_padding_ms: 250,
              create_response: true,
              interrupt_response: true,
            },
          },
        })
      }
      dataChannel.onmessage = (event) => handleServerEvent(event.data)
      dataChannel.onerror = () => reportError('Realtime data channel reported an error.')

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      const answerSdp = await exchangeSdp(
        offer.sdp ?? '',
        session.clientSecret,
        session.model,
      )
      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      setSessionStatus('ready')
      onStateChange('voice_ready')
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unable to initialize realtime voice.'
      reportError(message)
      throw caught
    }
  }

  function startVoiceConversation() {
    if (!streamRef.current) {
      return
    }

    for (const track of streamRef.current.getAudioTracks()) {
      track.enabled = true
    }

    setSessionStatus('active')
    appendEntry('system', 'Conversation is live. Listening hands-free.')
    onStateChange('conversation_active')
  }

  async function stopVoiceConversation() {
    if (streamRef.current) {
      for (const track of streamRef.current.getAudioTracks()) {
        track.enabled = false
      }
    }

    dataChannelRef.current?.close()
    dataChannelRef.current = null
    peerConnectionRef.current?.close()
    peerConnectionRef.current = null

    setConnectionStatus('closed')
    setSessionStatus('stopped')
    onStateChange('stopped')
  }

  function resetRealtimeVoice() {
    bufferedAssistantRef.current = ''
    setConnectionStatus('idle')
    setSessionStatus('idle')
    setCurrentTranscript('')
    setAssistantResponse('')
    setTranscriptEntries([])
    setError('')
  }

  function sendClientEvent(payload: Record<string, unknown>) {
    if (dataChannelRef.current?.readyState !== 'open') {
      return
    }

    dataChannelRef.current.send(JSON.stringify(payload))
  }

  function handleServerEvent(raw: string) {
    let event: Record<string, unknown>

    try {
      event = JSON.parse(raw) as Record<string, unknown>
    } catch {
      appendEntry('event', raw)
      return
    }

    const type = typeof event.type === 'string' ? event.type : 'unknown'

    switch (type) {
      case 'session.created':
        appendEntry('system', 'Realtime session created.')
        break
      case 'response.audio_transcript.delta': {
        const delta = typeof event.delta === 'string' ? event.delta : ''
        bufferedAssistantRef.current += delta
        setAssistantResponse(bufferedAssistantRef.current)
        break
      }
      case 'response.audio_transcript.done':
      case 'response.text.done': {
        const text =
          typeof event.transcript === 'string'
            ? event.transcript
            : typeof event.text === 'string'
              ? event.text
              : bufferedAssistantRef.current

        if (text) {
          setAssistantResponse(text)
          appendEntry('assistant', text)
          bufferedAssistantRef.current = ''
        }
        break
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const transcript =
          typeof event.transcript === 'string' ? event.transcript.trim() : ''
        if (transcript) {
          setCurrentTranscript(transcript)
          appendEntry('user', transcript)

          const normalized = transcript.toLowerCase()
          if (STOP_LISTENING_PHRASES.some((phrase) => normalized.includes(phrase))) {
            onStopRequested('Voice session stopped after hearing a stop command.')
          }
        }
        break
      }
      case 'error': {
        const payload = event.error as { message?: string } | undefined
        reportError(payload?.message ?? 'Realtime API returned an error event.')
        break
      }
      default:
        appendEntry('event', type)
    }
  }

  async function createRealtimeSession() {
    const response = await fetch(DEFAULT_SESSION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: REALTIME_MODEL,
        voice: REALTIME_VOICE,
        instructions: REALTIME_SYSTEM_PROMPT,
      }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null

      throw new Error(payload?.error ?? 'Failed to create realtime session token.')
    }

    return (await response.json()) as RealtimeSessionPayload
  }

  async function exchangeSdp(sdp: string, clientSecret: string, model: string) {
    // The browser never receives the long-lived API key, only the short-lived client secret from our server.
    const response = await fetch(
      `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: sdp,
      },
    )

    if (!response.ok) {
      throw new Error('Realtime SDP exchange failed.')
    }

    return response.text()
  }

  function reportError(message: string) {
    setError(message)
    setSessionStatus('error')
    appendEntry('error', message)
    onError(message)
  }

  useEffect(() => {
    remoteAudioRef.current = new Audio()
    remoteAudioRef.current.autoplay = true

    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getAudioTracks()) {
          track.enabled = false
        }
      }

      dataChannelRef.current?.close()
      dataChannelRef.current = null
      peerConnectionRef.current?.close()
      peerConnectionRef.current = null
    }
  }, [])

  return {
    assistantResponse,
    connectionStatus,
    currentTranscript,
    error,
    initRealtimeVoiceSession,
    isSupported,
    resetRealtimeVoice,
    sessionStatus,
    startVoiceConversation,
    stopVoiceConversation,
    transcriptEntries,
  }
}
