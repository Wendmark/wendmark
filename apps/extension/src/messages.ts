/**
 * What the content script and the service worker say to each other.
 *
 * Messages cross from a page into the extension, so the worker never
 * trusts their shape: every one is checked with `readMessage` first.
 */

/** The content script is running in a tab and ready for work. */
export interface ReadyMessage {
  type: 'wendmark:ready'
}

export type Message = ReadyMessage

/** A message this extension understands, or null. */
export function readMessage(value: unknown): Message | null {
  if (typeof value !== 'object' || value === null) return null
  const type = (value as { type?: unknown }).type
  return type === 'wendmark:ready' ? { type } : null
}
