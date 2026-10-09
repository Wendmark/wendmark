/**
 * Taking a report's labels off, before it is sent.
 *
 * A flow's `name`, `text` and `context` are labels an application's own
 * designers wrote — the same for every user. In a problem report captured on
 * a customer's own screen, the identical fields hold whatever the page
 * happened to say, which is often the customer: `Order FK-10421`,
 * `Alex Lindqvist's subscriptions`.
 *
 * So they come off by default, and an application opts back into them. See
 * docs/decisions/problem-reports.md.
 *
 * Dependency-free on purpose: this runs in the snippet, before the preview
 * the user is shown, and importing the package root would pull zod into a
 * 30 KB budget. The portal re-applies it on write — a public endpoint cannot
 * take the client's word for what it stripped.
 */
import type { Step, Target } from './schemas'

/**
 * How much of what the page said a report may keep.
 *
 * - `none` — structure only. The default, and what an operator gets until
 *   they decide otherwise.
 * - `all` — labels as captured, for an operator who has concluded their
 *   markup carries nothing personal.
 */
export type LabelPolicy = 'none' | 'all'

export const LABEL_POLICIES: readonly LabelPolicy[] = ['none', 'all']

/** The policy to assume when nothing valid has been stored or sent. */
export const DEFAULT_LABEL_POLICY: LabelPolicy = 'none'

/** A policy worth acting on, or the cautious one. */
export function readLabelPolicy(raw: unknown): LabelPolicy {
  return LABEL_POLICIES.includes(raw as LabelPolicy) ? (raw as LabelPolicy) : DEFAULT_LABEL_POLICY
}

/**
 * How a step reads once its labels are gone.
 *
 * "Press a button" rather than "Press Issue refund". Vaguer, and still the
 * difference between a report that replays and a row of selectors nobody
 * can read. Kept in the recorder's imperative voice, because the player
 * shows these in the same panel it shows a flow's steps in.
 */
const BY_ROLE: Record<string, string> = {
  link: 'Follow a link',
  button: 'Press a button',
  tab: 'Switch to another tab',
  menuitem: 'Choose from a menu',
  option: 'Choose an option',
  checkbox: 'Tick a box',
  switch: 'Turn a setting on or off',
  radio: 'Choose one of several options',
  textbox: 'Click a text field',
  searchbox: 'Click a search field',
  combobox: 'Open a dropdown',
  listbox: 'Open a list of options',
}

/** How an input step reads once its labels are gone. */
const INPUT_BY_ROLE: Record<string, string> = {
  checkbox: 'Tick a box',
  switch: 'Turn a setting on or off',
  radio: 'Choose one of several options',
  combobox: 'Choose from a dropdown',
  listbox: 'Choose from a list',
}

function describeWithoutLabels(step: Step): string {
  if (step.type === 'instruction') return step.text

  const role = step.target.role ?? ''
  if (step.type === 'input') return INPUT_BY_ROLE[role] ?? 'Fill in a field'
  return BY_ROLE[role] ?? 'Click something on the page'
}

/**
 * Whether a path segment is an identifier rather than a name.
 *
 * The same judgement `looksLikeId` makes in `@wendmark/dom` when it compares
 * two pages, repeated here because core cannot import dom. If one changes,
 * change the other: a report whose paths mask differently from the way pages
 * are matched would be confusing to read beside a flow.
 */
function looksLikeId(segment: string): boolean {
  return /\d/.test(segment) || segment.length > 24
}

/**
 * A path with its identifiers taken out: `/orders/10421` → `/orders/*`.
 *
 * Which screen somebody was on is most of what makes a report readable, and
 * which record they were looking at is none of it.
 */
export function maskPath(path: string): string {
  const segments = path.split('/').filter((segment) => segment !== '')
  if (segments.length === 0) return '/'
  return `/${segments.map((segment) => (looksLikeId(segment) ? '*' : segment)).join('/')}`
}

/** A target with nothing in it but structure. */
function redactTarget(target: Target): Target {
  const { name: _name, text: _text, context: _context, url, ...structure } = target
  return url === undefined ? structure : { ...structure, url: maskPath(url) }
}

/** One step, with whatever the page said taken out of it. */
export function redactStep(step: Step, policy: LabelPolicy = DEFAULT_LABEL_POLICY): Step {
  if (policy === 'all') return step
  if (step.type === 'instruction') return step

  return { ...step, text: describeWithoutLabels(step), target: redactTarget(step.target) }
}

/** A report's steps, ready to be previewed and then sent. */
export function redactSteps(steps: readonly Step[], policy: LabelPolicy): Step[] {
  return steps.map((step) => redactStep(step, policy))
}
