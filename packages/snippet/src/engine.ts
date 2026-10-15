/**
 * The snippet's engine, without the snippet.
 *
 * Importing `src/index.ts` runs it: it pings the portal, mounts the
 * launcher and looks for author mode. Something that brings its own way of
 * starting things — the browser extension — wants the parts without any of
 * that, so this entry exports them and does nothing when imported.
 *
 * Not part of snippet.js: the bundles are built from index.ts and
 * author/bundle.ts, and nothing there imports this file.
 */
export { startFlow, type Player, type PlayerOptions } from './player/player'
export { startRecording, type Recording, type RecordingOptions } from './recorder/recorder'
export {
  startRecorder,
  type Recorder,
  type RecorderOptions,
  type RecorderSaveResult,
} from './author/recorder-ui'
export { emptyDraft, type Draft } from './author/draft'
export type { SnippetApi } from './author/loader'
