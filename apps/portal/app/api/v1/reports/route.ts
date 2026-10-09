import { NextResponse } from 'next/server'
import { isPublicKey } from '../../../../lib/apps/keys'
import { isAllowedOrigin } from '../../../../lib/apps/origins'
import { getDb } from '../../../../lib/db'
import { allowedHeaders } from '../../../../lib/http/cors'
import { createLimiter } from '../../../../lib/rate-limit'
import { MAX_BODY_BYTES, readReport, recordReport } from '../../../../lib/reports/write'

/**
 * "Here is what I did, and it did not work."
 *
 * Public by necessity: the person sending it is a customer of one of our
 * customers and has no portal account to sign in to. So it is keyed by the
 * app's public key, which anyone can read out of the page — and therefore
 * stricter than /api/v1/ping, which is equally public but only writes a
 * timestamp. This writes rows with content in them.
 *
 * Four brakes: the Origin has to be on the app's allowlist, the body is
 * capped before it is parsed, the rate is limited per app and origin, and the
 * app has to have the feature switched on at all.
 *
 * See docs/decisions/problem-reports.md.
 */

export const dynamic = 'force-dynamic'

/**
 * Somebody reporting a problem sends one. Five a minute leaves room for a
 * second thought and a retry, and stops a script.
 *
 * In memory, per process, like every other limiter here: a brake on a
 * runaway script and not a defence against a determined attacker, which
 * belongs in a proxy. docs/security.md says so already.
 */
const limiter = createLimiter({ allowed: 5, windowMs: 60_000 })

export async function POST(request: Request): Promise<NextResponse> {
  const origin = request.headers.get('origin') ?? ''
  const key = new URL(request.url).searchParams.get('key') ?? ''

  // Everything below answers 202 and says nothing. A public endpoint that
  // explained itself would tell anyone which keys are real, which apps have
  // reports switched on, and which addresses are allowed. The snippet knows
  // whether to offer the button because /api/v1/config told it, over the
  // same Origin check.
  if (!isPublicKey(key)) return accepted(origin)

  // Unlike config, a missing Origin is not enough here. Config answers with
  // public metadata; this writes a row, so a caller that cannot prove where
  // it came from does not get to.
  if (origin === '') return accepted(origin)

  const app = await getDb().app.findUnique({
    where: { publicKey: key },
    select: { origins: true },
  })
  if (!app || !isAllowedOrigin(app.origins, origin)) return accepted(origin)

  if (!limiter.check(`${key}|${origin}`).ok) return accepted(origin)

  const body = await readBody(request)
  if (body === null) return accepted(origin)

  const report = readReport(body)
  if (report) await recordReport(key, report, { origin })

  return accepted(origin)
}

/** Browsers preflight this, because the snippet sends JSON. */
export function OPTIONS(request: Request): NextResponse {
  const origin = request.headers.get('origin') ?? ''
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...cors(origin),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': allowedHeaders(
        request.headers.get('access-control-request-headers'),
      ),
      'Access-Control-Max-Age': '600',
    },
  })
}

/**
 * The body, if it is small enough and is JSON.
 *
 * Content-Length is checked because it is free, and the text is measured
 * again because the header is the client's claim and a streamed request may
 * not send one at all.
 */
async function readBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null

  let text: string
  try {
    text = await request.text()
  } catch {
    return null
  }
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return null

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * The only answer this endpoint gives.
 *
 * 202 rather than 200: whether a report was stored is genuinely not
 * something the caller is told.
 */
function accepted(origin: string): NextResponse {
  return NextResponse.json({ ok: true }, { status: 202, headers: cors(origin) })
}

/**
 * A CORS header for whoever asked.
 *
 * Echoed rather than checked, because the answer is the same for everyone
 * and carries nothing: looking up the app to decide whether to let a caller
 * read `{"ok":true}` would be a database query spent on nothing.
 */
function cors(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  }
}
