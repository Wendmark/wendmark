'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '../lib/auth/session'
import { InvalidInputError, NotFoundError, type Context } from '../lib/apps/service'
import { NotAllowedError } from '../lib/permissions'
import {
  addFlowNote,
  deleteFlow,
  duplicateFlow,
  moveFlowInList,
  moveFlowStep,
  publishFlow,
  removeFlowStep,
  renameFlow,
  restoreVersion,
  retitleFlowStep,
  setFlowStepDynamic,
  setPaused,
  setUrlPatterns,
  setVisibility,
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

export async function renameFlowAction(_previous: FormResult, form: FormData): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  const flowId = String(form.get('flowId') ?? '')
  try {
    await renameFlow(
      await context(),
      flowId,
      String(form.get('name') ?? ''),
      String(form.get('description') ?? ''),
    )
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  revalidatePath(`/apps/${appId}/flows/${flowId}`)
  return {}
}

/**
 * One action for every change to a step, because they all do the same
 * thing from the page's point of view: read the form, edit, re-render.
 */
export async function editStepAction(_previous: FormResult, form: FormData): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  const flowId = String(form.get('flowId') ?? '')
  const stepId = String(form.get('stepId') ?? '')
  const what = String(form.get('what') ?? '')

  try {
    const ctx = await context()
    if (what === 'retitle')
      await retitleFlowStep(ctx, flowId, stepId, String(form.get('text') ?? ''))
    else if (what === 'up') await moveFlowStep(ctx, flowId, stepId, -1)
    else if (what === 'down') await moveFlowStep(ctx, flowId, stepId, 1)
    else if (what === 'remove') await removeFlowStep(ctx, flowId, stepId)
    else if (what === 'dynamic')
      await setFlowStepDynamic(ctx, flowId, stepId, form.get('dynamic') === 'true')
    else if (what === 'note')
      await addFlowNote(ctx, flowId, String(form.get('text') ?? ''), stepId === '' ? null : stepId)
  } catch (error) {
    return explain(error)
  }

  revalidatePath(`/apps/${appId}/flows/${flowId}`)
  return {}
}

export async function setTargetingAction(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  const flowId = String(form.get('flowId') ?? '')
  try {
    const ctx = await context()
    await setUrlPatterns(ctx, flowId, String(form.get('patterns') ?? '').split('\n'))
    await setVisibility(ctx, flowId, form.get('listed') === 'on')
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  revalidatePath(`/apps/${appId}/flows/${flowId}`)
  return {}
}

export async function moveFlowAction(_previous: FormResult, form: FormData): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  try {
    await moveFlowInList(
      await context(),
      appId,
      String(form.get('flowId') ?? ''),
      form.get('direction') === 'up' ? -1 : 1,
    )
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  return {}
}
