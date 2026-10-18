/**
 * What the parts of the extension say to each other.
 *
 *   content script → worker   ready         "running on this site"
 *                             draft         the recording so far, after every change
 *                             draft-closed  the recorder was closed
 *                             progress      a played guide reached this step
 *                             play-ended    it finished or was stopped
 *   side panel → worker       record        "start recording in this tab"
 *   worker → content script   start-recording
 *   side panel → content      resume        "ask again: is there a guide to play?"
 *
 * The play page on wendmark.dev talks to the worker too, from outside the
 * extension; those messages are in play.ts.
 *
 * Messages from a content script come out of a web page, so the worker
 * never trusts their shape: every message is read with `readMessage`, which
 * returns null for anything it does not recognise and drops unknown fields.
 */
import type { Step } from '@wendmark/core'
import type { Flow } from '@wendmark/core'
import type { Draft } from '@wendmark/snippet/engine'

export interface ReadyMessage {
  type: 'wendmark:ready'
  /** The page's origin, e.g. "https://app.example.com". */
  origin: string
}

export interface DraftMessage {
  type: 'wendmark:draft'
  draft: Draft
}

export interface DraftClosedMessage {
  type: 'wendmark:draft-closed'
}

export interface RecordMessage {
  type: 'wendmark:record'
  tabId: number
}

export interface StartRecordingMessage {
  type: 'wendmark:start-recording'
}

export interface ResumeMessage {
  type: 'wendmark:resume'
}

export interface ProgressMessage {
  type: 'wendmark:progress'
  stepIndex: number
}

export interface PlayEndedMessage {
  type: 'wendmark:play-ended'
}

export type Message =
  | ReadyMessage
  | DraftMessage
  | DraftClosedMessage
  | RecordMessage
  | StartRecordingMessage
  | ResumeMessage
  | ProgressMessage
  | PlayEndedMessage

/**
 * The worker's answer to `ready`: a recording to carry on with, or a shared
 * guide to play from a step, if either.
 */
export interface ReadyReply {
  draft: Draft | null
  play: { flow: Flow; stepIndex: number } | null
}

/** The worker's answer to `record`. */
export type RecordReply = { ok: true } | { ok: false; reason: 'no-page' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** A draft as far as shape goes. Its steps are the recorder's own. */
export function readDraft(value: unknown): Draft | null {
  if (!isRecord(value)) return null
  if (typeof value.name !== 'string' || !Array.isArray(value.steps)) return null
  if (!value.steps.every((step) => isRecord(step) && typeof step.type === 'string')) return null
  return { name: value.name, steps: value.steps as Step[] }
}

/** A message this extension understands, or null. */
export function readMessage(value: unknown): Message | null {
  if (!isRecord(value)) return null
  switch (value.type) {
    case 'wendmark:ready':
      return typeof value.origin === 'string' ? { type: value.type, origin: value.origin } : null
    case 'wendmark:draft': {
      const draft = readDraft(value.draft)
      return draft ? { type: value.type, draft } : null
    }
    case 'wendmark:draft-closed':
    case 'wendmark:start-recording':
    case 'wendmark:resume':
    case 'wendmark:play-ended':
      return { type: value.type }
    case 'wendmark:progress':
      return typeof value.stepIndex === 'number' &&
        Number.isInteger(value.stepIndex) &&
        value.stepIndex >= 0
        ? { type: value.type, stepIndex: value.stepIndex }
        : null
    case 'wendmark:record':
      return typeof value.tabId === 'number' && Number.isInteger(value.tabId)
        ? { type: value.type, tabId: value.tabId }
        : null
    default:
      return null
  }
}
