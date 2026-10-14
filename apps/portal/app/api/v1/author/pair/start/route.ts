import { NextResponse } from 'next/server'
import { isPairingPurpose, startPairing } from '../../../../../../lib/auth/pairing'
import { allowedHeaders } from '../../../../../../lib/http/cors'

/**
 * A snippet asking to record, or to replay a report: "this app, at this
 * address, with this code, for this purpose".
 *
 * Public and cross-origin. The answer is the same whatever happens, so
 * nothing can be learned about which keys or addresses exist. Nothing is
 * granted here; approval happens in the portal.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const origin = request.headers.get('origin') ?? ''

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return accepted(origin)
  }

  const fields = (body ?? {}) as { key?: unknown; code?: unknown; purpose?: unknown }
  // An older snippet sends no purpose, and only ever wanted to record.
  const purpose = fields.purpose === undefined ? 'record' : fields.purpose
  if (
    typeof fields.key === 'string' &&
    typeof fields.code === 'string' &&
    isPairingPurpose(purpose) &&
    origin
  ) {
    await startPairing({ key: fields.key, origin, code: fields.code, purpose })
  }

  return accepted(origin)
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

function accepted(origin: string): NextResponse {
  return NextResponse.json({ ok: true }, { status: 202, headers: cors(origin) })
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
