import { NextResponse } from 'next/server'
import { verifyReplaySession } from '../../../../../lib/auth/author-tokens'
import { getDb } from '../../../../../lib/db'
import { isAllowedOrigin } from '../../../../../lib/apps/origins'
import { allowedHeaders } from '../../../../../lib/http/cors'
import { reportForReplay } from '../../../../../lib/reports/replay'

/**
 * The snippet fetching the one report it was approved to replay.
 *
 * Cross-origin, like the rest of author mode. The session token in the body
 * is the whole claim, and all it is worth is this one report: it cannot
 * list reports, read another one, or save anything. A POST, so the token
 * never sits in an address or a log of them.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const origin = request.headers.get('origin') ?? ''

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return refuse(origin)
  }

  const token = (body as { sessionToken?: unknown } | null)?.sessionToken
  if (typeof token !== 'string' || !origin) return refuse(origin)

  const session = await verifyReplaySession(token, origin)
  if (!session) return refuse(origin)

  const headers = await corsHeadersFor(session.appId, origin)
  if (!headers) return refuse(origin)

  const report = await reportForReplay(session)
  if (!report) return refuse(origin)

  return NextResponse.json(report, { status: 200, headers })
}

export function OPTIONS(request: Request): NextResponse {
  const origin = request.headers.get('origin') ?? ''
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': allowedHeaders(
        request.headers.get('access-control-request-headers'),
      ),
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

/** One refusal for every reason: expired, wrong address, report gone. */
function refuse(origin: string): NextResponse {
  return NextResponse.json(
    { error: 'That replay is no longer valid. Start it again from the portal.' },
    {
      status: 401,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Cache-Control': 'no-store',
        Vary: 'Origin',
      },
    },
  )
}
