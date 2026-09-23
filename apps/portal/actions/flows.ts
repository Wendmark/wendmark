'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '../lib/auth/session'
import { NotFoundError, type Context } from '../lib/apps/service'
import { NotAllowedError } from '../lib/permissions'
import { deleteFlow, duplicateFlow, setPaused } from '../lib/flows/service'

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
  if (error instanceof NotFoundError) return { error: 'That process no longer exists.' }
  throw error
}

export async function pauseFlowAction(_previous: FormResult, form: FormData): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  const paused = form.get('paused') === 'true'
  try {
    await setPaused(await context(), String(form.get('flowId') ?? ''), paused)
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  return {}
}

export async function duplicateFlowAction(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  try {
    await duplicateFlow(await context(), String(form.get('flowId') ?? ''))
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  return {}
}

export async function deleteFlowAction(_previous: FormResult, form: FormData): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  try {
    await deleteFlow(await context(), String(form.get('flowId') ?? ''))
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  return {}
}
