import { GREETING_VOICE_HINTS } from './constants'

function pickVoice() {
  const voices = window.speechSynthesis.getVoices()

  return (
    voices.find((voice) =>
      GREETING_VOICE_HINTS.some((hint) =>
        voice.name.toLowerCase().includes(hint.toLowerCase()),
      ),
    ) ??
    voices.find((voice) => voice.lang.startsWith('en')) ??
    null
  )
}

export function speakGreeting(text: string) {
  if (!('speechSynthesis' in window)) {
    return Promise.resolve()
  }

  window.speechSynthesis.cancel()

  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text)
    const selectedVoice = pickVoice()

    if (selectedVoice) {
      utterance.voice = selectedVoice
      utterance.lang = selectedVoice.lang
    } else {
      utterance.lang = 'en-US'
    }

    utterance.pitch = 0.88
    utterance.rate = 0.94
    utterance.volume = 1
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()

    window.speechSynthesis.speak(utterance)
  })
}
