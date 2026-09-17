import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StoreCard } from "@/components/shared/store-card"
import { ShoppingBag, Search } from "lucide-react"

export const metadata = {
  title: "Магазины | BazarGo"
}

export default async function StoresPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient()

  let query = supabase
    .from("stores")
    .select("*, categories(name)")
    .eq("status", "APPROVED")

  if (searchParams.category) {
    query = query.eq("category_id", searchParams.category)
  }
  if (searchParams.city) {
    query = query.ilike("city", `%${searchParams.city}%`)
  }
  if (searchParams.verified === "true") {
    query = query.eq("is_verified", true)
  }

  // Basic sorting: Newest by default, since we don't have follower counts in the same table without RPC
  const sort = searchParams.sort || "newest"
  if (sort === "newest") {
    query = query.order("created_at", { ascending: false })
  } else {
    query = query.order("created_at", { ascending: false })
  }

  const { data: stores } = await query

  // We should also fetch products count for each store, but for MVP we can skip or use a simple mapping
  // To avoid N+1 queries, we fetch counts in one go for these stores
  let storeCounts: Record<string, number> = {}
  if (stores && stores.length > 0) {
    const storeIds = stores.map((s: any) => s.id)
    const { data: listingsData } = await supabase
      .from("listings")
      .select("store_id")
      .in("store_id", storeIds)
      .eq("status", "ACTIVE")

    if (listingsData) {
      listingsData.forEach((l: any) => {
        storeCounts[l.store_id] = (storeCounts[l.store_id] || 0) + 1
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Магазины</h1>
          <p className="text-muted-foreground">Проверенные продавцы и бренды.</p>
        </div>
        <div className="flex gap-2">
          {/* Mock filters for MVP */}
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/stores">Сбросить фильтры</Link>
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/stores?verified=true">Только проверенные</Link>
          </Button>
        </div>
      </div>

      {!stores || stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 border rounded-3xl bg-muted/20 px-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Пока нет магазинов</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">
            Создайте первый магазин в этой категории и начните продавать.
          </p>
          <Button asChild size="lg" className="rounded-xl font-semibold">
            <Link href="/stores/create">Создать магазин</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((s: any) => {
            const mappedStore = {
              id: s.id,
              name: s.name,
              category: s.categories?.name || "Магазин",
              rating: 0,
              reviews: 0,
              itemsCount: storeCounts[s.id] || 0,
              image: s.logo_url || "",
              isVerified: s.is_verified,
              slug: s.slug
            }
            return <StoreCard key={s.id} store={mappedStore} />
          })}
        </div>
      )}
    </div>
  )
}
