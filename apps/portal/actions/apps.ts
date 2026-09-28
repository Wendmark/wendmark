'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '../lib/auth/session'
import {
  allowOrigin,
  createApp,
  deleteApp,
  rotateKey,
  setLauncher,
  updateApp,
  type Context,
} from '../lib/apps/service'
import { InvalidInputError, NotFoundError } from '../lib/apps/service'
import { NotAllowedError } from '../lib/permissions'

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
  if (
    error instanceof InvalidInputError ||
    error instanceof NotAllowedError ||
    error instanceof NotFoundError
  ) {
    return { error: error.message }
  }
  throw error
}

/** Origins arrive as one per line from a textarea. */
function linesOf(form: FormData, field: string): string[] {
  return String(form.get(field) ?? '').split('\n')
}

export async function createAppAction(_previous: FormResult, form: FormData): Promise<FormResult> {
  let appId: string
  try {
    const app = await createApp(await context(), {
      name: String(form.get('name') ?? ''),
      origins: linesOf(form, 'origins'),
    })
    appId = app.id
  } catch (error) {
    return explain(error)
  }
  revalidatePath('/')
  redirect(`/apps/${appId}`)
}

export async function updateAppAction(_previous: FormResult, form: FormData): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  try {
    await updateApp(await context(), appId, {
      name: String(form.get('name') ?? ''),
      origins: linesOf(form, 'origins'),
    })
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  return {}
}

export async function rotateKeyAction(_previous: FormResult, form: FormData): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  try {
    await rotateKey(await context(), appId)
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  return {}
}

export async function allowOriginAction(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  try {
    await allowOrigin(await context(), appId, String(form.get('origin') ?? ''))
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}`)
  return {}
}

export async function deleteAppAction(_previous: FormResult, form: FormData): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  try {
    await deleteApp(await context(), appId, String(form.get('confirmation') ?? ''))
  } catch (error) {
    return explain(error)
  }
  revalidatePath('/')
  redirect('/')
}

export async function setLauncherAction(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const appId = String(form.get('appId') ?? '')
  try {
    await setLauncher(await context(), appId, {
      enabled: form.get('enabled') === 'true',
      ...(form.has('label') ? { label: String(form.get('label') ?? '') } : {}),
    })
  } catch (error) {
    return explain(error)
  }
  revalidatePath(`/apps/${appId}/settings`)
  return {}
}
