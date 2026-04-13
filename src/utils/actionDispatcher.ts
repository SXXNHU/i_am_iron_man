import type {
  VoiceCommandDispatchResult,
  VoiceCommandIntent,
} from '../types/voiceCommands'

export type VoiceCommandHandlers = Record<
  VoiceCommandIntent,
  () => Promise<VoiceCommandDispatchResult> | VoiceCommandDispatchResult
>

export async function dispatchVoiceCommandAction(
  intent: VoiceCommandIntent,
  handlers: VoiceCommandHandlers,
) {
  const handler = handlers[intent]
  return handler()
}
