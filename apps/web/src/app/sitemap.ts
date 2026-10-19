import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bazargo.com'
  
  // Use anonymous client for public data in sitemap
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey) 
    : null

  const sitemap: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: new Date() },
    { url: `${baseUrl}/catalog`, lastModified: new Date() },
    { url: `${baseUrl}/stores`, lastModified: new Date() },
    { url: `${baseUrl}/about`, lastModified: new Date() },
    { url: `${baseUrl}/contacts`, lastModified: new Date() },
    { url: `${baseUrl}/legal`, lastModified: new Date() },
    { url: `${baseUrl}/privacy`, lastModified: new Date() },
    { url: `${baseUrl}/terms`, lastModified: new Date() },
    { url: `${baseUrl}/safety`, lastModified: new Date() },
    { url: `${baseUrl}/help`, lastModified: new Date() },
  ]

  if (supabase) {
    try {
      // Get active products
      const { data: listings } = await supabase
        .from('listings')
        .select('id, updated_at')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1000)
      
      // Get approved stores
      const { data: stores } = await supabase
        .from('stores')
        .select('slug, updated_at')
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false })
        .limit(500)

      listings?.forEach((l) => {
        sitemap.push({ 
          url: `${baseUrl}/product/${l.id}`, 
          lastModified: new Date(l.updated_at || Date.now()) 
        })
      })

      stores?.forEach((s) => {
        sitemap.push({ 
          url: `${baseUrl}/store/${s.slug}`, 
          lastModified: new Date(s.updated_at || Date.now()) 
        })
      })
    } catch (e) {
      console.error("Failed to generate dynamic sitemap entries", e)
    }
  }

  return sitemap
}
