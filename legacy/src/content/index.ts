import { Player } from './player'
import { Recorder } from './recorder'
import { TEST_PROCESS } from './testProcess'
import { loadPlayback } from './state'
import { getActiveRecording } from '../recording'
import type { Process } from '../types'

const player = new Player()
const recorder = new Recorder()

interface Message {
  type: 'WEND_PLAY' | 'WEND_STOP' | 'WEND_RECORD_START' | 'WEND_RECORD_STOP'
  process?: Process
}

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  switch (msg?.type) {
    case 'WEND_PLAY':
      void player.start(msg.process ?? TEST_PROCESS)
      break
    case 'WEND_STOP':
      player.stop()
      break
    case 'WEND_RECORD_START':
      recorder.start()
      break
    case 'WEND_RECORD_STOP':
      recorder.stop()
      break
    default:
      return
  }
  sendResponse({ ok: true })
})

// Resume active playback / recording after a navigation.
void loadPlayback().then((state) => {
  if (state) void player.start(state.process, state.stepIndex)
})
void getActiveRecording().then((active) => {
  if (active) recorder.start()
})
