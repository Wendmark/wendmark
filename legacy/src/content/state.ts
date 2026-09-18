import type { PlaybackState } from '../types'

const KEY = 'wend:playback'

export async function savePlayback(state: PlaybackState): Promise<void> {
  await chrome.storage.local.set({ [KEY]: state })
}

export async function loadPlayback(): Promise<PlaybackState | null> {
  const result = await chrome.storage.local.get(KEY)
  return (result[KEY] as PlaybackState | undefined) ?? null
}

export async function clearPlayback(): Promise<void> {
  await chrome.storage.local.remove(KEY)
}
