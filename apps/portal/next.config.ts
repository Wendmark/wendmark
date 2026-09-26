import type { NextConfig } from 'next'

/**
 * How long a browser may keep the snippet before asking again.
 *
 * This number is the version-skew window: for this long after an upgrade,
 * some visitors are still running the previous snippet against the new
 * portal. Five minutes keeps that short while costing each visitor one
 * revalidation request every five minutes, which is almost always a 304.
 * See docs/decisions/flow-compatibility.md.
 */
const SNIPPET_MAX_AGE_SECONDS = 300

const config: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ['@wendmark/core'],

  async headers() {
    return [
      {
        source: '/:file(snippet.js|author.js)',
        headers: [
          {
            key: 'Cache-Control',
            value: `public, max-age=${SNIPPET_MAX_AGE_SECONDS}, must-revalidate`,
          },
          // Served to customers' pages, so it must be fetchable from them.
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
}

export default config
