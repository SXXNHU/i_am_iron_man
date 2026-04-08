import {
  CHATGPT_URL,
  WINDOW_MARGIN,
  YOUTUBE_INTRO_URL,
  YOUTUBE_SWAP_DELAY_MS,
  YOUTUBE_URL,
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
  mainYoutubeWindow: Window | null
  status: 'prepared' | 'blocked' | 'prepared-with-fallback'
  youtubeSwapStartedAt: number | null
  youtubeSwapTimeoutId: number | null
  youtubeSwapRetryIntervalId: number | null
  youtubeWindow: Window | null
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

function moveAndLoad(
  target: Window | null,
  url: string,
  rect: { height: number; left: number; top: number; width: number },
) {
  if (!target) {
    throw new Error('Popup was blocked before the launch sequence could continue.')
  }

  target.moveTo(rect.left, rect.top)
  target.resizeTo(rect.width, rect.height)
  target.location.replace(url)
  ensureWindowVisible(target)
}

function openFollowupYoutubeWindow(
  prepared: LaunchPreparation | null,
  rect: { height: number; left: number; top: number; width: number },
) {
  if (!prepared?.mainYoutubeWindow) {
    throw new Error('Follow-up YouTube window was blocked before launch.')
  }

  prepared.followupYoutubeRect = rect
  moveAndLoad(prepared.mainYoutubeWindow, YOUTUBE_URL, rect)
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

  const openSecondVideoWindow = () => {
    const rect = prepared.followupYoutubeRect

    if (!rect) {
      return
    }

    if (prepared.mainYoutubeWindow && !prepared.mainYoutubeWindow.closed) {
      openFollowupYoutubeWindow(prepared, rect)
      ensureWindowVisible(prepared.mainYoutubeWindow)
    } else {
      moveAndLoad(prepared.youtubeWindow, YOUTUBE_URL, rect)
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
    openSecondVideoWindow,
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
      openSecondVideoWindow()
    }
  }, 1000)
}

export function prepareLaunchWindows(): LaunchPreparation {
  // Pre-opening blank windows during a trusted click makes later navigation less likely to be blocked.
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
  const mainYoutubeWindow = window.open(
    '',
    'jarvis-youtube-followup-shell',
    'popup=yes,width=720,height=900',
  )

  const status =
    youtubeWindow && chatWindow && mainYoutubeWindow
      ? 'prepared'
      : youtubeWindow && chatWindow
        ? 'prepared-with-fallback'
        : 'blocked'

  return {
    youtubeWindow,
    mainYoutubeWindow,
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

  moveAndLoad(prepared?.youtubeWindow ?? null, YOUTUBE_INTRO_URL, leftRect)
  moveAndLoad(prepared?.chatWindow ?? null, CHATGPT_URL, rightRect)
  if (prepared) {
    prepared.followupYoutubeRect = leftRect
  }
  ensureWindowVisible(prepared?.youtubeWindow ?? null)
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
  moveAndLoad(
    prepared?.youtubeWindow ?? null,
    YOUTUBE_INTRO_URL,
    getCenteredRect(firstScreen),
  )
  if (prepared) {
    prepared.followupYoutubeRect = getCenteredRect(firstScreen)
  }
  moveAndLoad(prepared?.chatWindow ?? null, CHATGPT_URL, getCenteredRect(secondScreen))
  ensureWindowVisible(prepared?.youtubeWindow ?? null)
  scheduleYoutubeSwap(prepared)

  return 'multi-screen'
}

export function focusLaunchWindows(prepared: LaunchPreparation | null) {
  ensureWindowVisible(prepared?.youtubeWindow ?? null)
  ensureWindowVisible(prepared?.mainYoutubeWindow ?? null)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 120)
  window.setTimeout(() => ensureWindowVisible(prepared?.mainYoutubeWindow ?? null), 180)
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

  prepared?.youtubeWindow?.close()
  prepared?.mainYoutubeWindow?.close()
  prepared?.chatWindow?.close()
}
