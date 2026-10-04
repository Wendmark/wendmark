import { NextResponse } from 'next/server'
import { collectPairing } from '../../../../../../lib/auth/pairing'
import { allowedHeaders } from '../../../../../../lib/http/cors'

/**
 * A snippet asking whether its request has been approved yet.
 *
 * Answers with the session exactly once, then the request is gone. Anything
 * else — not approved, wrong address, expired, invented — is the same empty
 * "not yet".
 */
export async function POST(request: Request): Promise<NextResponse> {
  const origin = request.headers.get('origin') ?? ''

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return waiting(origin)
  }

  const code = (body as { code?: unknown } | null)?.code
  if (typeof code !== 'string' || !origin) return waiting(origin)

  const result = await collectPairing(code, origin)
  if (!result.ok) return waiting(origin)

  return NextResponse.json(
    { sessionToken: result.sessionToken, appId: result.appId, expiresAt: result.expiresAt },
    { status: 200, headers: cors(origin) },
  )
}

export function OPTIONS(request: Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: cors(
      request.headers.get('origin') ?? '',
      request.headers.get('access-control-request-headers'),
    ),
  })
}

function waiting(origin: string): NextResponse {
  return NextResponse.json({ waiting: true }, { status: 202, headers: cors(origin) })
}

function cors(origin: string, requested: string | null = null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': allowedHeaders(requested),
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  }
}
