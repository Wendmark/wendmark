import { ReportSchema, redactSteps, maskPath, type LabelPolicy, type Step } from '@wendmark/core'
import { getDb } from '../db'
import { readAppSettings } from '../apps/settings'

/**
 * Storing a problem an end user reported.
 *
 * The caller is a customer of one of our customers, holding nothing but the
 * app's public key, which anyone can read out of the page. So nothing here
 * trusts the body: the steps are validated against `ReportSchema`, and the
 * masking is applied again on this side with the app's own stored policy
 * rather than the one the snippet says it used.
 *
 * Re-applying it is the point. A snippet is a file on somebody else's server
 * and an endpoint that believed `labels: "none"` would be taking a client's
 * word for whether it had stripped the data it was about to send us.
 *
 * See docs/decisions/problem-reports.md.
 */

/** Bigger than any honest report; small enough that parsing one is free. */
export const MAX_BODY_BYTES = 64 * 1024

/** What a report looks like once it is ready to store. */
export interface StoredReport {
  id: string
}

export interface ReportContext {
  /** The address it was sent from, already checked against the allowlist. */
  origin: string
}

/**
 * The report in this body, or null when there is nothing worth storing.
 *
 * Null covers a malformed body, a step that tried to smuggle a field value
 * through, and a report in a format this portal does not know — all of which
 * get the same answer from the endpoint, because a public endpoint should not
 * explain itself.
 */
export function readReport(body: unknown) {
  const parsed = ReportSchema.safeParse(body)
  return parsed.success ? parsed.data : null
}

/**
 * Writes a report, with the app's own label policy applied and retention
 * already decided.
 *
 * Returns null when the app does not exist or has reports switched off. The
 * endpoint answers the same either way.
 */
export async function recordReport(
  publicKey: string,
  report: NonNullable<ReturnType<typeof readReport>>,
  ctx: ReportContext,
): Promise<StoredReport | null> {
  const app = await getDb().app.findUnique({
    where: { publicKey },
    select: { id: true, settings: true },
  })
  if (!app) return null

  const settings = readAppSettings(app.settings)
  if (!settings.reports) return null

  const policy: LabelPolicy = settings.reportLabels
  const steps = redactSteps(report.steps as Step[], policy)

  const created = await getDb().report.create({
    data: {
      appId: app.id,
      note: report.note,
      steps,
      // Masked here too: a path is a page the user was on, and under `none`
      // the record they were looking at is not part of that.
      pages: policy === 'all' ? report.pages : report.pages.map(maskPath),
      labels: policy,
      reportVersion: report.reportVersion,
      origin: ctx.origin,
      ...(report.userAgent === undefined ? {} : { userAgent: report.userAgent }),
      ...(report.snippetVersion === undefined ? {} : { snippetVersion: report.snippetVersion }),
      ...(report.userRef === undefined ? {} : { userRef: report.userRef }),
      expiresAt: expiryFrom(new Date(), settings.reportRetentionDays),
    },
    select: { id: true },
  })

  // Opportunistic, and bounded: the app that writes reports is the app that
  // has them to forget. A portal nobody reports to keeps a few rows past
  // their date until somebody opens the list, which also sweeps.
  await purgeExpiredReports()

  return created
}

/** When a report written now stops being kept. */
export function expiryFrom(now: Date, retentionDays: number): Date {
  return new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000)
}

/**
 * Deletes reports whose retention has run out.
 *
 * A hard delete. Flows are soft deleted because losing a recorded process is
 * a bad afternoon; a report past its retention date is one somebody was
 * promised would be gone.
 */
export async function purgeExpiredReports(now: Date = new Date()): Promise<number> {
  const { count } = await getDb().report.deleteMany({ where: { expiresAt: { lte: now } } })
  return count
}
