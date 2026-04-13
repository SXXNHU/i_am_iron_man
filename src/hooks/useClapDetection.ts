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
  getStream: () => Promise<MediaStream>
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
  getStream,
  onFirstClap,
  onDoubleClap,
}: UseClapDetectionOptions) {
  const [analyzerState, setAnalyzerState] = useState<AnalyzerState>('idle')
  const [error, setError] = useState('')
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const silenceGainRef = useRef<GainNode | null>(null)
  const noiseFloorRef = useRef(0.012)
  const firstClapAtRef = useRef<number | null>(null)
  const lastAcceptedPeakAtRef = useRef(0)

  const isSupported =
    typeof window !== 'undefined' &&
    !!window.AudioContext &&
    !!navigator.mediaDevices?.getUserMedia

  async function startClapListening() {
    if (!isSupported) {
      throw new Error('This browser does not support Web Audio microphone access.')
    }

    let stream: MediaStream

    try {
      stream = await getStream()
      setError('')
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Microphone permission failed.'
      setError(message)
      throw new Error(message)
    }

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

    if (!processorRef.current) {
      const silenceGain =
        silenceGainRef.current ?? audioContext.createGain()
      silenceGain.gain.value = 0
      silenceGainRef.current = silenceGain

      const processor = audioContext.createScriptProcessor(
        CLAP_ANALYZER_FFT_SIZE,
        1,
        1,
      )

      processor.onaudioprocess = (event) => {
        const samples = event.inputBuffer.getChannelData(0)
        const result = detectClap(
          samples,
          noiseFloorRef.current,
          CLAP_PEAK_THRESHOLD,
        )

        noiseFloorRef.current = noiseFloorRef.current * 0.92 + result.rms * 0.08

        const now = performance.now()
        const elapsedSincePeak = now - lastAcceptedPeakAtRef.current
        const firstClapAt = firstClapAtRef.current

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
      }

      sourceRef.current.connect(processor)
      processor.connect(silenceGain)
      silenceGain.connect(audioContext.destination)
      processorRef.current = processor
    }

    setAnalyzerState('listening')
  }

  function stopClapListening() {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current.onaudioprocess = null
      processorRef.current = null
    }

    if (silenceGainRef.current) {
      silenceGainRef.current.disconnect()
      silenceGainRef.current = null
    }

    setAnalyzerState('stopped')
  }

  function resetClapDetection() {
    firstClapAtRef.current = null
    lastAcceptedPeakAtRef.current = 0
    noiseFloorRef.current = 0.012
    setError('')
    setAnalyzerState('idle')
  }

  useEffect(() => {
    return () => {
      stopClapListening()
    }
  }, [])

  return {
    analyzerState,
    error,
    isSupported,
    startClapListening,
    stopClapListening,
    resetClapDetection,
  }
}
