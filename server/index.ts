import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { createRealtimeSession } from './realtimeSession'

dotenv.config()

const app = express()
const port = Number(process.env.PORT ?? 8787)

app.use(
  cors({
    origin: true,
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/realtime-session', async (req, res) => {
  try {
    const session = await createRealtimeSession(req.body ?? {})
    res.status(200).json(session)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create realtime session.'
    res.status(500).json({ error: message })
  }
})

app.listen(port, () => {
  console.log(`JARVIS session server listening on http://localhost:${port}`)
})
