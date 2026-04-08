import { useEffect, useRef, useState } from 'react'
import {
  CLAP_ANALYZER_FFT_SIZE,
  CLAP_ENERGY_FLOOR_MULTIPLIER,
  CLAP_PEAK_THRESHOLD,
  CLAP_REFRACTORY_MS,
  CLAP_RESET_AFTER_MS,
  DOUBLE_CLAP_WINDOW_MS,
} from '../utils/constants'

type UseClapDetectionOptions = {
  onFirstClap: () => void
  onDoubleClap: () => void
}

type AnalyzerState = 'idle' | 'listening' | 'stopped'

export function detectClap(
  samples: Float32Array,
  noiseFloor: number,
  peakThreshold: number,
) {
  let peak = 0
  let sumSquares = 0

  for (const sample of samples) {
    const magnitude = Math.abs(sample)
    peak = Math.max(peak, magnitude)
    sumSquares += sample * sample
  }

  const rms = Math.sqrt(sumSquares / samples.length)
  const dynamicThreshold = Math.max(
    peakThreshold,
    noiseFloor * CLAP_ENERGY_FLOOR_MULTIPLIER,
  )

  return {
    rms,
    peak,
    isClapLike: peak >= dynamicThreshold && rms >= noiseFloor * 1.25,
  }
}

export function useClapDetection({
  onFirstClap,
  onDoubleClap,
}: UseClapDetectionOptions) {
  const [analyzerState, setAnalyzerState] = useState<AnalyzerState>('idle')
  const [error, setError] = useState('')
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const noiseFloorRef = useRef(0.012)
  const firstClapAtRef = useRef<number | null>(null)
  const lastAcceptedPeakAtRef = useRef(0)

  const isSupported =
    typeof window !== 'undefined' &&
    !!window.AudioContext &&
    !!navigator.mediaDevices?.getUserMedia

  async function requestMicPermission() {
    if (!isSupported) {
      throw new Error('This browser does not support Web Audio microphone access.')
    }

    if (streamRef.current) {
      return streamRef.current
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream
      return stream
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Microphone permission failed.'
      setError(message)
      throw new Error(message)
    }
  }

  async function startClapListening() {
    const stream = await requestMicPermission()
    const AudioContextCtor = window.AudioContext
    const audioContext =
      audioContextRef.current ?? new AudioContextCtor({ latencyHint: 'interactive' })

    audioContextRef.current = audioContext

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    if (!sourceRef.current) {
      sourceRef.current = audioContext.createMediaStreamSource(stream)
    }

    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser()
      analyserRef.current.fftSize = CLAP_ANALYZER_FFT_SIZE
      analyserRef.current.smoothingTimeConstant = 0.14
      sourceRef.current.connect(analyserRef.current)
    }

    setAnalyzerState('listening')
    analyze()
  }

  function analyze() {
    if (!analyserRef.current) {
      return
    }

    const samples = new Float32Array(analyserRef.current.fftSize)

    const tick = () => {
      if (!analyserRef.current) {
        return
      }

      analyserRef.current.getFloatTimeDomainData(samples)
      const result = detectClap(samples, noiseFloorRef.current, CLAP_PEAK_THRESHOLD)

      noiseFloorRef.current = noiseFloorRef.current * 0.92 + result.rms * 0.08

      const now = performance.now()
      const elapsedSincePeak = now - lastAcceptedPeakAtRef.current
      const firstClapAt = firstClapAtRef.current

      // Treat only sharp, isolated spikes as claps so speech and keyboard noise are less likely to trigger.
      if (result.isClapLike && elapsedSincePeak >= CLAP_REFRACTORY_MS) {
        lastAcceptedPeakAtRef.current = now

        if (!firstClapAt || now - firstClapAt > DOUBLE_CLAP_WINDOW_MS) {
          firstClapAtRef.current = now
          onFirstClap()
        } else {
          firstClapAtRef.current = null
          onDoubleClap()
        }
      }

      if (firstClapAt && now - firstClapAt > CLAP_RESET_AFTER_MS) {
        firstClapAtRef.current = null
      }

      rafRef.current = window.requestAnimationFrame(tick)
    }

    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = window.requestAnimationFrame(tick)
  }

  function stopClapListening() {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    setAnalyzerState('stopped')
  }

  function stopStreamTracks() {
    if (!streamRef.current) {
      return
    }

    for (const track of streamRef.current.getTracks()) {
      track.stop()
    }

    streamRef.current = null
  }

  function resetClapDetection() {
    firstClapAtRef.current = null
    lastAcceptedPeakAtRef.current = 0
    noiseFloorRef.current = 0.012
    setError('')
    setAnalyzerState('idle')
  }

  function releaseMicrophone() {
    stopClapListening()
    stopStreamTracks()
    resetClapDetection()
  }

  useEffect(() => {
    return () => {
      stopClapListening()
      stopStreamTracks()
    }
  }, [])

  return {
    analyzerState,
    error,
    isSupported,
    streamRef,
    requestMicPermission,
    releaseMicrophone,
    startClapListening,
    stopClapListening,
    resetClapDetection,
  }
}
