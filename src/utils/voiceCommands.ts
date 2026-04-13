import {
  STOP_LISTENING_PHRASES,
  VOICE_COMMAND_FILLER_WORDS,
  VOICE_COMMAND_NEGATIONS,
  VOICE_COMMAND_PHRASES,
  VOICE_COMMAND_PREFIXES,
  VOICE_COMMAND_SEGMENT_BREAKS,
} from './constants'
import type { VoiceCommandIntent, VoiceCommandMatch } from '../types/voiceCommands'

const COMMAND_PHRASE_MAP: Array<{
  intent: VoiceCommandIntent
  phrases: readonly string[]
}> = [
  { intent: 'open_weather_panel', phrases: VOICE_COMMAND_PHRASES.openWeatherPanel },
  { intent: 'open_browser_window', phrases: VOICE_COMMAND_PHRASES.openBrowserWindow },
  { intent: 'open_browser_panel', phrases: VOICE_COMMAND_PHRASES.openBrowserPanel },
  { intent: 'show_transcript', phrases: VOICE_COMMAND_PHRASES.showTranscript },
  { intent: 'hide_transcript', phrases: VOICE_COMMAND_PHRASES.hideTranscript },
  { intent: 'start_conversation', phrases: VOICE_COMMAND_PHRASES.startConversation },
  {
    intent: 'stop_conversation',
    phrases: [...VOICE_COMMAND_PHRASES.stopConversation, ...STOP_LISTENING_PHRASES],
  },
]

function collapseWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

export function normalizeTranscript(text: string) {
  let normalized = collapseWhitespace(text.toLowerCase())

  for (const prefix of VOICE_COMMAND_PREFIXES) {
    if (normalized === prefix) {
      return ''
    }

    if (normalized.startsWith(`${prefix} `)) {
      normalized = normalized.slice(prefix.length).trim()
      break
    }

    if (normalized.startsWith(`${prefix},`)) {
      normalized = normalized.slice(prefix.length + 1).trim()
      break
    }
  }

  for (const filler of VOICE_COMMAND_FILLER_WORDS) {
    normalized = collapseWhitespace(normalized.replaceAll(filler, ' '))
  }

  return normalized
}

function splitSegments(normalizedText: string) {
  let working = normalizedText

  for (const separator of VOICE_COMMAND_SEGMENT_BREAKS) {
    working = working.replaceAll(separator, '|')
  }

  return working
    .split('|')
    .map((segment) => collapseWhitespace(segment))
    .filter(Boolean)
}

function isNegated(segment: string, matchedPhrase: string) {
  const index = segment.indexOf(matchedPhrase)

  if (index === -1) {
    return false
  }

  const prefix = collapseWhitespace(segment.slice(0, index))
  const nearbyPrefix = prefix.split(' ').slice(-3).join(' ')

  return VOICE_COMMAND_NEGATIONS.some(
    (negation) => nearbyPrefix.endsWith(negation) || segment.includes(`${negation} ${matchedPhrase}`),
  )
}

function findSegmentMatch(segment: string): VoiceCommandMatch | null {
  for (const { intent, phrases } of COMMAND_PHRASE_MAP) {
    for (const phrase of phrases) {
      if (segment === phrase || segment.startsWith(`${phrase} `) || segment.includes(phrase)) {
        if (isNegated(segment, phrase)) {
          return null
        }

        return {
          intent,
          matchedPhrase: phrase,
          normalizedText: segment,
          segment,
        }
      }
    }
  }

  return null
}

export function matchVoiceCommand(text: string): VoiceCommandMatch | null {
  const normalizedText = normalizeTranscript(text)

  if (!normalizedText) {
    return null
  }

  const segments = splitSegments(normalizedText)
  const matches = segments
    .map((segment) => findSegmentMatch(segment))
    .filter((match): match is VoiceCommandMatch => !!match)

  if (matches.length === 0) {
    return null
  }

  if (matches.length > 1) {
    return {
      ...matches[0],
      ambiguityReason: 'multiple-command-segments',
      normalizedText,
    }
  }

  const [match] = matches
  const leftoverSegments = segments.filter((segment) => segment !== match.segment)

  if (leftoverSegments.length > 0) {
    return {
      ...match,
      ambiguityReason: 'mixed-command-and-conversation',
      normalizedText,
    }
  }

  return {
    ...match,
    normalizedText,
  }
}
