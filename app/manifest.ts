import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NicheHire — Your Job Buddy!!',
    short_name: 'NicheHire',
    description:
      'Verified careers, zero ghost jobs, fresh listings under 7 days old direct from company career portals.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F8FA',
    theme_color: '#2B4EE6',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
    categories: ['business', 'productivity', 'education'],
    lang: 'en',
    dir: 'ltr',
  };
}
