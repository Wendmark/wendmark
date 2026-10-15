/**
 * Getting a guide to somebody else: as a link, as text, or as a file, and
 * back in again.
 *
 * What travels is always the same thing, `{ v: 1, origin, flow }`: the site
 * the guide starts on, and the flow as the preview showed it (share.ts).
 *
 * - **Link.** The JSON is compressed with the browser's own
 *   `CompressionStream` and put after `#` in
 *   `https://wendmark.dev/play#g=…`. The part after `#` is never sent to
 *   any server, wendmark.dev included. See the decision record,
 *   docs/decisions/browser-extension.md, "Sharing".
 * - **Text.** Numbered steps a person can follow without anything
 *   installed, with the link underneath when there is one. Importing text
 *   means finding that link in it.
 * - **File.** `.wendmark.json`, for a guide too long for a link.
 */
import { FlowSchema, type Flow } from '@wendmark/core'
import { checkFlow } from '@wendmark/core/guard'

/** The page a shared link opens. */
export const PLAY_URL = 'https://wendmark.dev/play'

/**
 * The longest link offered. Chat tools, email and older browsers all carry
 * 2,000 characters; above that, "Copy link" offers the file instead.
 */
export const MAX_LINK = 2000

/** What a file says it is, so an unrelated JSON file is not mistaken for one. */
const FILE_FORMAT = 'wendmark-guide'

export const FILE_EXTENSION = '.wendmark.json'

export interface Shared {
  /** The site the guide starts on, e.g. "https://app.example.com". */
  origin: string
  flow: Flow
}

/** An origin as the browser writes one, and nothing else. */
function readOrigin(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.origin === value ? value : null
  } catch {
    return null
  }
}

/** A shared guide as it arrives: checked all the way, never cast. */
export function readShared(value: unknown): Shared | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  if (raw.v !== 1) return null
  const origin = readOrigin(raw.origin)
  if (!origin) return null
  // A guide made by a newer Wendmark than this one cannot be played here.
  if (checkFlow(raw.flow) !== 'ok') return null
  const flow = FlowSchema.safeParse(raw.flow)
  return flow.success ? { origin, flow: flow.data } : null
}

function wire(shared: Shared): string {
  return JSON.stringify({ v: 1, origin: shared.origin, flow: shared.flow })
}

// ---- base64url, without padding: safe after # and in chat tools ----

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null
  const padded =
    text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)
  try {
    const binary = atob(padded)
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}

async function transform(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const output = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(output).arrayBuffer())
}

/** Anything decompressed beyond this is not a guide. */
const MAX_DECOMPRESSED = 2 * 1024 * 1024

/** Longer than any link this makes, by far: files are for anything bigger. */
const MAX_ENCODED = 64 * 1024

// ---- link ----

export async function toLink(shared: Shared): Promise<string> {
  const compressed = await transform(
    new TextEncoder().encode(wire(shared)),
    new CompressionStream('deflate-raw'),
  )
  return `${PLAY_URL}#g=${toBase64Url(compressed)}`
}

/** A link short enough to offer, or null when the file is the way. */
export async function linkIfShort(shared: Shared): Promise<string | null> {
  const link = await toLink(shared)
  return link.length <= MAX_LINK ? link : null
}

/**
 * A guide from a play link, or null. Any address whose `#` holds `g=` is
 * read, so a company's own copy of the play page works too.
 */
export async function fromLink(link: string): Promise<Shared | null> {
  const match = /#(?:.*&)?g=([A-Za-z0-9_-]+)/.exec(link)
  // Checked before decompressing: a link is never this long, and a crafted
  // one should not get to inflate into something huge.
  if (!match?.[1] || match[1].length > MAX_ENCODED) return null
  const bytes = fromBase64Url(match[1])
  if (!bytes) return null
  try {
    const json = await transform(bytes, new DecompressionStream('deflate-raw'))
    if (json.length > MAX_DECOMPRESSED) return null
    return readShared(JSON.parse(new TextDecoder().decode(json)))
  } catch {
    return null
  }
}

// ---- text ----

/** Where a step happens, when it says. */
function pageOf(step: Flow['steps'][number]): string | null {
  return step.type === 'instruction' ? null : (step.target.url ?? null)
}

/**
 * Steps a person can follow from a ticket or a chat message. The link, if
 * there is one, goes underneath for anyone with the extension.
 */
export function toText(shared: Shared, link: string | null): string {
  const host = new URL(shared.origin).host
  const lines = [shared.flow.name, `On ${host}`, '']
  let lastPage: string | null = null
  shared.flow.steps.forEach((step, index) => {
    const page = pageOf(step)
    const where = page && page !== lastPage ? ` (on ${page})` : ''
    if (page) lastPage = page
    lines.push(`${index + 1}. ${step.text}${where}`)
  })
  if (link) lines.push('', `Follow it with the cursor, using Wendmark: ${link}`)
  return lines.join('\n')
}

// ---- file ----

export function toFile(shared: Shared): string {
  return `${JSON.stringify(
    { format: FILE_FORMAT, v: 1, origin: shared.origin, flow: shared.flow },
    null,
    2,
  )}\n`
}

export function fileName(shared: Shared): string {
  const slug = shared.flow.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return `${slug || 'guide'}${FILE_EXTENSION}`
}

export function fromFile(text: string): Shared | null {
  try {
    const value: unknown = JSON.parse(text)
    if (typeof value !== 'object' || value === null) return null
    if ((value as { format?: unknown }).format !== FILE_FORMAT) return null
    return readShared(value)
  } catch {
    return null
  }
}

// ---- import, from whatever was pasted ----

/** A guide from a file's contents, a link, or text with a link in it. */
export async function fromPasted(text: string): Promise<Shared | null> {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return fromFile(trimmed)
  const link = /https?:\/\/\S+#\S*g=[A-Za-z0-9_-]+/.exec(trimmed)?.[0]
  return link ? fromLink(link) : null
}
