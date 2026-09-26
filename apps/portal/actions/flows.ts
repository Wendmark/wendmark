'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '../lib/auth/session'
import { InvalidInputError, NotFoundError, type Context } from '../lib/apps/service'
import { NotAllowedError } from '../lib/permissions'
import {
  deleteFlow,
  duplicateFlow,
  publishFlow,
  restoreVersion,
  setPaused,
  unpublishFlow,
} from '../lib/flows/service'

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

export async function publishFlowAction(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  const flowId = String(form.get('flowId') ?? '')
  try {
    await publishFlow(await context(), flowId)
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  revalidatePath(`/apps/${appId}/flows/${flowId}`)
  return {}
}

export async function unpublishFlowAction(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  const flowId = String(form.get('flowId') ?? '')
  try {
    await unpublishFlow(await context(), flowId)
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  revalidatePath(`/apps/${appId}/flows/${flowId}`)
  return {}
}

export async function restoreVersionAction(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  const flowId = String(form.get('flowId') ?? '')
  try {
    await restoreVersion(await context(), flowId, String(form.get('versionId') ?? ''))
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  revalidatePath(`/apps/${appId}/flows/${flowId}`)
  return {}
}
