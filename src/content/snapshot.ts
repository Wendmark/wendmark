/**
 * Snapshot of the interactive elements currently visible, for AI rescue.
 * Structure and labels only — input values are never read.
 */
import { querySelectorAllDeep } from 'query-selector-shadow-dom'
import type { LocateCandidate } from '../background/index'
import { getVisibleText, getRole, getAccessibleName, stableClasses, findContext } from './selector'
import { isVisible } from './resolve'
import { OVERLAY_TAG } from './overlay'

const SNAPSHOT_SELECTOR =
  'button, a, input, select, textarea, summary, label, li, tr, [role], [onclick], [tabindex]'
const MAX_CANDIDATES = 250

export function collectCandidates(): { elements: Element[]; descs: LocateCandidate[] } {
  const elements: Element[] = []
  const descs: LocateCandidate[] = []
  for (const el of querySelectorAllDeep(SNAPSHOT_SELECTOR)) {
    if (elements.length >= MAX_CANDIDATES) break
    if (el.closest(OVERLAY_TAG)) continue
    if (!isVisible(el)) continue
    const text = getVisibleText(el).slice(0, 60)
    const name = getAccessibleName(el).slice(0, 60)
    if (!text && !name) continue
    descs.push({
      index: elements.length,
      tag: el.tagName.toLowerCase(),
      role: getRole(el) || (el.getAttribute('role') ?? ''),
      text,
      name,
      classes: stableClasses(el).slice(0, 3),
      context: findContext(el).slice(0, 40),
    })
    elements.push(el)
  }
  return { elements, descs }
}
