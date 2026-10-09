import { z } from 'zod'
import { StepSchema } from './schemas'
import { LABEL_POLICIES } from './redact'

/**
 * What an end user sends when they report a problem.
 *
 * The same steps a flow is made of, pointing the other way: a flow says
 * "this is how you do it", a report says "this is what I did". That is why
 * the steps are `StepSchema` and not a report-shaped copy — the portal can
 * replay a report with the player it already has, and turn a good one into a
 * flow. See docs/decisions/problem-reports.md.
 *
 * Not a flow, though, and deliberately not under `SCHEMA_VERSION`: a report
 * is never served to a snippet, so nothing about it has to stay playable by
 * an old build. It carries its own version.
 */

export const REPORT_VERSION = 1

/** As many steps as the recorder will ever capture. */
const MAX_REPORT_STEPS = 60

/** Long enough to explain what went wrong, short enough to read. */
const MAX_NOTE = 2000

/**
 * A report as the snippet sends it.
 *
 * Strict, like every other schema here: a public endpoint that accepted
 * unknown keys would be an invitation to put something in them.
 *
 * `labels` is what the snippet says it applied, and the portal does not
 * believe it — it re-applies the app's own stored policy before writing.
 * It is here so a mismatch is visible rather than silent.
 */
export const ReportSchema = z.strictObject({
  reportVersion: z.literal(REPORT_VERSION),
  /** What went wrong, in the user's own words. */
  note: z.string().trim().min(1).max(MAX_NOTE),
  /** The controls they touched, in order, after they chose to retrace. */
  steps: z.array(StepSchema).min(1).max(MAX_REPORT_STEPS),
  /** The pages they passed through, in order, as paths. */
  pages: z.array(z.string().min(1).max(2000)).max(MAX_REPORT_STEPS).default([]),
  /** Which label policy the snippet applied before showing the preview. */
  labels: z.enum(LABEL_POLICIES as [string, ...string[]]),
  /** The browser's own description of itself. Not parsed, not matched on. */
  userAgent: z.string().max(400).optional(),
  /** Which snippet build captured this. */
  snippetVersion: z.string().max(40).optional(),
  /**
   * An identifier the application itself passed in, so an operator can reply
   * to whoever sent this. Stored exactly as given and never interpreted —
   * Wendmark has no idea whether it is an email, an account number or a
   * nickname, and does not need one.
   */
  userRef: z.string().trim().min(1).max(200).optional(),
})

export type Report = z.infer<typeof ReportSchema>
