import { NextResponse } from 'next/server'
import { readPing, recordPing } from '../../../../lib/apps/install'
import { allowedHeaders } from '../../../../lib/http/cors'

/**
 * "The snippet is alive on this page."
 *
 * Public and cross-origin by nature: it is called from customers' sites. It
 * takes an app's public key and the origin it was used from, and nothing
 * about the person browsing. The reply says nothing either — a public
 * endpoint should not help anyone find out which keys are real.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true }, { status: 202, headers: corsHeaders() })
  }

  const ping = readPing(body)
  if (ping) await recordPing(ping)

  return NextResponse.json({ ok: true }, { status: 202, headers: corsHeaders() })
}

/** Browsers may preflight this when a page sends JSON. */
export function OPTIONS(request: Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('access-control-request-headers')),
  })
}

function corsHeaders(requested: string | null = null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': allowedHeaders(requested),
    'Cache-Control': 'no-store',
  }
}
