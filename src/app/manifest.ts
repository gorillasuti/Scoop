import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Scoop',
    short_name: 'Scoop',
    description: 'Családi receptkönyv',
    start_url: '/login',
    scope: '/',
    display: 'standalone',
    background_color: '#FCF9F8',
    theme_color: '#FCF9F8',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-512.png',
        sizes: '192x192 512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '192x192 512x512',
        type: 'image/png',
        purpose: 'maskable',
      }
    ],
  }
}
