import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { ProductCard } from "@/components/shared/product-card"
import { Button } from "@/components/ui/button"
import { CatalogFilters } from "@/features/catalog/components/catalog-filters"
import { CatalogSort } from "@/features/catalog/components/catalog-sort"

export const metadata = {
  title: "Каталог товаров | BazarGo"
}

async function CatalogList({ searchParams, categories }: { searchParams: any, categories: any[] }) {
  const supabase = await createClient()
  if (!supabase) return <div>Ошибка базы данных</div>
  
  let query = supabase
    .from("listings")
    .select(`
      *,
      profiles!seller_id(id, full_name),
      categories!inner(id, name, slug),
      listing_images(url, order_index)
    `, { count: "exact" })
    .eq("status", "ACTIVE")
    
  // Filters
  if (searchParams.category) {
    const targetCat = categories.find(c => c.slug === searchParams.category)
    if (targetCat) {
      // Find children of this category
      const children = categories.filter(c => c.parent_id === targetCat.id)
      const targetIds = [targetCat.id, ...children.map(c => c.id)]
      query = query.in("category_id", targetIds)
    } else {
      query = query.eq("categories.slug", searchParams.category)
    }
  }
  if (searchParams.city) {
    query = query.ilike("city", `%${searchParams.city}%`)
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
  if (sort === "newest") query = query.order("created_at", { ascending: false })
  else if (sort === "oldest") query = query.order("created_at", { ascending: true })
  else if (sort === "cheapest") query = query.order("price", { ascending: true })
  else if (sort === "expensive") query = query.order("price", { ascending: false })

  // Pagination (MVP)
  const page = parseInt(searchParams.page || "1")
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
    return (
      <div className="text-center py-20 px-4 border rounded-2xl bg-muted/20">
        <h2 className="text-2xl font-bold mb-2">Ничего не нашли</h2>
        <p className="text-muted-foreground mb-6">Попробуйте изменить фильтры или создать запрос на нужный товар.</p>
        <Button asChild><a href="/requests">Создать запрос</a></Button>
      </div>
    )
  }

  let breadcrumbs: string[] = []
  if (searchParams.category) {
    const targetCat = categories.find(c => c.slug === searchParams.category)
    if (targetCat) {
      if (targetCat.parent_id) {
        const parentCat = categories.find(c => c.id === targetCat.parent_id)
        if (parentCat) breadcrumbs.push(parentCat.name)
      }
      breadcrumbs.push(targetCat.name)
    }
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
            seller: { name: l.profiles?.full_name || "Пользователь", rating: 4.5, reviews: 0 },
            image: images.length > 0 ? images[0].url : "",
            isVerified: false
          }
          return <ProductCard key={l.id} product={product} />
        })}
      </div>

      {/* Basic Pagination Link (Load More) */}
      {(count && count > to + 1) ? (
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <a href={`/catalog?${new URLSearchParams({...searchParams, page: String(page + 1)}).toString()}`}>
              Загрузить ещё
            </a>
          </Button>
        </div>
      ) : null}
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
          <CatalogFilters categories={categories || []} />
        </Suspense>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-12">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          }>
            <CatalogList searchParams={searchParams} categories={categories || []} />
          </Suspense>
        </div>
        
      </div>
    </div>
  )
}
