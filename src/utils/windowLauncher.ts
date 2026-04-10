import {
  CHATGPT_PROMPT,
  CHATGPT_URL,
  WINDOW_MARGIN,
  YOUTUBE_FOLLOWUP_VIDEO_ID,
} from './constants'

declare global {
  interface Window {
    __jarvisActivateYoutube?: () => void
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

function buildChatGptLaunchUrl() {
  const url = new URL(CHATGPT_URL)
  url.searchParams.set('q', CHATGPT_PROMPT)
  return url.toString()
}

function getPrimedYoutubeRect() {
  const screenLeft = typeof window.screenLeft === 'number' ? window.screenLeft : 0
  const screenTop = typeof window.screenTop === 'number' ? window.screenTop : 0

  return {
    left: screenLeft + WINDOW_MARGIN,
    top: screenTop + Math.max(24, window.screen.availHeight - 280),
    width: 360,
    height: 204,
  }
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
      body {
        position: relative;
      }
      #player {
        width: 100vw;
        height: 100vh;
      }
      .overlay {
        position: fixed;
        inset: 0;
        z-index: 3;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at center, rgba(89, 245, 255, 0.12), transparent 42%),
          rgba(0, 0, 0, 0.38);
        pointer-events: none;
        transition: opacity 180ms ease;
      }
      .overlay.hidden {
        opacity: 0;
      }
      .overlay-card {
        padding: 18px 20px;
        border: 1px solid rgba(89, 245, 255, 0.24);
        border-radius: 16px;
        background: rgba(3, 15, 24, 0.72);
        backdrop-filter: blur(10px);
        box-shadow: 0 0 30px rgba(89, 245, 255, 0.08);
        text-align: center;
      }
      .overlay-card strong {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #59f5ff;
      }
      .status {
        position: fixed;
        left: 18px;
        bottom: 18px;
        z-index: 4;
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
    <div class="overlay" id="jarvis-overlay">
      <div class="overlay-card">
        <strong>Channel Armed</strong>
        <span>Playback is being primed now so the left screen can go live on the double clap.</span>
      </div>
    </div>
    <div class="status" id="jarvis-status">Priming autoplay with volume 100 from the Start JARVIS click.</div>
    <script>
      let player;
      let playerReady = false;
      let activationRequested = false;
      const overlay = document.getElementById('jarvis-overlay');
      const status = document.getElementById('jarvis-status');

      function setStatus(message) {
        if (status) {
          status.textContent = message;
        }
      }

      function startPrimedPlayback() {
        if (!player) return;
        try { player.setVolume(100); } catch (error) {}
        try { player.unMute(); } catch (error) {}
        try { player.playVideo(); } catch (error) {}
      }

      function activatePlayback() {
        if (!player) return;
        activationRequested = true;
        if (!playerReady) {
          setStatus('Playback activation queued until the YouTube player is ready.');
          return;
        }

        if (overlay) {
          overlay.classList.add('hidden');
        }

        try {
          player.setVolume(100);
          player.unMute();
          const state = player.getPlayerState ? player.getPlayerState() : -1;
          if (state !== YT.PlayerState.PLAYING) {
            player.playVideo();
          }
        } catch (error) {
          try {
            player.setVolume(100);
            player.unMute();
            player.playVideo();
          } catch (innerError) {}
        }
        setStatus('Autoplay is armed with volume 100.');
      }

      window.__jarvisActivateYoutube = activatePlayback;

      function onYouTubeIframeAPIReady() {
        player = new YT.Player('player', {
          host: 'https://www.youtube-nocookie.com',
          videoId: '${YOUTUBE_FOLLOWUP_VIDEO_ID}',
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            mute: 0,
            enablejsapi: 1,
            origin: '${window.location.origin}'
          },
          events: {
            onReady: function(event) {
              playerReady = true;
              try {
                const iframe = event.target.getIframe();
                iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
                iframe.setAttribute('allowfullscreen', 'true');
              } catch (error) {}

              startPrimedPlayback();
              window.setTimeout(startPrimedPlayback, 220);

              if (activationRequested) {
                window.setTimeout(activatePlayback, 60);
              }
            },
            onStateChange: function(event) {
              if (event.data === YT.PlayerState.PLAYING) {
                if (activationRequested) {
                  window.setTimeout(activatePlayback, 60);
                } else {
                  setStatus('Autoplay is live. Waiting for the double clap to reveal the window.');
                }
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

function activatePreparedYoutubeWindow(target: Window | null) {
  if (!target || target.closed) {
    return
  }

  try {
    target.__jarvisActivateYoutube?.()
  } catch {
    // Ignore same-origin playback activation failures.
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

function focusYoutubeWindow(prepared: LaunchPreparation | null) {
  ensureWindowVisible(prepared?.youtubeWindow ?? null)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 160)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 360)
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
  const primedRect = getPrimedYoutubeRect()
  const youtubeWindow = window.open(
    '',
    'jarvis-youtube-shell',
    `popup=yes,width=${primedRect.width},height=${primedRect.height},left=${primedRect.left},top=${primedRect.top}`,
  )
  const chatWindow = window.open(
    '',
    'jarvis-chatgpt-shell',
    'popup=yes,width=320,height=180,left=-10000,top=0',
  )

  if (youtubeWindow && !youtubeWindow.closed) {
    try {
      youtubeWindow.moveTo(primedRect.left, primedRect.top)
      youtubeWindow.resizeTo(primedRect.width, primedRect.height)
    } catch {
      // Ignore popup positioning failures while priming playback.
    }
  }

  writeYoutubePlayerShell(youtubeWindow)
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

  activatePreparedYoutubeWindow(prepared?.youtubeWindow ?? null)
  prepared?.chatWindow?.location.replace(buildChatGptLaunchUrl())

  focusYoutubeWindow(prepared)

  return 'single-screen'
}

export async function openWindowsMultiScreen(
  prepared: LaunchPreparation | null,
): Promise<MonitorMode> {
  // Force the requested left/right split even when multi-screen APIs are available.
  return openWindowsSingleScreen(prepared)
}

export function focusLaunchWindows(prepared: LaunchPreparation | null) {
  focusYoutubeWindow(prepared)
}

export function cleanupLaunchWindows(prepared: LaunchPreparation | null) {
  prepared?.youtubeWindow?.close()
  prepared?.chatWindow?.close()
}
