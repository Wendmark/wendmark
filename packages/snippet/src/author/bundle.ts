/**
 * The authoring bundle: everything only a person recording a process needs.
 *
 * Built as its own file and fetched on demand, so it costs ordinary
 * visitors nothing.
 */
import type { AuthorContext } from './loader'
import { startRecorder } from './recorder-ui'
import { saveDraft as sendDraft } from './save'

// Replaying a problem report, for people the portal sent here to do that.
export { replay } from './replay'

/**
 * Starts authoring in this page, for the portal: record what the author
 * does, and save it to the portal as a draft.
 */
export function start(context: AuthorContext): void {
  startRecorder({
    doc: context.doc,
    view: context.view,
    api: context.api,
    savingText: 'Saving to the portal…',
    save: async (flow) => {
      const result = await sendDraft(context.portalOrigin, context.session.sessionToken, flow)
      return result.ok
        ? {
            ok: true,
            message: `Saved as a draft. Open “${result.name}” in the portal to publish it.`,
          }
        : result
    },
  })
}
