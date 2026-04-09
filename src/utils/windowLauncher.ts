import {
  CHATGPT_URL,
  WINDOW_MARGIN,
  YOUTUBE_FOLLOWUP_VIDEO_ID,
} from './constants'

declare global {
  interface Window {
    getScreenDetails?: () => Promise<ScreenDetails>
  }

  interface ScreenDetails {
    currentScreen: ScreenDetailed
    screens: ScreenDetailed[]
  }

  interface ScreenDetailed extends Screen {
    availLeft: number
    availTop: number
    availWidth: number
    availHeight: number
    isPrimary: boolean
  }
}

export type MonitorMode =
  | 'unknown'
  | 'checking-window-management'
  | 'single-screen'
  | 'multi-screen'

export type LaunchPreparation = {
  chatWindow: Window | null
  status: 'prepared' | 'blocked'
  youtubeWindow: Window | null
}

function writeLaunchShell(
  target: Window | null,
  title: string,
  message: string,
) {
  if (!target || target.closed) {
    return
  }

  try {
    target.document.open()
    target.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(89, 245, 255, 0.16), transparent 28%),
          linear-gradient(180deg, #031018, #02060c);
        color: #e8fbff;
        font-family: "Segoe UI", sans-serif;
      }
      .shell {
        width: min(520px, calc(100vw - 48px));
        padding: 28px;
        border: 1px solid rgba(89, 245, 255, 0.24);
        border-radius: 20px;
        background: rgba(3, 15, 24, 0.88);
        box-shadow: 0 0 30px rgba(89, 245, 255, 0.08);
      }
      .kicker {
        color: #59f5ff;
        font-size: 12px;
        letter-spacing: 0.24em;
        text-transform: uppercase;
      }
      h1 {
        margin: 12px 0 8px;
        font-size: 28px;
        letter-spacing: 0.08em;
      }
      p {
        margin: 0;
        color: rgba(232, 251, 255, 0.72);
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <div class="kicker">JARVIS Launch Shell</div>
      <h1>${title}</h1>
      <p>${message}</p>
    </main>
  </body>
</html>`)
    target.document.close()
  } catch {
    // Ignore cross-window shell write failures.
  }
}

function writeYoutubePlayerShell(target: Window | null) {
  if (!target || target.closed) {
    return
  }

  try {
    target.document.open()
    target.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Jarvis Gaming Sequence</title>
    <style>
      :root { color-scheme: dark; }
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #000;
        color: #e8fbff;
        font-family: "Segoe UI", sans-serif;
      }
      #player {
        width: 100vw;
        height: 100vh;
      }
      .status {
        position: fixed;
        left: 18px;
        bottom: 18px;
        z-index: 2;
        padding: 10px 14px;
        border: 1px solid rgba(89, 245, 255, 0.24);
        border-radius: 12px;
        background: rgba(3, 15, 24, 0.7);
        backdrop-filter: blur(10px);
      }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <div class="status">Starting playback and restoring volume 100.</div>
    <script>
      let player;
      let retries = 0;
      let unmuteRetries = 0;
      let hasReachedPlayback = false;
      function forcePlayback() {
        if (!player) return;
        try { player.mute(); } catch (error) {}
        try { player.setVolume(100); } catch (error) {}
        try { player.playVideo(); } catch (error) {}
        retries += 1;
        if (retries < 10) {
          window.setTimeout(forcePlayback, 400);
        }
      }
      function restoreAudio() {
        if (!player) return;
        try { player.setVolume(100); } catch (error) {}
        try { player.unMute(); } catch (error) {}
        try { player.playVideo(); } catch (error) {}
        unmuteRetries += 1;
        if (unmuteRetries < 8) {
          window.setTimeout(restoreAudio, 350);
        }
      }
      function onYouTubeIframeAPIReady() {
        player = new YT.Player('player', {
          videoId: '${YOUTUBE_FOLLOWUP_VIDEO_ID}',
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            mute: 1,
            enablejsapi: 1,
            origin: '${window.location.origin}'
          },
          events: {
            onReady: forcePlayback,
            onStateChange: function(event) {
              if (!hasReachedPlayback && event.data === YT.PlayerState.PLAYING) {
                hasReachedPlayback = true;
                window.setTimeout(restoreAudio, 120);
              }
            }
          }
        });
      }
    </script>
    <script src="https://www.youtube.com/iframe_api"></script>
  </body>
</html>`)
    target.document.close()
  } catch {
    // Ignore cross-window shell write failures.
  }
}

function ensureWindowVisible(target: Window | null) {
  if (!target || target.closed) {
    return
  }

  try {
    target.focus()
  } catch {
    // Ignore browser-specific focus errors.
  }
}

function moveWindow(
  target: Window | null,
  rect: { height: number; left: number; top: number; width: number },
) {
  if (!target) {
    throw new Error('Popup was blocked before the launch sequence could continue.')
  }

  target.moveTo(rect.left, rect.top)
  target.resizeTo(rect.width, rect.height)
}

function getHalfScreenRects() {
  const screenLeft = typeof window.screenLeft === 'number' ? window.screenLeft : 0
  const screenTop = typeof window.screenTop === 'number' ? window.screenTop : 0
  const width = Math.max(480, Math.floor(window.screen.availWidth / 2) - WINDOW_MARGIN)
  const height = Math.max(720, window.screen.availHeight - WINDOW_MARGIN * 2)
  const top = screenTop + WINDOW_MARGIN

  return {
    leftRect: {
      left: screenLeft + WINDOW_MARGIN,
      top,
      width,
      height,
    },
    rightRect: {
      left: screenLeft + width + WINDOW_MARGIN,
      top,
      width,
      height,
    },
  }
}

export function refocusControlWindow() {
  try {
    window.focus()
  } catch {
    // Ignore browser-specific focus errors.
  }
}

export function prepareLaunchWindows(): LaunchPreparation {
  const youtubeWindow = window.open(
    '',
    'jarvis-youtube-shell',
    'popup=yes,width=320,height=180,left=-10000,top=0',
  )
  const chatWindow = window.open(
    '',
    'jarvis-chatgpt-shell',
    'popup=yes,width=320,height=180,left=-10000,top=0',
  )

  writeLaunchShell(
    youtubeWindow,
    'Gaming Channel Armed',
    'Waiting for the double-clap trigger before routing the gaming soundtrack.',
  )
  writeLaunchShell(
    chatWindow,
    'Chat Channel Armed',
    'Waiting for the double-clap trigger before routing ChatGPT.',
  )

  return {
    youtubeWindow,
    chatWindow,
    status: youtubeWindow && chatWindow ? 'prepared' : 'blocked',
  }
}

export function openWindowsSingleScreen(
  prepared: LaunchPreparation | null,
): MonitorMode {
  const { leftRect, rightRect } = getHalfScreenRects()

  moveWindow(prepared?.youtubeWindow ?? null, leftRect)
  moveWindow(prepared?.chatWindow ?? null, rightRect)

  writeYoutubePlayerShell(prepared?.youtubeWindow ?? null)
  prepared?.chatWindow?.location.replace(CHATGPT_URL)

  ensureWindowVisible(prepared?.chatWindow ?? null)
  ensureWindowVisible(prepared?.youtubeWindow ?? null)
  window.setTimeout(() => ensureWindowVisible(prepared?.chatWindow ?? null), 120)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 220)
  window.setTimeout(() => ensureWindowVisible(prepared?.chatWindow ?? null), 360)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 520)

  return 'single-screen'
}

export async function openWindowsMultiScreen(
  prepared: LaunchPreparation | null,
): Promise<MonitorMode> {
  // Force the requested left/right split even when multi-screen APIs are available.
  return openWindowsSingleScreen(prepared)
}

export function focusLaunchWindows(prepared: LaunchPreparation | null) {
  ensureWindowVisible(prepared?.chatWindow ?? null)
  ensureWindowVisible(prepared?.youtubeWindow ?? null)
  window.setTimeout(() => ensureWindowVisible(prepared?.chatWindow ?? null), 120)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 220)
  window.setTimeout(() => ensureWindowVisible(prepared?.chatWindow ?? null), 360)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 520)
}

export function cleanupLaunchWindows(prepared: LaunchPreparation | null) {
  prepared?.youtubeWindow?.close()
  prepared?.chatWindow?.close()
}
