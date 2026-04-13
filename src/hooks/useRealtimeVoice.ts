import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_SESSION_ENDPOINT,
  REALTIME_MODEL,
  REALTIME_SYSTEM_PROMPT,
  REALTIME_VOICE,
} from '../utils/constants'
import type { UserTranscriptMeta } from '../types/voiceCommands'

export type TranscriptEntryRole =
  | 'assistant'
  | 'user'
  | 'event'
  | 'error'
  | 'system'

export type TranscriptEntry = {
  debug?: boolean
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
  debugMode?: boolean
  onError: (message: string) => void
  onStateChange: (state: 'voice_ready' | 'conversation_active' | 'stopped') => void
  onUserTranscriptFinal?: (text: string, meta: UserTranscriptMeta) => void
}

export function useRealtimeVoice({
  debugMode = false,
  onError,
  onStateChange,
  onUserTranscriptFinal,
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
  const transcriptMetaCounterRef = useRef(0)
  const allowedResponseIdRef = useRef<string | null>(null)
  const currentResponseIdRef = useRef<string | null>(null)
  const suppressedResponseIdsRef = useRef<Set<string>>(new Set())
  const pendingAssistantResponseRequestRef = useRef(false)
  const cancelNextCreatedResponseRef = useRef(false)

  const isSupported =
    typeof window !== 'undefined' &&
    !!window.RTCPeerConnection &&
    !!navigator.mediaDevices?.getUserMedia

  function appendEntry(role: TranscriptEntryRole, text: string, debug = false) {
    setTranscriptEntries((current) => [
      ...current,
      {
        debug,
        id: `${Date.now()}-${current.length}-${role}`,
        role,
        text,
        timestamp: Date.now(),
      },
    ])
  }

  function appendDebugEntry(text: string) {
    if (!debugMode) {
      return
    }

    appendEntry('event', text, true)
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
            audio: {
              input: {
                transcription: {
                  model: 'gpt-4o-mini-transcribe',
                },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.55,
                  silence_duration_ms: 650,
                  prefix_padding_ms: 250,
                  create_response: false,
                  interrupt_response: true,
                },
              },
              output: {
                voice: session.voice,
              },
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
    resetResponseTracking()
  }

  function cancelAssistantResponse() {
    const currentResponseId = currentResponseIdRef.current

    if (currentResponseId) {
      suppressedResponseIdsRef.current.add(currentResponseId)
      appendDebugEntry(`cancel local response_id=${currentResponseId} source=current`)
      sendClientEvent({ type: 'response.cancel', response_id: currentResponseId })
    } else {
      cancelNextCreatedResponseRef.current = true
      appendDebugEntry('cancel local response_id=pending-next-created')
      sendClientEvent({ type: 'response.cancel' })
    }

    sendClientEvent({ type: 'output_audio_buffer.clear' })
    bufferedAssistantRef.current = ''
    setAssistantResponse('')
  }

  function requestAssistantResponse() {
    pendingAssistantResponseRequestRef.current = true
    cancelNextCreatedResponseRef.current = false
    allowedResponseIdRef.current = null
    appendDebugEntry('request response.create pending=true')
    sendClientEvent({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
      },
    })
  }

  function appendLocalTranscriptEntry(role: TranscriptEntryRole, text: string) {
    appendEntry(role, text)
  }

  function resetResponseTracking() {
    appendDebugEntry(
      `tracking reset allowed=${allowedResponseIdRef.current ?? 'none'} active=${currentResponseIdRef.current ?? 'none'} suppressed=${suppressedResponseIdsRef.current.size}`,
    )
    allowedResponseIdRef.current = null
    currentResponseIdRef.current = null
    pendingAssistantResponseRequestRef.current = false
    cancelNextCreatedResponseRef.current = false
    suppressedResponseIdsRef.current.clear()
    bufferedAssistantRef.current = ''
    setAssistantResponse('')
  }

  function extractResponseId(event: Record<string, unknown>) {
    if (typeof event.response_id === 'string') {
      return event.response_id
    }

    const response = event.response as { id?: string } | undefined
    if (typeof response?.id === 'string') {
      return response.id
    }

    return null
  }

  function isSuppressedResponse(responseId: string | null) {
    if (!responseId) {
      return false
    }

    return suppressedResponseIdsRef.current.has(responseId)
  }

  function markResponseComplete(responseId: string | null) {
    if (!responseId) {
      return
    }

    appendDebugEntry(
      `response complete response_id=${responseId} allowed=${allowedResponseIdRef.current === responseId} suppressed=${suppressedResponseIdsRef.current.has(responseId)}`,
    )

    if (currentResponseIdRef.current === responseId) {
      currentResponseIdRef.current = null
    }

    if (allowedResponseIdRef.current === responseId) {
      allowedResponseIdRef.current = null
    }

    suppressedResponseIdsRef.current.delete(responseId)
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
    const responseId = extractResponseId(event)

    switch (type) {
      case 'session.created':
        appendEntry('system', 'Realtime session created.')
        break
      case 'response.created': {
        if (responseId) {
          currentResponseIdRef.current = responseId
          appendDebugEntry(
            `response.created response_id=${responseId} pending=${pendingAssistantResponseRequestRef.current} cancel_next=${cancelNextCreatedResponseRef.current}`,
          )

          if (cancelNextCreatedResponseRef.current) {
            suppressedResponseIdsRef.current.add(responseId)
            cancelNextCreatedResponseRef.current = false
            appendDebugEntry(`response suppress response_id=${responseId} reason=cancel-next-created`)
            sendClientEvent({ type: 'response.cancel', response_id: responseId })
            sendClientEvent({ type: 'output_audio_buffer.clear' })
            break
          }

          if (pendingAssistantResponseRequestRef.current) {
            allowedResponseIdRef.current = responseId
            pendingAssistantResponseRequestRef.current = false
            appendDebugEntry(`response allow response_id=${responseId}`)
          } else {
            suppressedResponseIdsRef.current.add(responseId)
            appendDebugEntry(`response suppress response_id=${responseId} reason=unsolicited`)
          }
        }
        break
      }
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta': {
        if (
          isSuppressedResponse(responseId) ||
          (allowedResponseIdRef.current && responseId !== allowedResponseIdRef.current)
        ) {
          if (responseId) {
            appendDebugEntry(`response delta ignored response_id=${responseId}`)
          }
          break
        }

        const delta = typeof event.delta === 'string' ? event.delta : ''
        bufferedAssistantRef.current += delta
        setAssistantResponse(bufferedAssistantRef.current)
        break
      }
      case 'response.output_audio_transcript.done':
      case 'response.output_text.done':
      case 'response.audio_transcript.done':
      case 'response.text.done': {
        if (
          isSuppressedResponse(responseId) ||
          (allowedResponseIdRef.current && responseId !== allowedResponseIdRef.current)
        ) {
          if (responseId) {
            appendDebugEntry(`response done ignored response_id=${responseId}`)
          }
          bufferedAssistantRef.current = ''
          setAssistantResponse('')
          markResponseComplete(responseId)
          break
        }

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
      case 'response.output_item.done':
      case 'response.output_audio.done':
      case 'response.done':
        markResponseComplete(responseId)
        break
      case 'conversation.item.input_audio_transcription.completed': {
        const transcript =
          typeof event.transcript === 'string' ? event.transcript.trim() : ''
        if (transcript) {
          setCurrentTranscript(transcript)
          appendEntry('user', transcript)
          transcriptMetaCounterRef.current += 1
          onUserTranscriptFinal?.(transcript, {
            source: 'realtime_final',
            timestamp: transcriptMetaCounterRef.current,
          })
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
    const suppressedResponseIds = suppressedResponseIdsRef.current

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
      allowedResponseIdRef.current = null
      currentResponseIdRef.current = null
      pendingAssistantResponseRequestRef.current = false
      cancelNextCreatedResponseRef.current = false
      suppressedResponseIds.clear()
      bufferedAssistantRef.current = ''
    }
  }, [])

  return {
    assistantResponse,
    connectionStatus,
    cancelAssistantResponse,
    currentTranscript,
    error,
    initRealtimeVoiceSession,
    isSupported,
    appendLocalTranscriptEntry,
    requestAssistantResponse,
    resetRealtimeVoice,
    sessionStatus,
    startVoiceConversation,
    stopVoiceConversation,
    transcriptEntries,
  }
}
