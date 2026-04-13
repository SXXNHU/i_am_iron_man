export type VoiceCommandIntent =
  | 'open_weather_panel'
  | 'open_browser_window'
  | 'open_browser_panel'
  | 'show_transcript'
  | 'hide_transcript'
  | 'start_conversation'
  | 'stop_conversation'

export type VoiceCommandMatch = {
  ambiguityReason?: string
  intent: VoiceCommandIntent
  matchedPhrase: string
  normalizedText: string
  segment: string
}

export type UserTranscriptMeta = {
  timestamp: number
  source: 'realtime_final'
}

export type VoiceCommandDispatchResult = {
  handled: boolean
  message?: string
}
