import { NextResponse } from 'next/server'
import { isPublicKey } from '../../../../../lib/apps/keys'
import { isAllowedOrigin } from '../../../../../lib/apps/origins'
import { buildPlayableFlow, readFormatVersion } from '../../../../../lib/flows/config'
import { getDb } from '../../../../../lib/db'

/**
 * The steps of one published process.
 *
 * Asked for when someone chooses a process, not on every page load: the
 * config endpoint lists what exists, and this is what it costs to actually
 * follow one. Public to the app's registered origins, and identical for
 * every visitor.
 */

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ flowId: string }> },
): Promise<NextResponse> {
  const origin = request.headers.get('origin') ?? ''
  const { flowId } = await params
  const search = new URL(request.url).searchParams

  const key = search.get('key') ?? ''
  if (!isPublicKey(key)) return missing(origin)

  const app = await getDb().app.findUnique({
    where: { publicKey: key },
    select: { id: true, origins: true },
  })
  if (!app) return missing(origin)
  if (origin !== '' && !isAllowedOrigin(app.origins, origin)) return missing(origin)

  const flow = await buildPlayableFlow(app.id, flowId, readFormatVersion(search.get('v')))
  if (!flow) return missing(origin, app.origins)

  return NextResponse.json(flow, {
    status: 200,
    headers: { ...cors(origin, app.origins), 'Cache-Control': 'no-cache' },
  })
}

export function OPTIONS(request: Request): NextResponse {
  const origin = request.headers.get('origin') ?? ''
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    },
  })
}

/**
 * One answer for a process that is a draft, paused, deleted, another app's,
 * or never existed — and for a key or an address that is not right either.
 */
function missing(origin: string, origins: string[] = []): NextResponse {
  return NextResponse.json(
    { error: 'That process is not available.' },
    { status: 404, headers: { ...cors(origin, origins), 'Cache-Control': 'no-store' } },
  )
}

function cors(origin: string, origins: string[]): Record<string, string> {
  const allowed = origin !== '' && isAllowedOrigin(origins, origin)
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
    Vary: 'Origin',
  }
}
