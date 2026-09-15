/**
 * Multi-signal step resolution. Every candidate element is scored across all
 * of a step's recorded anchors — selector match, visible text, accessible
 * name, role, stable classes, section context — and the best-scoring
 * candidate above a threshold wins. No single fragile anchor can send
 * guidance to the wrong element on its own. Fully offline.
 */
import { querySelectorAllDeep } from 'query-selector-shadow-dom'
import type { Step } from '../types'
import { OVERLAY_TAG } from './overlay'
import { getRole, findContext } from './selector'

const SCORE_SELECTOR = 4
/** Exact text/name agreement outranks a bare selector match — a drifted
 * structural path must never beat the element that says the right thing. */
const SCORE_TEXT_EXACT = 5
const SCORE_TEXT_PARTIAL = 1
/** Selector matched but the text says something else — likely a drifted path. */
const PENALTY_TEXT_DISAGREES = 2
const SCORE_ROLE = 1
const SCORE_CLASSES = 2
const SCORE_CONTEXT = 1
/** A lone partial text match (1) or lone class overlap (2) is not enough. */
const ACCEPT_THRESHOLD = 3

/**
 * Fuzzy URL comparison for step preconditions. Path segments that look
 * dynamic (ids, uuids) are treated as wildcards, so a step recorded on
 * /vessel/12345/orders matches /vessel/98765/orders. Hash-based SPA routes
 * (#/...) are compared the same way; queries and plain anchors are ignored.
 */
export function urlMatches(recorded: string, current: string): boolean {
  const a = urlParts(recorded)
  const b = urlParts(current)
  if (!a || !b) return true // unparseable — don't block playback on it
  if (a.origin !== b.origin) return false
  // Recorded at the origin root (common in SPAs that don't route via URL):
  // the URL carries no information, so treat any page on the origin as a match.
  if (a.parts.length === 0) return true
  if (a.parts.length !== b.parts.length) return false
  return a.parts.every((seg, i) => seg === b.parts[i] || looksDynamic(seg) || looksDynamic(b.parts[i]))
}

/** Short human-readable form of a step URL for "go here" hints. */
export function prettyPath(url: string): string {
  const p = urlParts(url)
  return p ? `/${p.parts.join('/')}` : url
}

function urlParts(raw: string): { origin: string; parts: string[] } | null {
  try {
    const url = new URL(raw)
    const route = url.hash.startsWith('#/') ? url.hash.slice(1) : ''
    return {
      origin: url.origin,
      parts: (url.pathname + route).split('/').filter(Boolean),
    }
  } catch {
    return null
  }
}

function looksDynamic(seg: string): boolean {
  return /\d/.test(seg) || seg.length > 24
}

export function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return false
  const style = getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

function isOurs(el: Element): boolean {
  return el.tagName.toLowerCase() === OVERLAY_TAG || el.closest(OVERLAY_TAG) !== null
}

type TextMatch = 'exact' | 'partial' | 'none'

/** Compare an element's text/label against the step's recorded texts. */
function textMatch(el: Element, wantedTexts: string[]): TextMatch {
  if (wantedTexts.length === 0) return 'none'
  const label = normalize(
    el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? '',
  )
  const own = el.textContent ?? ''
  const maxWanted = Math.max(...wantedTexts.map((w) => w.length))
  // Bound so huge containers can't "contain" their way to a match.
  const text = own.length > maxWanted * 3 + 120 ? '' : normalize(own)

  let best: TextMatch = 'none'
  for (const wanted of wantedTexts) {
    if (text === wanted || label === wanted) return 'exact'
    if (wanted.length >= 3 && (text.includes(wanted) || label.includes(wanted))) {
      best = 'partial'
    }
  }
  return best
}

/**
 * For dynamic steps (target is a data item, not fixed UI): find every
 * visible element that structurally resembles the recorded one — same
 * selector shape, class combination, role, and section — WITHOUT matching
 * the recorded text, since the data differs per user/environment. The
 * caller highlights the group and advances on a click on any of them.
 */
export function resolveDynamicTargets(step: Step): Element[] {
  const found = new Set<Element>()

  if (step.selector) {
    try {
      for (const el of querySelectorAllDeep(step.selector)) {
        if (isVisible(el) && !isOurs(el)) found.add(el)
      }
    } catch {
      // invalid selector — class matching below carries the load
    }
  }

  const classes = (step.classes ?? []).filter(Boolean)
  if (classes.length >= 2) {
    try {
      const classSelector = classes.map((c) => `.${CSS.escape(c)}`).join('')
      for (const el of querySelectorAllDeep(classSelector)) {
        if (isVisible(el) && !isOurs(el)) found.add(el)
      }
    } catch {
      // unusable class names — ignore
    }
  }

  let els = [...found]

  // Narrow by role and section when that leaves something standing.
  if (step.role) {
    const byRole = els.filter((el) => getRole(el) === step.role)
    if (byRole.length > 0) els = byRole
  }
  const ctx = normalize(step.context ?? '')
  if (ctx) {
    const byCtx = els.filter((el) => {
      const c = normalize(findContext(el))
      return c !== '' && (c.includes(ctx) || ctx.includes(c))
    })
    if (byCtx.length > 0) els = byCtx
  }

  return els.slice(0, 100)
}

/** Walk one level up, crossing shadow boundaries via the host. */
function stepUp(n: Node): Node | null {
  if (n.parentNode) return n.parentNode
  const root = n.getRootNode()
  return root instanceof ShadowRoot ? root.host : null
}

function containsDeep(a: Element, b: Element): boolean {
  let cur: Node | null = b
  while (cur) {
    if (cur === a) return true
    cur = stepUp(cur)
  }
  return false
}

/** Closest common ancestor of a group (shadow-aware) — the "list" to ring. */
export function commonAncestorDeep(els: Element[]): Element {
  let ancestor: Element = els[0]
  for (const el of els.slice(1)) {
    while (!containsDeep(ancestor, el)) {
      const up = stepUp(ancestor)
      if (!(up instanceof Element)) return document.body
      ancestor = up
    }
  }
  return ancestor
}

export function resolveTarget(step: Step): Element | null {
  const wantedTexts = [...new Set([normalize(step.text ?? ''), normalize(step.name ?? '')])].filter(
    Boolean,
  )
  const wantedContext = normalize(step.context ?? '')
  const wantedClasses = (step.classes ?? []).filter(Boolean)

  // ---- Gather candidates ----
  const scores = new Map<Element, number>()
  const add = (el: Element, points: number) => {
    scores.set(el, (scores.get(el) ?? 0) + points)
  }

  // 1. Selector matches (strong, but see the disagreement penalty below).
  const fromSelector = new Set<Element>()
  if (step.selector) {
    try {
      for (const el of querySelectorAllDeep(step.selector)) {
        if (isVisible(el) && !isOurs(el)) {
          add(el, SCORE_SELECTOR)
          fromSelector.add(el)
        }
      }
    } catch {
      // invalid selector — other anchors carry the load
    }
  }

  // 2. Text / accessible-name matches anywhere on the page.
  if (wantedTexts.length > 0) {
    for (const el of querySelectorAllDeep('*')) {
      if (scores.has(el)) continue // already a candidate; scored below
      if (isOurs(el)) continue
      // Containers can't be tight text matches; also skips huge textContent.
      if (el.childElementCount > 5) continue
      const match = textMatch(el, wantedTexts)
      if (match === 'none') continue
      if (!isVisible(el)) continue
      scores.set(el, 0) // register; text points added in the scoring pass
    }
  }

  if (scores.size === 0) return null

  // ---- Score every candidate across all remaining signals ----
  for (const el of scores.keys()) {
    const match = textMatch(el, wantedTexts)
    if (match === 'exact') add(el, SCORE_TEXT_EXACT)
    else if (match === 'partial') add(el, SCORE_TEXT_PARTIAL)
    else if (fromSelector.has(el) && wantedTexts.length > 0) add(el, -PENALTY_TEXT_DISAGREES)

    if (step.role && getRole(el) === step.role) add(el, SCORE_ROLE)

    if (wantedClasses.length >= 2) {
      const overlap = wantedClasses.filter((c) => el.classList.contains(c)).length
      if (overlap >= 2) add(el, SCORE_CLASSES)
    }

    if (wantedContext) {
      const ctx = normalize(findContext(el))
      if (ctx && (ctx.includes(wantedContext) || wantedContext.includes(ctx))) {
        add(el, SCORE_CONTEXT)
      }
    }
  }

  // ---- Pick the winner: highest score, deepest on ties ----
  let winners: Element[] = []
  let best = ACCEPT_THRESHOLD - 1
  for (const [el, score] of scores) {
    if (score > best) {
      best = score
      winners = [el]
    } else if (score === best) {
      winners.push(el)
    }
  }
  if (winners.length === 0) return null
  const deepest = winners.filter((w) => !winners.some((o) => o !== w && w.contains(o)))
  return deepest[0] ?? winners[0]
}
