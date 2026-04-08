declare const process: {
  env: Record<string, string | undefined>
}

type RealtimeRequestBody = {
  instructions?: string
  model?: string
  voice?: string
}

export async function createRealtimeSession(body: RealtimeRequestBody) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing.')
  }

  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: body.model,
        instructions: body.instructions,
        audio: {
          output: {
            voice: body.voice,
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`OpenAI session request failed: ${message}`)
  }

  const payload = (await response.json()) as {
    client_secret?: { value?: string; expires_at?: number }
  }

  const clientSecret = payload.client_secret?.value

  if (!clientSecret) {
    throw new Error('OpenAI did not return a realtime client secret.')
  }

  return {
    clientSecret,
    expiresAt: payload.client_secret?.expires_at ?? Date.now() + 60_000,
    model: body.model ?? 'gpt-realtime',
    voice: body.voice ?? 'cedar',
  }
}
