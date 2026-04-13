export const YOUTUBE_FOLLOWUP_VIDEO_ID = 'BlNHLQVcoLQ'
export const YOUTUBE_INTRO_VIDEO_ID = 'LuuOpozKbvE'
export const YOUTUBE_SWAP_DELAY_MS = 7_000
export const CHATGPT_URL = 'https://chatgpt.com'
export const CHATGPT_PROMPT =
  "Wake up! Daddy's Home. Now, JARVIS, bring me the biggest headlines worldwide and at home."

export const GREETING_OPTIONS = {
  polished:
    'Welcome back, sir. All systems for gaming will be prepared in a few minutes. For now, feel free to grab a cup of coffee and have a good day.',
  formal:
    'Welcome back, sir. All systems for gaming will be prepared in a few minutes. For now, feel free to grab a cup of coffee and have a good day.',
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
export const VOICE_COMMAND_PREFIXES = ['jarvis', 'hey jarvis', 'ok jarvis']
export const VOICE_COMMAND_COOLDOWN_MS = 1500
export const VOICE_COMMAND_FILLER_WORDS = [
  'please',
  'can you',
  'could you',
  'would you',
  'for me',
  'right now',
]
export const VOICE_COMMAND_NEGATIONS = [
  "don't",
  'dont',
  'do not',
  'not',
  'never',
  'stop',
  'cancel',
]
export const VOICE_COMMAND_SEGMENT_BREAKS = [
  ' and ',
  ' then ',
  ' also ',
  ' but ',
  ',',
  ';',
] as const

export const VOICE_COMMAND_PHRASES = {
  openWeatherPanel: [
    'open weather panel',
    'show weather panel',
    'show weather',
    'open weather',
    'weather panel',
    'weather forecast',
    'bring up the weather panel',
    'pull up the weather panel',
  ],
  openBrowserWindow: [
    'open browser window',
    'open browser',
    'show browser window',
    'open chatgpt window',
    'open the browser window',
    'bring up the browser window',
  ],
  openBrowserPanel: [
    'open browser panel',
    'show browser panel',
    'open embedded browser',
    'show embedded browser',
    'show browser controls',
    'bring up browser controls',
  ],
  showTranscript: [
    'show transcript',
    'open transcript',
    'show transcript log',
    'open transcript log',
    'show the transcript',
    'pull up the transcript',
  ],
  hideTranscript: [
    'hide transcript',
    'close transcript',
    'hide transcript log',
    'close transcript log',
    'hide the transcript',
  ],
  startConversation: [
    'start conversation',
    'resume conversation',
    'start listening',
    'resume listening',
    'start voice',
    'wake up',
  ],
  stopConversation: [
    'stop conversation',
    'stop listening',
    'end conversation',
    'goodbye',
    'go silent',
  ],
} as const

export const ACTIVATION_MODE_HELP = {
  clap:
    'Prime permissions, then arm clap mode. Commands and conversation begin after the launch-trigger clap.',
  direct_voice:
    'Prime the microphone once, then start voice mode directly. Commands and conversation begin immediately.',
  manual:
    'Manual mode starts voice directly and favors explicit controls over cinematic launch behavior.',
} as const

export const WEATHER_DEFAULT_LOCATION = {
  label: 'Seoul fallback',
  latitude: 37.5665,
  longitude: 126.978,
}

export const SUPPORT_MESSAGES = {
  audioAnalysisUnsupported:
    'Web Audio microphone analysis is unavailable in this browser.',
  realtimeUnsupported:
    'Realtime voice needs a Chromium-class browser with WebRTC and microphone support.',
  popupBlocked:
    'Browser popup access is blocked. Use PRIME first and allow popups before opening browser windows by voice.',
  weatherUnavailable:
    'Weather data is temporarily unavailable. Retry or continue with normal conversation.',
}
