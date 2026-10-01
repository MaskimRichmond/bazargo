"use server"

import { createClient } from "@/lib/supabase/server"
import { getAllDescendantIds } from "@/lib/categories"

export async function fetchNextCatalogPage(searchParams: any, categories: any[], page: number) {
  const supabase = await createClient()
  if (!supabase) return []

  let query;
  const rawQ = searchParams.q?.trim()
  
  if (rawQ) {
    query = supabase
      .rpc("search_catalog_listings", { query_text: rawQ })
      .select(`
        *,
        profiles!seller_id(id, full_name),
        categories!inner(id, name, slug),
        listing_images(url, order_index)
      `)
  } else {
    query = supabase
      .from("listings")
      .select(`
        *,
        profiles!seller_id(id, full_name),
        categories!inner(id, name, slug),
        listing_images(url, order_index)
      `)
      .eq("status", "ACTIVE")
  }
    
  if (searchParams.category) {
    const targetCat = categories.find(c => c.slug === searchParams.category)
    if (targetCat) {
      const targetIds = [targetCat.id, ...getAllDescendantIds(categories, targetCat.id)]
      query = query.in("category_id", targetIds)
    } else {
      query = query.eq("categories.slug", searchParams.category)
    }
  }
  if (searchParams.city && searchParams.city !== "all") {
    query = query.eq("city", searchParams.city)
  }
  if (searchParams.region && searchParams.region !== "all") {
    query = query.eq("region", searchParams.region)
  }
  if (searchParams.minPrice) {
    query = query.gte("price", parseFloat(searchParams.minPrice))
  }
  if (searchParams.maxPrice) {
    query = query.lte("price", parseFloat(searchParams.maxPrice))
  }
  if (searchParams.condition) {
    query = query.eq("condition", searchParams.condition)
  }

  const sort = searchParams.sort || "newest"
  if (sort === "oldest") query = query.order("created_at", { ascending: true })
  else if (sort === "cheapest") query = query.order("price", { ascending: true })
  else if (sort === "expensive") query = query.order("price", { ascending: false })
  else if (sort === "newest" && !rawQ) {
    query = query.order("created_at", { ascending: false })
  }

  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)
  
  const { data: listings, error } = await query
  if (error || !listings) return []

  let favoriteIds = new Set<string>()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session && listings.length > 0) {
    const listingIds = listings.map((l: any) => l.id)
    const { data: favs } = await supabase
      .from("favorites")
      .select("listing_id")
      .eq("user_id", session.user.id)
      .in("listing_id", listingIds)
      
    if (favs) {
      favs.forEach((f: any) => favoriteIds.add(f.listing_id))
    }
  }

  return listings.map((l: any) => {
    const images = l.listing_images?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    return {
      id: l.id,
      title: l.title,
      price: l.price,
      city: l.city,
      time: new Date(l.created_at).toLocaleDateString(),
      condition: l.condition,
      seller: { name: l.profiles?.full_name || "Пользователь" },
      image: images.length > 0 ? images[0].url : "",
      isVerified: false,
      isFavorite: favoriteIds.has(l.id)
    }
  })
}
