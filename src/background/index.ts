/**
 * Background service worker. Its only job is the opt-in "AI rescue" during
 * playback: when the user explicitly asks, it receives a snapshot of the
 * page's interactive elements and asks Claude which one matches the stuck
 * step. Runs here (not in the content script) so the host page's CSP can't
 * block the request. Nothing here runs unless the user clicks the button.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { Step } from '../types'

export interface LocateCandidate {
  index: number
  tag: string
  role: string
  text: string
  name: string
  classes: string[]
  context: string
}

const SYSTEM = `You locate a UI element on a web page for a step-by-step guidance tool.

You get a JSON object with:
- step: the guidance step — its human instruction and the anchors recorded when it was captured (text, name, role, classes, context, selector)
- elements: a numbered list of the interactive elements currently visible on the page, each with tag, role, text, name (accessible name), classes, and context (the section it sits in)

Pick the element the user should click to perform this step. Judge by meaning, not exact string equality — labels may be reworded, translated, or decorated. Prefer an element whose text/name and section context best match the step's intent.

If the target itself is not on screen, but some visible element would likely REVEAL it — a menu/hamburger toggle, a collapsed section header, a tab, an expander — return that element's index with "reveals": true. Only do this when the connection is plausible (e.g. the step targets a menu item and there is a closed menu button).

If nothing matches and nothing would reveal it (the page is likely in the wrong state), return {"index": null, "reveals": false}.

Your ENTIRE response must be a single JSON object and nothing else — no markdown fences, no explanation, no prose before or after, in EVERY case including when nothing matches:
{"index": <number or null>, "reveals": <true if the element only reveals the target, else false>}`

interface LocateRequest {
  type: 'WEND_AI_LOCATE'
  step: Step
  candidates: LocateCandidate[]
}

chrome.runtime.onMessage.addListener((msg: LocateRequest, _sender, sendResponse) => {
  if (msg?.type !== 'WEND_AI_LOCATE') return
  void (async () => {
    try {
      const result = await locate(msg.step, msg.candidates)
      sendResponse({ ok: true, ...result })
    } catch (err) {
      sendResponse({ ok: false, error: err instanceof Error ? err.message : 'AI request failed' })
    }
  })()
  return true // keep the message channel open for the async response
})

async function locate(
  step: Step,
  candidates: LocateCandidate[],
): Promise<{ index: number | null; reveals: boolean }> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!apiKey) throw new Error('no API key in this build')
  if (candidates.length === 0) return { index: null, reveals: false }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify({ step, elements: candidates }) }],
  })
  if (response.stop_reason === 'refusal') return { index: null, reveals: false }

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')

  // Defensive: the model occasionally wraps the JSON in prose or answers in
  // prose entirely. Pull out the first JSON object; treat anything
  // unparseable as "no match" rather than an error.
  const jsonText = text.match(/\{[\s\S]*?\}/)?.[0] ?? text
  let parsed: { index?: unknown; reveals?: unknown }
  try {
    parsed = JSON.parse(jsonText) as { index?: unknown; reveals?: unknown }
  } catch {
    return { index: null, reveals: false }
  }
  if (typeof parsed.index === 'number' && parsed.index >= 0 && parsed.index < candidates.length) {
    return { index: parsed.index, reveals: parsed.reveals === true }
  }
  return { index: null, reveals: false }
}
