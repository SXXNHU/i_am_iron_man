import { createRealtimeSession } from '../server/realtimeSession.js'

type ApiRequest = {
  body?: Record<string, unknown>
  method?: string
}

type ApiResponse = {
  json: (body: unknown) => void
  status: (code: number) => ApiResponse
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const session = await createRealtimeSession(req.body ?? {})
    res.status(200).json(session)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create realtime session.'
    res.status(500).json({ error: message })
  }
}
