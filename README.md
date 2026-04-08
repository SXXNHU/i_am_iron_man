# tony-stark

JARVIS 모드 프로토타입 웹앱입니다.  
마이크 권한을 받고 더블 클랩으로 시스템을 깨운 뒤, 음성 인사와 함께 외부 창을 열고 OpenAI Realtime API 음성 대화로 이어지는 미래형 데스크톱 어시스턴트 흐름을 실험합니다.

## Stack

- React
- TypeScript
- Vite
- Express
- Web Audio API
- WebRTC
- OpenAI Realtime API
- Vercel Serverless Function

## Features

- 더블 클랩 감지로 JARVIS 시작
- 음성 인사 재생
- YouTube / ChatGPT 창 실행
- OpenAI Realtime API 기반 음성 대화
- 로컬 Express 세션 서버와 Vercel 서버리스 함수 동시 지원

## Run

`.env`를 `.env.example` 기준으로 준비한 뒤 실행합니다.

```bash
npm install
npm run dev
```

Useful scripts:

```bash
npm run dev:client
npm run dev:server
npm run build
npm run preview
```

## Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=8787
```

## Structure

```text
api/
└─ realtime-session.ts

server/
├─ index.ts
└─ realtimeSession.ts

src/
├─ App.tsx
├─ main.tsx
├─ styles.css
├─ components/
│  ├─ BootSequence.tsx
│  ├─ ControlPanel.tsx
│  ├─ HudShowcase.tsx
│  ├─ StatusPanel.tsx
│  └─ TranscriptPanel.tsx
├─ hooks/
│  ├─ useClapDetection.ts
│  └─ useRealtimeVoice.ts
└─ utils/
   ├─ audioGreeting.ts
   ├─ constants.ts
   └─ windowLauncher.ts
```

## How It Works

1. 사용자가 `Start JARVIS`를 누릅니다.
2. 앱이 마이크 권한을 요청하고, 팝업 창을 미리 엽니다.
3. `useClapDetection.ts`가 더블 클랩을 감지합니다.
4. 인사 음성을 재생하고 보조 창을 띄웁니다.
5. `useRealtimeVoice.ts`가 Realtime 세션을 열어 음성 대화로 이어집니다.

## Edit Points

- 클랩 감지 로직 수정: `src/hooks/useClapDetection.ts`
- Realtime 음성 연결 수정: `src/hooks/useRealtimeVoice.ts`
- 외부 창 실행 로직 수정: `src/utils/windowLauncher.ts`
- 로컬 세션 서버 수정: `server/realtimeSession.ts`
- Vercel 함수 수정: `api/realtime-session.ts`
- 전체 JARVIS UI 수정: `src/styles.css`

## Notes

- 브라우저 팝업 정책에 따라 창 열기 동작은 제한될 수 있습니다.
- 정확한 OS 레벨 창 배치는 브라우저 API 한계가 있습니다.
- Vercel 배포 시에도 `OPENAI_API_KEY`는 서버 환경변수로만 관리해야 합니다.
