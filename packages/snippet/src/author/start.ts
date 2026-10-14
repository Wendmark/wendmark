import { appKey, portalOrigin } from '../install/ping'
import { loadAuthorBundle, type SnippetApi } from './loader'
import {
  askPermission,
  clearHint,
  generateCode,
  requestedPurpose,
  waitForApproval,
} from './pairing'

/**
 * Author mode, from the page's point of view: recording a process, or
 * replaying a problem report.
 *
 * Ask the portal for permission, wait for it to be approved there, then
 * fetch the authoring interface. Anything that fails leaves the page exactly
 * as it was: a visitor must never see a trace of this.
 */
export async function startAuthorModeIfAsked(
  doc: Document,
  view: Window,
  api: SnippetApi,
): Promise<void> {
  const purpose = requestedPurpose(view)
  if (!purpose) return
  clearHint(view)

  const portal = portalOrigin(doc)
  const key = appKey(doc)
  if (!portal || !key) return

  const code = generateCode(view)
  if (!(await askPermission(portal, key, code, purpose))) return

  const session = await waitForApproval(view, portal, code)
  if (!session) return

  const author = await loadAuthorBundle(doc, view, portal)
  const context = { session, portalOrigin: portal, doc, view, api }
  if (purpose === 'replay') void author?.replay?.(context)
  else author?.start(context)
}
