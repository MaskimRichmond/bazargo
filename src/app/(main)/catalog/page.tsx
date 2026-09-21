import { Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ProductCard } from "@/components/shared/product-card"
import { ProductSkeleton } from "@/components/shared/product-skeleton"
import { Button } from "@/components/ui/button"
import { CatalogFiltersWidget } from "@/features/catalog/components/catalog-filters-widget"
import { CatalogSort } from "@/features/catalog/components/catalog-sort"
import { CatalogActiveFilters } from "@/features/catalog/components/catalog-active-filters"
import { CatalogLoadMore } from "@/features/catalog/components/catalog-load-more"
import { getAllDescendantIds, getCategoryBreadcrumbs } from "@/lib/categories"

export const metadata = {
  title: "Каталог товаров | BazarGo"
}

async function CatalogList({ searchParams, categories }: { searchParams: any, categories: any[] }) {
  const supabase = await createClient()
  if (!supabase) return <div>Ошибка базы данных</div>
  
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
      `, { count: "exact" })
  } else {
    query = supabase
      .from("listings")
      .select(`
        *,
        profiles!seller_id(id, full_name),
        categories!inner(id, name, slug),
        listing_images(url, order_index)
      `, { count: "exact" })
      .eq("status", "ACTIVE")
  }
    
  // Filters
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

  // Sorting
  const sort = searchParams.sort || "newest"
  if (sort === "oldest") query = query.order("created_at", { ascending: true })
  else if (sort === "cheapest") query = query.order("price", { ascending: true })
  else if (sort === "expensive") query = query.order("price", { ascending: false })
  else if (sort === "newest" && !rawQ) {
    // Only apply default newest sort if not searching, to preserve search relevance ranking
    query = query.order("created_at", { ascending: false })
  }

  // Pagination (MVP offset-limit is fine with indexes, but cap max page)
  let page = parseInt(searchParams.page || "1")
  if (isNaN(page) || page < 1) page = 1
  if (page > 50) page = 50 // Protect against deep offset scanning

  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)
  
  const { data: listings, error, count } = await query
    
  if (error) {
    console.error("Catalog Fetch Error:", error)
    return (
      <div className="p-8 text-center text-destructive bg-destructive/10 rounded-xl">
        Не удалось загрузить товары. <br/>
        <span className="text-xs">{error.message}</span>
        <Button variant="outline" asChild className="mt-4"><a href="/catalog">Сбросить фильтры</a></Button>
      </div>
    )
  }

  if (!listings || listings.length === 0) {
    const isFiltered = Object.keys(searchParams).some(k => k !== 'page' && k !== 'sort')
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-4 border border-dashed rounded-3xl bg-muted/10">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <h2 className="text-2xl font-bold mb-3">
          {rawQ ? `По запросу «${rawQ}» ничего не найдено` : "Ничего не нашли"}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md text-lg">
          {isFiltered 
            ? "Попробуйте смягчить условия поиска или убрать некоторые фильтры." 
            : "Попробуйте поискать что-нибудь другое или создайте запрос на покупку."}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          {isFiltered && (
            <Button variant="outline" size="lg" asChild className="rounded-xl">
              <a href="/catalog">Сбросить все фильтры</a>
            </Button>
          )}
          <Button size="lg" asChild className="rounded-xl">
            <a href="/requests">Создать запрос</a>
          </Button>
        </div>
      </div>
    )
  }

  // Fetch favorites
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

  let breadcrumbs: string[] = []
  if (searchParams.category) {
    const path = getCategoryBreadcrumbs(categories, searchParams.category)
    breadcrumbs = path.map(c => c.name)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            Каталог {breadcrumbs.length > 0 && <span className="text-foreground">/ {breadcrumbs.join(" / ")}</span>}
          </p>
          <p className="text-sm font-medium">Найдено {count} товаров</p>
        </div>

        {/* Desktop Sorting */}
        <CatalogSort sort={sort} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {listings.map((l: any) => {
          const images = l.listing_images?.sort((a: any, b: any) => a.order_index - b.order_index) || []
          const product = {
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
          return <ProductCard key={l.id} product={product} />
        })}
      </div>

      <CatalogLoadMore 
        initialPage={page} 
        searchParams={searchParams} 
        totalCount={count || 0} 
        categories={categories} 
      />
    </div>
  )
}

export default async function CatalogPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient()
  const { data: categories } = await supabase.from("categories").select("id, name, slug, parent_id").order("name")
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* Client-side Filters */}
        <Suspense fallback={<div className="w-64 shrink-0" />}>
          <CatalogFiltersWidget categories={categories || []} />
        </Suspense>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={<div className="h-10" />}>
            <CatalogActiveFilters categories={categories || []} />
          </Suspense>
          <Suspense 
            key={JSON.stringify(searchParams)}
            fallback={
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-12">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            }
          >
            <CatalogList searchParams={searchParams} categories={categories || []} />
          </Suspense>
        </div>
        
      </div>
    </div>
  )
}
