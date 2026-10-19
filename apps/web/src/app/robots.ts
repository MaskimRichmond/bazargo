import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bazargo.com'

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/catalog',
        '/product/*',
        '/store/*',
        '/stores',
        '/about',
        '/contacts',
        '/legal',
        '/privacy',
        '/terms',
        '/safety',
        '/help'
      ],
      disallow: [
        '/profile',
        '/settings',
        '/messages',
        '/cart',
        '/checkout',
        '/orders',
        '/my-listings',
        '/my-requests',
        '/my-store',
        '/b2b/*',
        '/requests/create',
        '/seller/*'
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
