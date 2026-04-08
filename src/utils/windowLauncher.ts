import {
  CHATGPT_URL,
  WINDOW_MARGIN,
  YOUTUBE_FOLLOWUP_VIDEO_ID,
  YOUTUBE_INTRO_VIDEO_ID,
  YOUTUBE_SWAP_DELAY_MS,
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
  followupYoutubeRect: { height: number; left: number; top: number; width: number } | null
  followupYoutubeTab: Window | null
  status: 'prepared' | 'blocked' | 'prepared-with-fallback'
  youtubeSwapStartedAt: number | null
  youtubeSwapTimeoutId: number | null
  youtubeSwapRetryIntervalId: number | null
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

function writeYoutubePlayerShell(
  target: Window | null,
  title: string,
  videoId: string,
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
        box-shadow: 0 0 20px rgba(89, 245, 255, 0.08);
      }
      .status strong {
        display: block;
        margin-bottom: 4px;
        color: #59f5ff;
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .status span {
        color: rgba(232, 251, 255, 0.8);
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <div class="status">
      <strong>Jarvis Video</strong>
      <span>Attempting playback at volume 100.</span>
    </div>
    <script>
      let player;
      let retries = 0;
      function forcePlayback() {
        if (!player) return;
        try { player.setVolume(100); } catch (error) {}
        try { player.unMute(); } catch (error) {}
        try { player.playVideo(); } catch (error) {}
        retries += 1;
        if (retries < 8) {
          window.setTimeout(forcePlayback, 450);
        }
      }
      function onYouTubeIframeAPIReady() {
        player = new YT.Player('player', {
          videoId: '${videoId}',
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            origin: '${window.location.origin}'
          },
          events: {
            onReady: forcePlayback
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
  ensureWindowVisible(target)
}

function reserveFollowupYoutubeTab() {
  try {
    const followupTab = window.open('', 'jarvis-youtube-followup-tab')
    writeLaunchShell(
      followupTab,
      'Follow-up Video Armed',
      'Stand by. The second YouTube sequence will attach here after the intro finishes.',
    )
    return followupTab
  } catch {
    return null
  }
}

function navigateFollowupYoutubeTab(prepared: LaunchPreparation | null) {
  if (!prepared?.followupYoutubeTab) {
    throw new Error('Follow-up YouTube tab was unavailable before launch.')
  }

  writeYoutubePlayerShell(
    prepared.followupYoutubeTab,
    'Jarvis Follow-up Sequence',
    YOUTUBE_FOLLOWUP_VIDEO_ID,
  )
  ensureWindowVisible(prepared.followupYoutubeTab)
}

function getCenteredRect(screen: ScreenDetailed) {
  return {
    left: screen.availLeft + WINDOW_MARGIN,
    top: screen.availTop + WINDOW_MARGIN,
    width: Math.max(720, screen.availWidth - WINDOW_MARGIN * 2),
    height: Math.max(720, screen.availHeight - WINDOW_MARGIN * 2),
  }
}

function scheduleYoutubeSwap(prepared: LaunchPreparation | null) {
  if (!prepared?.youtubeWindow) {
    return
  }

  if (prepared.youtubeSwapTimeoutId) {
    window.clearTimeout(prepared.youtubeSwapTimeoutId)
  }

  if (prepared.youtubeSwapRetryIntervalId) {
    window.clearInterval(prepared.youtubeSwapRetryIntervalId)
  }

  prepared.youtubeSwapStartedAt = Date.now()

  const openSecondVideoTab = () => {
    if (prepared.followupYoutubeTab && !prepared.followupYoutubeTab.closed) {
      navigateFollowupYoutubeTab(prepared)
    } else {
      writeYoutubePlayerShell(
        prepared.youtubeWindow,
        'Jarvis Follow-up Sequence',
        YOUTUBE_FOLLOWUP_VIDEO_ID,
      )
      ensureWindowVisible(prepared.youtubeWindow)
    }

    prepared.youtubeSwapTimeoutId = null
    prepared.youtubeSwapStartedAt = null

    if (prepared.youtubeSwapRetryIntervalId) {
      window.clearInterval(prepared.youtubeSwapRetryIntervalId)
      prepared.youtubeSwapRetryIntervalId = null
    }
  }

  prepared.youtubeSwapTimeoutId = window.setTimeout(
    openSecondVideoTab,
    YOUTUBE_SWAP_DELAY_MS,
  )

  prepared.youtubeSwapRetryIntervalId = window.setInterval(() => {
    if (!prepared.youtubeWindow || prepared.youtubeWindow.closed) {
      return
    }

    const startedAt = prepared.youtubeSwapStartedAt
    if (!startedAt) {
      return
    }

    if (Date.now() - startedAt >= YOUTUBE_SWAP_DELAY_MS) {
      openSecondVideoTab()
    }
  }, 1000)
}

export function prepareLaunchWindows(): LaunchPreparation {
  const youtubeWindow = window.open(
    '',
    'jarvis-youtube-shell',
    'popup=yes,width=720,height=900',
  )
  const chatWindow = window.open(
    '',
    'jarvis-chatgpt-shell',
    'popup=yes,width=720,height=900',
  )

  writeLaunchShell(
    youtubeWindow,
    'Video Channel Armed',
    'Waiting for the double-clap trigger before loading the intro video.',
  )
  writeLaunchShell(
    chatWindow,
    'Chat Channel Armed',
    'This window is reserved for ChatGPT and will route after activation.',
  )

  const followupYoutubeTab = reserveFollowupYoutubeTab()

  const status =
    youtubeWindow && chatWindow && followupYoutubeTab
      ? 'prepared'
      : youtubeWindow && chatWindow
        ? 'prepared-with-fallback'
        : 'blocked'

  return {
    youtubeWindow,
    followupYoutubeTab,
    chatWindow,
    status,
    followupYoutubeRect: null,
    youtubeSwapStartedAt: null,
    youtubeSwapTimeoutId: null,
    youtubeSwapRetryIntervalId: null,
  }
}

export function openWindowsSingleScreen(
  prepared: LaunchPreparation | null,
): MonitorMode {
  const screenLeft = typeof window.screenLeft === 'number' ? window.screenLeft : 0
  const screenTop = typeof window.screenTop === 'number' ? window.screenTop : 0
  const width = Math.max(480, Math.floor(window.screen.availWidth / 2) - WINDOW_MARGIN)
  const height = Math.max(720, window.screen.availHeight - WINDOW_MARGIN * 2)
  const top = screenTop + WINDOW_MARGIN
  const leftRect = {
    left: screenLeft + WINDOW_MARGIN,
    top,
    width,
    height,
  }
  const rightRect = {
    left: screenLeft + width + WINDOW_MARGIN,
    top,
    width,
    height,
  }

  moveWindow(prepared?.chatWindow ?? null, rightRect)
  prepared?.chatWindow?.location.replace(CHATGPT_URL)
  moveWindow(prepared?.youtubeWindow ?? null, leftRect)
  writeYoutubePlayerShell(
    prepared?.youtubeWindow ?? null,
    'Jarvis Intro Sequence',
    YOUTUBE_INTRO_VIDEO_ID,
  )
  if (prepared) {
    prepared.followupYoutubeRect = leftRect
  }
  ensureWindowVisible(prepared?.youtubeWindow ?? null)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 120)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 260)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 520)
  scheduleYoutubeSwap(prepared)

  return 'single-screen'
}

export async function openWindowsMultiScreen(
  prepared: LaunchPreparation | null,
): Promise<MonitorMode> {
  if (!window.getScreenDetails) {
    return openWindowsSingleScreen(prepared)
  }

  const details = await window.getScreenDetails()

  if (details.screens.length < 2) {
    return openWindowsSingleScreen(prepared)
  }

  const [firstScreen, secondScreen] = details.screens
  const youtubeRect = getCenteredRect(firstScreen)

  moveWindow(prepared?.chatWindow ?? null, getCenteredRect(secondScreen))
  prepared?.chatWindow?.location.replace(CHATGPT_URL)
  moveWindow(prepared?.youtubeWindow ?? null, youtubeRect)
  writeYoutubePlayerShell(
    prepared?.youtubeWindow ?? null,
    'Jarvis Intro Sequence',
    YOUTUBE_INTRO_VIDEO_ID,
  )
  if (prepared) {
    prepared.followupYoutubeRect = youtubeRect
  }
  ensureWindowVisible(prepared?.youtubeWindow ?? null)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 120)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 260)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 520)
  scheduleYoutubeSwap(prepared)

  return 'multi-screen'
}

export function focusLaunchWindows(prepared: LaunchPreparation | null) {
  ensureWindowVisible(prepared?.youtubeWindow ?? null)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 120)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 260)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 520)
}

export function cleanupLaunchWindows(prepared: LaunchPreparation | null) {
  if (prepared?.youtubeSwapTimeoutId) {
    window.clearTimeout(prepared.youtubeSwapTimeoutId)
    prepared.youtubeSwapTimeoutId = null
  }

  if (prepared?.youtubeSwapRetryIntervalId) {
    window.clearInterval(prepared.youtubeSwapRetryIntervalId)
    prepared.youtubeSwapRetryIntervalId = null
  }

  if (prepared) {
    prepared.youtubeSwapStartedAt = null
    prepared.followupYoutubeRect = null
  }

  prepared?.followupYoutubeTab?.close()
  prepared?.youtubeWindow?.close()
  prepared?.chatWindow?.close()
}
