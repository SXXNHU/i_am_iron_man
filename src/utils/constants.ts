export const YOUTUBE_URL = 'https://www.youtube.com/watch?v=qRrElw4TSB4'
export const CHATGPT_URL = 'https://chatgpt.com'

export const GREETING_OPTIONS = {
  polished: 'Welcome back, boss. What are we building today?',
  formal: 'Welcome, sir. What shall we do today?',
} as const

export const DEFAULT_GREETING_KEY = 'polished'

export const GREETING_VOICE_HINTS = [
  'Google UK English Male',
  'Microsoft David',
  'Daniel',
  'Aaron',
] as const

export const CLAP_PEAK_THRESHOLD = 0.36
export const CLAP_ENERGY_FLOOR_MULTIPLIER = 2.8
export const CLAP_REFRACTORY_MS = 220
export const DOUBLE_CLAP_WINDOW_MS = 1200
export const CLAP_RESET_AFTER_MS = 1400
export const CLAP_ANALYZER_FFT_SIZE = 2048

export const WINDOW_MARGIN = 64
export const DEFAULT_SESSION_ENDPOINT = '/api/realtime-session'
export const REALTIME_MODEL = 'gpt-realtime'
export const REALTIME_VOICE = 'cedar'

export const REALTIME_SYSTEM_PROMPT = [
  'You are a sleek futuristic voice assistant inspired by a desktop aide.',
  'Speak concise, polished English.',
  'Be calm, efficient, slightly witty, and highly competent.',
  'Do not imitate copyrighted characters or use signature catchphrases.',
].join(' ')

export const STOP_LISTENING_PHRASES = ['stop listening', 'goodbye']

export const SUPPORT_MESSAGES = {
  audioAnalysisUnsupported:
    'Web Audio microphone analysis is unavailable in this browser.',
  realtimeUnsupported:
    'Realtime voice needs a Chromium-class browser with WebRTC and microphone support.',
}
