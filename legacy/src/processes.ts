import type { Process } from './types'

const KEY = 'wend:processes'

export async function listProcesses(): Promise<Process[]> {
  const result = await chrome.storage.local.get(KEY)
  return (result[KEY] as Process[] | undefined) ?? []
}

export async function saveProcess(process: Process): Promise<void> {
  const all = await listProcesses()
  const index = all.findIndex((p) => p.id === process.id)
  if (index >= 0) all[index] = process
  else all.push(process)
  await chrome.storage.local.set({ [KEY]: all })
}

export async function deleteProcess(id: string): Promise<void> {
  const all = await listProcesses()
  await chrome.storage.local.set({ [KEY]: all.filter((p) => p.id !== id) })
}
