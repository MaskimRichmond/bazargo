import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient(url, key)
}

export const getCachedProductData = unstable_cache(
  async (id: string) => {
    const supabase = getPublicClient()
    
    const { data: listing, error } = await supabase
      .from("listings")
      .select(`
        *,
        profiles!seller_id(id, full_name, avatar_url, created_at),
        categories(id, name),
        listing_images(url, order_index)
      `)
      .eq("id", id)
      .single()

    if (error || !listing) return null

    const { data: similarListings } = await supabase
      .from("listings")
      .select(`
        id, title, price, city, created_at, condition, status,
        profiles!seller_id(full_name),
        listing_images(url, order_index)
      `)
      .eq("status", "ACTIVE")
      .eq("category_id", listing.category_id)
      .neq("id", listing.id)
      .order("created_at", { ascending: false })
      .limit(4)

    const { data: sellerListings } = await supabase
      .from("listings")
      .select(`
        id, title, price, city, created_at, condition, status,
        profiles!seller_id(full_name),
        listing_images(url, order_index)
      `)
      .eq("status", "ACTIVE")
      .eq("seller_id", listing.seller_id)
      .neq("id", listing.id)
      .order("created_at", { ascending: false })
      .limit(4)

    return {
      listing,
      similarListings: similarListings || [],
      sellerListings: sellerListings || []
    }
  },
  ['product-data'],
  { revalidate: 60, tags: ['products'] }
)
