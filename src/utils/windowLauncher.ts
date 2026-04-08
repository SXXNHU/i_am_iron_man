import { CHATGPT_URL, WINDOW_MARGIN, YOUTUBE_URL } from './constants'

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
  target.focus()
}

function getCenteredRect(screen: ScreenDetailed) {
  return {
    left: screen.availLeft + WINDOW_MARGIN,
    top: screen.availTop + WINDOW_MARGIN,
    width: Math.max(720, screen.availWidth - WINDOW_MARGIN * 2),
    height: Math.max(720, screen.availHeight - WINDOW_MARGIN * 2),
  }
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

  return {
    youtubeWindow,
    chatWindow,
    status: youtubeWindow && chatWindow ? 'prepared' : 'blocked',
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

  moveAndLoad(prepared?.youtubeWindow ?? null, YOUTUBE_URL, leftRect)
  moveAndLoad(prepared?.chatWindow ?? null, CHATGPT_URL, rightRect)

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
  moveAndLoad(prepared?.youtubeWindow ?? null, YOUTUBE_URL, getCenteredRect(firstScreen))
  moveAndLoad(prepared?.chatWindow ?? null, CHATGPT_URL, getCenteredRect(secondScreen))

  return 'multi-screen'
}

export function cleanupLaunchWindows(prepared: LaunchPreparation | null) {
  prepared?.youtubeWindow?.close()
  prepared?.chatWindow?.close()
}
