import { NextResponse } from 'next/server'
import { redeemAuthorToken } from '../../../../../lib/auth/author-tokens'
import { getDb } from '../../../../../lib/db'
import { isAllowedOrigin } from '../../../../../lib/apps/origins'
import { allowedHeaders } from '../../../../../lib/http/cors'

/**
 * The snippet swapping a one-time token for an author session.
 *
 * Called from a customer's app, so it is cross-origin, and the reply carries
 * CORS headers only for that app's registered addresses. Every refusal reads
 * the same, so the endpoint tells nobody which tokens or apps are real.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const origin = request.headers.get('origin') ?? ''

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return refuse(origin)
  }

  const token =
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { token?: unknown }).token === 'string'
      ? (body as { token: string }).token
      : ''

  const result = await redeemAuthorToken(token, origin)
  if (!result.ok) return refuse(origin)

  const headers = await corsHeadersFor(result.session.appId, origin)
  if (!headers) return refuse(origin)

  return NextResponse.json(
    {
      sessionToken: result.sessionToken,
      appId: result.session.appId,
      expiresAt: result.session.expiresAt.toISOString(),
    },
    { status: 200, headers },
  )
}

export async function OPTIONS(request: Request): Promise<NextResponse> {
  const origin = request.headers.get('origin') ?? ''
  // The token has not been seen yet, so a preflight can only be answered
  // permissively; the POST itself is what checks anything.
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

/** One refusal for every reason, so nothing can be learned from the answer. */
function refuse(origin: string): NextResponse {
  return NextResponse.json(
    { error: 'That authoring link is no longer valid.' },
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
