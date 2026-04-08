# JARVIS Mode Prototype

A Vite + React + TypeScript desktop web app that simulates a futuristic desktop aide activation flow:

1. Click `Start JARVIS`
2. Grant microphone access and keep popups allowed
3. Double clap to activate
4. Hear an instant greeting
5. Launch YouTube + ChatGPT windows
6. Continue with OpenAI Realtime API voice conversation over WebRTC

## Stack

- Vite + React + TypeScript
- Web Audio API for clap detection
- WebRTC + OpenAI Realtime API for voice conversation
- Node.js + Express for local session creation
- Vercel serverless function for deployment compatibility

## Environment

Create `.env` from `.env.example`:

```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=8787
```

## Run Locally

Install dependencies if needed:

```bash
npm install
```

Start the frontend and local session server together:

```bash
npm run dev
```

Useful scripts:

```bash
npm run dev:client
npm run dev:server
npm run build
npm run lint
```

The Vite dev server proxies `/api/*` to the local Express server on port `8787`.

## How It Works

- `Start JARVIS` requests microphone permission, pre-opens popup shells, and starts clap listening.
- Clap detection uses energy and peak analysis with configurable threshold, refractory period, double-clap window, and a rolling noise floor.
- After two valid claps:
  - the app speaks a deterministic greeting with `SpeechSynthesis`
  - attempts multi-screen placement with `window.getScreenDetails()`
  - falls back to single-screen left/right split if unsupported
  - initializes OpenAI Realtime voice over WebRTC

## Notes and Constraints

- Browser popup rules still apply. The app pre-opens blank windows during the user click to reduce blocking, but some browsers may still restrict window placement.
- Browser APIs cannot guarantee true OS-level snapping or exact desktop window management. The code only requests approximate position and size through browser-supported window controls.
- `window.getScreenDetails()` is currently limited to supported browsers and user permission. When unavailable, the app uses a single-screen split fallback.
- The greeting voice uses the browser's speech engine, so the exact timbre depends on the OS and installed voices.
- Realtime voice requires a valid OpenAI API key on the server. The browser never receives the long-lived secret key directly.

## Vercel Deployment

- Keep `OPENAI_API_KEY` in Vercel environment variables.
- The `api/realtime-session.ts` route can be deployed as a serverless function.
- The frontend remains static and calls `/api/realtime-session` on the same origin.
