import { defineManifest } from '@crxjs/vite-plugin'

// Host permissions are configured here, never <all_urls>.
// Add the origins of the web apps Wend should work on.
const HOSTS = [
  'https://*.wikipedia.org/*',
  'https://lmp.sol.wilhelmsen.com/*',
  'https://ifs-vfy.wss.wilhelmsen.com/*',
]

export default defineManifest({
  manifest_version: 3,
  name: 'Wend',
  version: '0.1.0',
  description:
    'Record a process in a web app once, then guide another user through it step by step. Wend never acts for you — it only highlights.',
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Wend',
  },
  options_page: 'src/editor/index.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  permissions: ['storage', 'activeTab'],
  host_permissions: HOSTS,
  content_scripts: [
    {
      matches: HOSTS,
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
})
