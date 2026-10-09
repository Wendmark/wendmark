import type { MetadataRoute } from 'next'

/**
 * What a browser is told if somebody installs the portal as an app.
 *
 * Icons are the ones in docs/brand/logo, copied into public/brand — see that
 * folder's README. The colours are the two the rest of the interface is built
 * from: the chalk background and the deep teal accent.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Wendmark',
    short_name: 'Wendmark',
    description: 'Record a process once. Guide everyone through it.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f4ef',
    theme_color: '#0e5c57',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      // Platforms that crop an icon to their own shape need art that
      // survives it, which is what the maskable tile is for.
      {
        src: '/brand/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
