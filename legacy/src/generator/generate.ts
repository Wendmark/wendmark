/**
 * Turns a raw click recording into a clean guided process via the Claude API.
 * Runs in the extension popup (no proxy server) — the API key comes from a
 * local .env at build time. Never called during playback.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { RawRecording } from '../recording'
import type { Process, Step } from '../types'

const MODEL = 'claude-sonnet-4-6'

const SYSTEM = `You clean up raw recordings of a user's clicks in a web app and turn them into a concise guided process that another user can follow.

The input is a JSON object with the recording's name and an array of clicks, in order. Each click has:
- selector: a CSS/shadow-piercing selector for the clicked element
- text: the element's visible text (empty for form fields)
- role: its ARIA role
- name: its accessible name (label, aria-label, placeholder)
- classes: stable class names on the element
- ancestors: compact descriptions of its ancestor chain, innermost first
- context: the nearest section heading or labeled container it sits in
- url: the page it happened on
- at: timestamp in ms

Rules:
- Drop obvious misclicks and noise: clicks on generic containers with no role, name, or text; stray clicks that don't advance the task; accidental double-clicks; back-and-forth navigation that undoes itself. Use the ancestors and timing to judge intent.
- Merge redundant steps: consecutive clicks on the same element become one step.
- Keep each kept click's "selector", "text", "role", "name", "classes", and "url" values VERBATIM — never invent, edit, or shorten them. These are all used as independent anchors to re-find the element later, so preserve them exactly. You may drop clearly framework-generic classes from "classes" (ones shared by every element of that type), but never add or rewrite any.
- Set each step's "context" to a short phrase identifying where the element lives (from the click's context/ancestors), like "Order Details" or "left navigation" — or "" if nothing meaningful.
- IMPORTANT — instance data vs fixed UI: decide for each step whether the clicked element is fixed UI chrome (a button, menu item, tab, field — its label is part of the app) or an instance data item (a specific vessel, organization, order, customer, search result, row in a list — its label is data that will differ for other users and environments). Telltale signs of instance data: proper names, identifiers, or labels containing long numbers (e.g. a vessel like "BRO ANNA 9344435", an order "SO-100234", a person's name) — especially when the click's ancestors show it sitting among similar siblings in a list or menu. For data items set "dynamic": true and write the instruction GENERICALLY — "Select the vessel you want to work with", "Open the order you want to cancel" — NEVER bake the recorded value (e.g. a demo org or vessel name) into the instruction or the process name. For fixed UI set "dynamic": false and use the label normally.
- Name the process with a short, action-oriented title describing what the user accomplished — again without instance data names.
- Write one short, human instruction per step in the imperative, using the element's accessible name or visible text plus its context — like "Click Cancel Order in the Order Details panel", never "click div.btn-x7".

Return ONLY a valid JSON object — no markdown fences, no commentary, no explanation:
{"name": "...", "steps": [{"selector": "...", "text": "...", "role": "...", "name": "...", "classes": ["..."], "context": "...", "url": "...", "dynamic": false, "instruction": "..."}]}`

export async function generateProcess(recording: RawRecording): Promise<Process> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!apiKey) {
    throw new Error('Missing API key — put VITE_ANTHROPIC_API_KEY in .env and rebuild.')
  }
  if (recording.clicks.length === 0) {
    throw new Error('This recording has no clicks.')
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: JSON.stringify({ recordingName: recording.name, clicks: recording.clicks }),
      },
    ],
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined to process this recording.')
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  const parsed = parseProcessJson(text)
  return {
    id: crypto.randomUUID(),
    name: parsed.name,
    steps: parsed.steps,
  }
}

/** Strip markdown code fences the model was told not to emit, defensively. */
export function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()
}

function parseProcessJson(text: string): { name: string; steps: Step[] } {
  let data: unknown
  try {
    data = JSON.parse(stripFences(text))
  } catch {
    throw new Error('The model did not return valid JSON.')
  }

  const obj = data as { name?: unknown; steps?: unknown }
  if (typeof obj?.name !== 'string' || !Array.isArray(obj.steps) || obj.steps.length === 0) {
    throw new Error('The model returned JSON with an unexpected shape.')
  }

  const steps: Step[] = obj.steps.map((raw: unknown, i: number) => {
    const s = raw as Record<string, unknown>
    if (typeof s?.selector !== 'string' || typeof s?.instruction !== 'string') {
      throw new Error(`Step ${i + 1} is missing a selector or instruction.`)
    }
    return {
      selector: s.selector,
      text: typeof s.text === 'string' ? s.text : '',
      role: typeof s.role === 'string' ? s.role : undefined,
      name: typeof s.name === 'string' && s.name ? s.name : undefined,
      classes: Array.isArray(s.classes)
        ? s.classes.filter((c): c is string => typeof c === 'string')
        : undefined,
      context: typeof s.context === 'string' && s.context ? s.context : undefined,
      url: typeof s.url === 'string' && s.url ? s.url : undefined,
      dynamic: s.dynamic === true || undefined,
      instruction: s.instruction,
    }
  })

  return { name: obj.name, steps }
}
