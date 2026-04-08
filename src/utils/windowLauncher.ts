import {
  CHATGPT_URL,
  WINDOW_MARGIN,
  YOUTUBE_FOLLOWUP_AUTOPLAY_URL,
  YOUTUBE_INTRO_AUTOPLAY_URL,
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

function reserveFollowupYoutubeTab(youtubeWindow: Window | null) {
  if (!youtubeWindow || youtubeWindow.closed) {
    return null
  }

  try {
    const followupTab = youtubeWindow.open('', 'jarvis-youtube-followup-tab')
    ensureWindowVisible(youtubeWindow)
    return followupTab
  } catch {
    return null
  }
}

function navigateFollowupYoutubeTab(
  prepared: LaunchPreparation | null,
  rect: { height: number; left: number; top: number; width: number },
) {
  if (!prepared?.followupYoutubeTab) {
    throw new Error('Follow-up YouTube tab was unavailable before launch.')
  }

  prepared.followupYoutubeRect = rect
  moveAndLoad(prepared.followupYoutubeTab, YOUTUBE_FOLLOWUP_AUTOPLAY_URL, rect)
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
    const rect = prepared.followupYoutubeRect

    if (!rect) {
      return
    }

    if (prepared.followupYoutubeTab && !prepared.followupYoutubeTab.closed) {
      navigateFollowupYoutubeTab(prepared, rect)
      ensureWindowVisible(prepared.followupYoutubeTab)
      ensureWindowVisible(prepared.youtubeWindow)
    } else {
      moveAndLoad(prepared.youtubeWindow, YOUTUBE_FOLLOWUP_AUTOPLAY_URL, rect)
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
  const followupYoutubeTab = reserveFollowupYoutubeTab(youtubeWindow)

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

  moveAndLoad(prepared?.youtubeWindow ?? null, YOUTUBE_INTRO_AUTOPLAY_URL, leftRect)
  moveAndLoad(prepared?.chatWindow ?? null, CHATGPT_URL, rightRect)
  if (prepared) {
    prepared.followupYoutubeRect = leftRect
  }
  ensureWindowVisible(prepared?.youtubeWindow ?? null)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 120)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 260)
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

  moveAndLoad(prepared?.youtubeWindow ?? null, YOUTUBE_INTRO_AUTOPLAY_URL, youtubeRect)
  if (prepared) {
    prepared.followupYoutubeRect = youtubeRect
  }
  moveAndLoad(prepared?.chatWindow ?? null, CHATGPT_URL, getCenteredRect(secondScreen))
  ensureWindowVisible(prepared?.youtubeWindow ?? null)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 120)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 260)
  scheduleYoutubeSwap(prepared)

  return 'multi-screen'
}

export function focusLaunchWindows(prepared: LaunchPreparation | null) {
  ensureWindowVisible(prepared?.youtubeWindow ?? null)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 120)
  window.setTimeout(() => ensureWindowVisible(prepared?.youtubeWindow ?? null), 260)
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
