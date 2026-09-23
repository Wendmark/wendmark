import { appKey, portalOrigin } from '../install/ping'
import { loadAuthorBundle } from './loader'
import { askToRecord, clearHint, generateCode, waitForApproval, wantsAuthorMode } from './pairing'

/**
 * Author mode, from the page's point of view.
 *
 * Ask the portal for permission, wait for it to be approved there, then
 * fetch the authoring interface. Anything that fails leaves the page exactly
 * as it was: a visitor must never see a trace of this.
 */
export async function startAuthorModeIfAsked(doc: Document, view: Window): Promise<void> {
  if (!wantsAuthorMode(view)) return
  clearHint(view)

  const portal = portalOrigin(doc)
  const key = appKey(doc)
  if (!portal || !key) return

  const code = generateCode(view)
  if (!(await askToRecord(portal, key, code))) return

  const session = await waitForApproval(view, portal, code)
  if (!session) return

  const author = await loadAuthorBundle(doc, view, portal)
  author?.start({ session, portalOrigin: portal, doc, view })
}
