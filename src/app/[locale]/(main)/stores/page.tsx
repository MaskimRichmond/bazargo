import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StoreCard } from "@/components/shared/store-card"
import { ShoppingBag, Search } from "lucide-react"
import { getAllDescendantIds } from "@/lib/categories"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Магазины | BazarGo"
}

export default async function StoresPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const t = await getTranslations();
  const searchParams = await props.searchParams;
  const supabase = await createClient()

  let query = supabase
    .from("stores")
    .select("*, categories(name)", { count: "exact" })
    .eq("status", "APPROVED")

  if (searchParams.category) {
    const { data: categories } = await supabase.from("categories").select("id, slug, parent_id")
    if (categories) {
      const targetCat = categories.find((c: any) => c.slug === searchParams.category || c.id === searchParams.category)
      if (targetCat) {
        const targetIds = [targetCat.id, ...getAllDescendantIds(categories, targetCat.id)]
        query = query.in("category_id", targetIds)
      } else {
        query = query.eq("category_id", searchParams.category)
      }
    } else {
      query = query.eq("category_id", searchParams.category)
    }
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

  const page = parseInt(searchParams.page || "1", 10)
  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data: stores, count } = await query

  let storeCounts: Record<string, number> = {}
  if (stores && stores.length > 0) {
    const storeIds = stores.map((s: any) => s.id)
    const { data: countsData } = await supabase.rpc("get_store_active_listings_counts", { store_ids: storeIds })
    
    if (countsData) {
      countsData.forEach((row: any) => {
        storeCounts[row.store_id] = parseInt(row.active_count, 10)
      })
    }
  }
  
  const totalPages = count ? Math.ceil(count / limit) : 1
  
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams()
    if (searchParams.category) params.set("category", searchParams.category)
    if (searchParams.city) params.set("city", searchParams.city)
    if (searchParams.verified) params.set("verified", searchParams.verified)
    params.set("page", p.toString())
    return `/stores?${params.toString()}`
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{t("magaziny")}</h1>
          <p className="text-muted-foreground">{t("proverennye_prodavtsy_i_brendy")}</p>
        </div>
        <div className="flex gap-2">
          {/* Mock filters for MVP */}
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/stores">{t("sbrosit_filtry")}</Link>
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/stores?verified=true">{t("tolko_proverennye")}</Link>
          </Button>
        </div>
      </div>

      {!stores || stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 border rounded-3xl bg-muted/20 px-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("poka_net_magazinov")}</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">
            {t("sozdayte_pervyy_magazin_v")}</p>
          <Button asChild size="lg" className="rounded-xl font-semibold">
            <Link href="/stores/create">{t("sozdat_magazin")}</Link>
          </Button>
        </div>
      ) : (
        <>
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
          
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <Button variant="outline" disabled={page <= 1} asChild={page > 1}>
                {page > 1 ? <Link href={buildPageUrl(page - 1)}>{t("nazad")}</Link> : <span>{t("nazad")}</span>}
              </Button>
              <Button variant="outline" disabled={page >= totalPages} asChild={page < totalPages}>
                {page < totalPages ? <Link href={buildPageUrl(page + 1)}>{t("vpered")}</Link> : <span>{t("vpered")}</span>}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
