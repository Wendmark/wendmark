import { NextResponse } from 'next/server'
import { startPairing } from '../../../../../../lib/auth/pairing'

/**
 * A snippet asking to record: "this app, at this address, with this code".
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

  const fields = (body ?? {}) as { key?: unknown; code?: unknown }
  if (typeof fields.key === 'string' && typeof fields.code === 'string' && origin) {
    await startPairing({ key: fields.key, origin, code: fields.code })
  }

  return accepted(origin)
}

export function OPTIONS(request: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: cors(request.headers.get('origin') ?? '') })
}

function accepted(origin: string): NextResponse {
  return NextResponse.json({ ok: true }, { status: 202, headers: cors(origin) })
}

function cors(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  }
}
