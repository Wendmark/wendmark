import { NextResponse } from 'next/server'
import { isPublicKey } from '../../../../lib/apps/keys'
import { isAllowedOrigin } from '../../../../lib/apps/origins'
import { buildConfig, configEtag, readFormatVersion } from '../../../../lib/flows/config'
import { getDb } from '../../../../lib/db'
import { allowedHeaders } from '../../../../lib/http/cors'

/**
 * What an app's snippet asks for on page load.
 *
 * Public to the app's registered origins and the same for every visitor: no
 * session, no cookie, nothing about a person. An unknown key gets an empty
 * answer rather than a refusal, because a public endpoint should not help
 * anyone work out which keys are real.
 */

/**
 * Never a build-time answer. A process published a minute ago must appear,
 * and freshness here is what ETag revalidation is for.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<NextResponse> {
  const origin = request.headers.get('origin') ?? ''
  const params = new URL(request.url).searchParams

  const key = params.get('key') ?? ''
  if (!isPublicKey(key)) return empty(origin)

  const app = await getDb().app.findUnique({
    where: { publicKey: key },
    select: { id: true, origins: true },
  })
  if (!app) return empty(origin)

  // A browser only sends Origin on cross-origin requests; same-origin calls
  // (the portal's own pages, curl) send none, and those are not granted a
  // CORS header at all.
  if (origin !== '' && !isAllowedOrigin(app.origins, origin)) return empty(origin)

  const config = await buildConfig(app.id, {
    url: params.get('url'),
    formatVersion: readFormatVersion(params.get('v')),
  })

  const etag = configEtag(config)
  const headers = {
    ...cors(origin, app.origins),
    ETag: etag,
    // Always ask, never assume: the answer is cheap and a process published
    // a minute ago should not wait for a cache to expire.
    'Cache-Control': 'no-cache',
  }

  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers })
  }

  return NextResponse.json(config, { status: 200, headers })
}

export function OPTIONS(request: Request): NextResponse {
  const origin = request.headers.get('origin') ?? ''
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': allowedHeaders(
        request.headers.get('access-control-request-headers'),
      ),
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    },
  })
}

/**
 * Nothing to offer.
 *
 * The same answer for an unknown key, an address that is not on the app's
 * list, and an app with no published processes — none of which the caller
 * can tell apart.
 */
function empty(origin: string): NextResponse {
  return NextResponse.json(
    { flows: [], launcher: { enabled: false }, reports: { enabled: false, labels: 'none' } },
    { status: 200, headers: { ...cors(origin, []), 'Cache-Control': 'no-store' } },
  )
}

/** A CORS header only for an address this app is registered on. */
function cors(origin: string, origins: string[]): Record<string, string> {
  const allowed = origin !== '' && isAllowedOrigin(origins, origin)
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
    Vary: 'Origin',
  }
}
