import { useEffect, useRef, useState } from 'react'

type MicState = 'idle' | 'requesting' | 'ready' | 'muted' | 'released' | 'error'

export function useSharedMicrophone() {
  const [micState, setMicState] = useState<MicState>('idle')
  const [error, setError] = useState('')
  const streamRef = useRef<MediaStream | null>(null)

  const isSupported =
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia

  async function ensureMicrophone() {
    if (!isSupported) {
      throw new Error('This browser does not support microphone capture.')
    }

    if (streamRef.current && streamRef.current.active) {
      return streamRef.current
    }

    setMicState('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream
      setError('')
      setMicState('ready')
      return stream
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Microphone permission failed.'
      setError(message)
      setMicState('error')
      throw new Error(message)
    }
  }

  function muteTracks() {
    if (!streamRef.current) {
      return
    }

    for (const track of streamRef.current.getAudioTracks()) {
      track.enabled = false
    }

    setMicState('muted')
  }

  function unmuteTracks() {
    if (!streamRef.current) {
      return
    }

    for (const track of streamRef.current.getAudioTracks()) {
      track.enabled = true
    }

    setMicState('ready')
  }

  function releaseMicrophone() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
    }

    streamRef.current = null
    setMicState('released')
  }

  useEffect(() => {
    return () => {
      releaseMicrophone()
    }
  }, [])

  return {
    ensureMicrophone,
    error,
    isSupported,
    micState,
    muteTracks,
    releaseMicrophone,
    streamRef,
    unmuteTracks,
  }
}
