/**
 * Playing a guide someone shared, from the play page on wendmark.dev.
 *
 *   1. The play page sends the link to this extension. Only
 *      https://wendmark.dev can (`externally_connectable` in the manifest).
 *   2. The worker reads it and shows the start page in that tab: what the
 *      guide is, the site it is for, and "Allow access to that site and
 *      start". Chrome lets an extension ask for a site only in answer to a
 *      click on one of its own pages, which is why this page exists.
 *   3. Allowed: the tab goes to the site, the content script is injected
 *      there, and the guide plays. Each page load on that site picks it up
 *      at the step it had reached. Refused: nothing is opened and nothing
 *      is kept; the start page lists the steps as text instead.
 */
import type { ActionStep, Flow, InputStep } from '@wendmark/core'
import type { Shared } from './transfer'

/**
 * This extension's id, fixed by the public key in the manifest so the play
 * page can address it. manifest.test.ts checks the two agree.
 */
export const EXTENSION_ID = 'niooiillhonlnokaifmcgnohmlhbcnhb'

/** The one site allowed to hand guides over. */
export const PLAY_ORIGIN = 'https://wendmark.dev'

/** From the play page: "is the extension here?" */
export interface HelloMessage {
  type: 'wendmark:hello'
}

/** From the play page: "play the guide in this link." */
export interface PlayLinkMessage {
  type: 'wendmark:play'
  link: string
}

export type ExternalMessage = HelloMessage | PlayLinkMessage

export function readExternalMessage(value: unknown): ExternalMessage | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  if (raw.type === 'wendmark:hello') return { type: 'wendmark:hello' }
  if (raw.type === 'wendmark:play' && typeof raw.link === 'string' && raw.link.length < 100_000) {
    return { type: 'wendmark:play', link: raw.link }
  }
  return null
}

/** A guide being played in a tab, and the step it has reached. */
export interface Playing {
  shared: Shared
  stepIndex: number
}

/** The permission pattern for one site, e.g. "https://app.example.com/*". */
export function sitePattern(origin: string): string {
  return `${origin}/*`
}

/**
 * Where to open the guide: its first page, unless an id was masked out of
 * that page's address, in which case the site's front page. The guide says
 * which page each step is on, as any guide does.
 */
export function startUrl(shared: Shared): string {
  const first = shared.flow.steps.find(
    (step): step is ActionStep | InputStep => step.type !== 'instruction',
  )
  const page = first?.target.url
  const usable = page?.startsWith('/') && !page.split('/').includes('*')
  return `${shared.origin}${usable ? page : '/'}`
}

/**
 * Somewhere the player can keep its place that is not the site's own
 * storage: each step reached is handed to `onStep`. The player remembers
 * progress through a `Storage`, so this is one, with nothing in it.
 */
export function progressReporter(onStep: (stepIndex: number) => void): Storage {
  return {
    length: 0,
    clear: () => undefined,
    key: () => null,
    getItem: () => null,
    removeItem: () => undefined,
    setItem: (_key: string, value: string) => {
      try {
        const saved = JSON.parse(value) as { stepIndex?: unknown }
        if (typeof saved.stepIndex === 'number') onStep(saved.stepIndex)
      } catch {
        // Not progress; nothing to report.
      }
    },
  }
}

/** The steps as lines, for someone following without the cursor. */
export function stepsAsLines(flow: Flow): string[] {
  return flow.steps.map((step, index) => `${index + 1}. ${step.text}`)
}
