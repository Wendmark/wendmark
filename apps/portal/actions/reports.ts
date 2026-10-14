'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '../lib/auth/session'
import { InvalidInputError, NotFoundError, type Context } from '../lib/apps/service'
import { NotAllowedError } from '../lib/permissions'
import { deleteReport, eraseReportsFrom } from '../lib/reports/read'
import { approveWaitingReplay, type ReplayWaitResult } from '../lib/reports/replay'

export interface FormResult {
  error?: string
}

/** The signed-in user, in the shape the service layer expects. */
async function context(): Promise<Context> {
  const user = await requireUser()
  return { userId: user.id, organizationId: user.organizationId, role: user.role }
}

/** Turns expected failures into a message, and lets the unexpected through. */
function explain(error: unknown): FormResult {
  if (error instanceof NotAllowedError) return { error: error.message }
  if (error instanceof InvalidInputError) return { error: error.message }
  if (error instanceof NotFoundError) return { error: 'That report is already gone.' }
  throw error
}

/** Deletes one report, then goes back to the app's list of them. */
export async function deleteReportAction(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  let appId: string
  try {
    ;({ appId } = await deleteReport(await context(), String(form.get('reportId') ?? '')))
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  revalidatePath(`/apps/${appId}/reports`)
  redirect(`/apps/${appId}/reports`)
}

/** Deletes everything one person sent to this app. */
export async function eraseReportsAction(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  try {
    await eraseReportsFrom(await context(), appId, String(form.get('userRef') ?? ''))
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  revalidatePath(`/apps/${appId}/reports`)
  redirect(`/apps/${appId}/reports`)
}

/**
 * Approves the app asking to replay this report, once it asks.
 *
 * The report page calls this while it waits: the click on Replay is the
 * approval, and this matches it to the request from the app's new tab.
 */
export async function approveWaitingReplayAction(
  reportId: string,
  origin: string,
): Promise<ReplayWaitResult> {
  try {
    return await approveWaitingReplay(await context(), reportId, origin)
  } catch (error) {
    if (error instanceof NotAllowedError) return { status: 'error', error: error.message }
    throw error
  }
}
