import type { Flow, Step } from '@wendmark/core'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SHARE, shareable } from './share'
import {
  MAX_LINK,
  PLAY_URL,
  fileName,
  fromFile,
  fromLink,
  fromPasted,
  linkIfShort,
  readShared,
  toFile,
  toLink,
  toText,
  type Shared,
} from './transfer'

/** A realistic recorded step: selectors as long as real ones get. */
function step(n: number): Step {
  return {
    type: 'action',
    id: `s${n}`,
    text: `Click Settings item ${n}`,
    dynamic: false,
    target: {
      selectors: [
        `#root div.app-shell > main.content > section.settings-panel:nth-of-type(2) > ul.menu > li:nth-of-type(${n}) > button.menu-item`,
      ],
      role: 'button',
      name: `Settings item ${n}`,
      url: `/settings/team/${n}`,
    },
  }
}

const tenSteps: Flow = {
  schemaVersion: 1,
  id: 'draft-1',
  name: 'Reproduce the billing bug',
  steps: Array.from({ length: 10 }, (_, i) => step(i + 1)) as [Step, ...Step[]],
}

function shared(flow: Flow = tenSteps): Shared {
  // What the preview hands over: masked, as by default.
  const masked = shareable(flow, DEFAULT_SHARE)
  if (!masked) throw new Error('nothing to share')
  return { origin: 'https://app.example.com', flow: masked }
}

describe('a link', () => {
  it('carries a ten-step guide in a length chat tools take, and comes back unchanged', async () => {
    const guide = shared()
    const link = await toLink(guide)
    expect(link.startsWith(`${PLAY_URL}#g=`)).toBe(true)
    expect(link.length).toBeLessThanOrEqual(MAX_LINK)
    // Nothing a chat tool would break or re-encode.
    expect(link).toMatch(/^https:\/\/wendmark\.dev\/play#g=[A-Za-z0-9_-]+$/)
    expect(await fromLink(link)).toEqual(guide)
  })

  it('still fits with the words kept', async () => {
    const link = await toLink({ ...shared(), flow: tenSteps })
    expect(link.length).toBeLessThanOrEqual(MAX_LINK)
  })

  it('is not offered for a guide too long for one', async () => {
    const long: Flow = {
      ...tenSteps,
      steps: Array.from({ length: 80 }, (_, i) => ({
        ...step(i + 1),
        text: `Step ${i + 1}: ${Math.random().toString(36).repeat(4)}`,
      })) as [Step, ...Step[]],
    }
    expect(await linkIfShort({ origin: 'https://app.example.com', flow: long })).toBeNull()
  })

  it('reads a copy of the play page hosted elsewhere, and nothing that is not one', async () => {
    const link = await toLink(shared())
    const elsewhere = link.replace('https://wendmark.dev/play', 'https://help.example.com/play')
    expect(await fromLink(elsewhere)).toEqual(shared())
    expect(await fromLink('https://wendmark.dev/play#g=not-a-guide')).toBeNull()
    expect(await fromLink('https://wendmark.dev/play')).toBeNull()
  })
})

describe('text', () => {
  it('lists the steps for someone with nothing installed', () => {
    const text = toText(shared(), null)
    const lines = text.split('\n')
    expect(lines[0]).toBe('Reproduce the billing bug')
    expect(lines[1]).toBe('On app.example.com')
    expect(lines[3]).toBe('1. Press a button (on /settings/team/*)')
    expect(lines[4]).toBe('2. Press a button')
    expect(text).not.toContain('wendmark.dev')
  })

  it('round-trips through import when it carries the link', async () => {
    const guide = shared()
    const text = toText(guide, await toLink(guide))
    expect(await fromPasted(text)).toEqual(guide)
  })
})

describe('a file', () => {
  it('round-trips through import', async () => {
    const guide = shared()
    expect(fromFile(toFile(guide))).toEqual(guide)
    expect(await fromPasted(toFile(guide))).toEqual(guide)
    expect(fileName(guide)).toBe('reproduce-the-billing-bug.wendmark.json')
  })

  it('is not mistaken for any other JSON', () => {
    const { format: _format, ...unmarked } = JSON.parse(toFile(shared())) as Record<string, unknown>
    expect(fromFile(JSON.stringify(unmarked))).toBeNull()
    expect(fromFile('not json')).toBeNull()
  })
})

describe('what arrives is checked, never trusted', () => {
  const good = () => JSON.parse(JSON.stringify({ v: 1, ...shared() })) as Record<string, unknown>

  it('needs a real web origin', () => {
    expect(readShared({ ...good(), origin: 'javascript:alert(1)' })).toBeNull()
    expect(readShared({ ...good(), origin: 'https://app.example.com/path' })).toBeNull()
    expect(readShared({ ...good(), origin: 'file:///etc' })).toBeNull()
  })

  it('refuses a guide from a newer Wendmark, or of an unknown version', () => {
    expect(readShared({ ...good(), v: 2 })).toBeNull()
    const flow = good().flow as Record<string, unknown>
    expect(readShared({ ...good(), flow: { ...flow, schemaVersion: 99 } })).toBeNull()
  })

  it('refuses steps with fields the format does not have', () => {
    const flow = good().flow as { steps: Record<string, unknown>[] }
    const steps = flow.steps.map((one) => ({ ...one, value: 'hunter2' }))
    expect(readShared({ ...good(), flow: { ...flow, steps } })).toBeNull()
  })
})
