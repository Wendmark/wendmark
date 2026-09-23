import { NextResponse } from 'next/server'
import { verifyAuthorSession } from '../../../../../lib/auth/author-tokens'
import { getDb } from '../../../../../lib/db'
import { isAllowedOrigin } from '../../../../../lib/apps/origins'
import { isWithinSizeLimit, readDraftRequest, MAX_BODY_BYTES } from '../../../../../lib/flows/draft'
import { saveAuthorDraft } from '../../../../../lib/flows/service'
import { createLimiter } from '../../../../../lib/rate-limit'

/**
 * Author mode saving what it recorded.
 *
 * Called from a customer's app, so it is cross-origin and unauthenticated in
 * the browser sense: the session token in the body is the whole claim. What
 * that token can do is therefore kept small — it writes a draft of one app,
 * and nothing else.
 */

/** A person saves a recording a few times an hour, not a few times a second. */
const limiter = createLimiter({ allowed: 30, windowMs: 60_000 })

export async function POST(request: Request): Promise<NextResponse> {
  const origin = request.headers.get('origin') ?? ''

  const declared = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && !isWithinSizeLimit(declared)) return tooBig(origin)

  const raw = await request.text()
  if (!isWithinSizeLimit(byteLength(raw))) return tooBig(origin)

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return refuse(origin)
  }

  const read = readDraftRequest(body)
  // Reading the body first, then the session: a malformed request is worth
  // the same answer whether or not the token behind it is real.
  if (!read.ok) return bad(origin, read.error)

  const session = await verifyAuthorSession(read.request.sessionToken, origin)
  if (!session) return refuse(origin)

  const verdict = limiter.check(session.appId)
  if (!verdict.ok) return tooMany(origin, verdict.retryAfterSeconds)

  const headers = await corsHeadersFor(session.appId, origin)
  // The session already matched this origin, so a missing app or a removed
  // address means the ground moved under it.
  if (!headers) return refuse(origin)

  const draft = await saveAuthorDraft(session, read.request.flow)

  return NextResponse.json(
    { id: draft.id, name: draft.name, status: 'draft' },
    { status: 201, headers },
  )
}

export function OPTIONS(request: Request): NextResponse {
  const origin = request.headers.get('origin') ?? ''
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    },
  })
}

/** CORS headers, but only for an address this app is registered on. */
async function corsHeadersFor(
  appId: string,
  origin: string,
): Promise<Record<string, string> | null> {
  const app = await getDb().app.findUnique({ where: { id: appId }, select: { origins: true } })
  if (!app || !isAllowedOrigin(app.origins, origin)) return null

  return {
    'Access-Control-Allow-Origin': origin,
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  }
}

/** What the request weighs, counting characters that take more than a byte. */
function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

function bad(origin: string, error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400, headers: cors(origin) })
}

function tooBig(origin: string): NextResponse {
  return NextResponse.json(
    { error: `That recording is too large. The limit is ${MAX_BODY_BYTES / 1024} KB.` },
    { status: 413, headers: cors(origin) },
  )
}

function tooMany(origin: string, retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many saves at once. Try again in a moment.' },
    {
      status: 429,
      headers: { ...cors(origin), 'Retry-After': String(retryAfterSeconds) },
    },
  )
}

/** One refusal for every reason a session can be no good. */
function refuse(origin: string): NextResponse {
  return NextResponse.json(
    { error: 'That recording session is no longer valid. Start recording again from the portal.' },
    { status: 401, headers: cors(origin) },
  )
}

function cors(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  }
}
