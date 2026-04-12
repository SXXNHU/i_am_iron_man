# Tony Stark

Iron Man-inspired JARVIS activation experience built with React, Vite, Express, and the OpenAI Realtime API.

This project recreates a dramatic "wake JARVIS" flow:

- prime microphone and popup permissions
- arm the interface for a double-clap trigger
- open YouTube and ChatGPT side-by-side
- start a live voice session through OpenAI Realtime
- render a Hall of Armor workstation UI for the suit showcase

Current release: `v0.1.0`

## Live Demo

- Production: `https://tony-stark-six.vercel.app`

## Features

- Cinematic boot sequence and Stark Industries HUD styling
- Hall of Armor suit gallery with workstation-style detail panels
- Double-clap activation flow using Web Audio analysis
- Popup launch preparation for YouTube and ChatGPT
- Live voice session with `gpt-realtime`
- Local Express API and Vercel serverless API support for realtime session creation
- Status panel and transcript feed for debugging the activation flow

## Tech Stack

- React 19
- TypeScript
- Vite
- Express
- Web Audio API
- WebRTC
- OpenAI Realtime API
- Vercel

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

Copy `.env.example` to `.env` and set your OpenAI key:

```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=8787
```

### 3. Run locally

```bash
npm run dev
```

This starts:

- the Vite client
- the local Express session server

Open the client in a Chromium-based browser for the best experience.

## Available Scripts

```bash
npm run dev
npm run dev:client
npm run dev:server
npm run build
npm run lint
npm run preview
```

## How It Works

1. Press `Ready` to pre-authorize microphone and popup-related browser behavior.
2. Press `Start JARVIS` to arm the launch flow.
3. The app listens for a double clap through `useClapDetection`.
4. On activation, YouTube is prepared on the left and ChatGPT is routed on the right.
5. The app requests a realtime client secret from `/api/realtime-session`.
6. `useRealtimeVoice` starts a WebRTC-based voice session with OpenAI Realtime.
7. Live status and transcript updates appear in the UI.

## Environment Variables

| Name | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Server-side key used to create OpenAI Realtime client secrets |
| `PORT` | No | Local Express server port. Defaults to `8787` |

## Project Structure

```text
api/
  realtime-session.ts      # Vercel serverless entrypoint

server/
  index.ts                 # Local Express API server
  realtimeSession.ts       # OpenAI Realtime client secret creation

src/
  App.tsx                  # Main app state and activation flow
  styles.css               # Global styling and Hall of Armor UI
  components/
    BootSequence.tsx
    ControlPanel.tsx
    StatusPanel.tsx
    SuitGallery.tsx
    TranscriptPanel.tsx
  hooks/
    useClapDetection.ts
    useRealtimeVoice.ts
  utils/
    audioGreeting.ts
    constants.ts
    windowLauncher.ts
```

## Deployment

This repo is configured for Vercel deployment.

- frontend build: Vite
- local API during development: `server/index.ts`
- production session endpoint: `api/realtime-session.ts`

The current production deployment is:

- `https://tony-stark-six.vercel.app`

## Browser Notes

- A Chromium-class browser is recommended because the app depends on WebRTC and microphone APIs.
- Popup blocking can prevent the YouTube and ChatGPT launch sequence from completing.
- Window placement behavior can vary by operating system and browser security policy.
- The local flow requires a valid `OPENAI_API_KEY` on the server side.

## Known Limitations

- The production bundle is currently large because of 3D and media assets.
- Multi-monitor placement currently falls back to a left/right split strategy.
- Browser autoplay and popup policies may affect the dramatic launch experience.

