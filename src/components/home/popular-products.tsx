import { cookies } from "next/headers"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/shared/product-card"
import { createClient } from "@/lib/supabase/server"

export async function PopularProducts() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const regionCookie = cookieStore.get("bazargo_region")?.value
  const activeRegion = regionCookie && regionCookie !== "all" ? decodeURIComponent(regionCookie) : null

  let query = supabase
    .from("listings")
    .select(`
      id, title, price, city, condition, created_at,
      profiles!seller_id(id, full_name),
      listing_images(url, order_index)
    `)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(8)

  if (activeRegion) {
    query = query.eq("region", activeRegion)
  }

  const { data: listings } = await query

  // Map to format for ProductCard
  const products = (listings || []).map((l: any) => {
    const images = l.listing_images?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    return {
      id: l.id,
      title: l.title,
      price: l.price,
      city: l.city,
      time: new Date(l.created_at).toLocaleDateString(),
      condition: l.condition,
      seller: { name: l.profiles?.full_name || "Пользователь", rating: 4.5, reviews: 0 },
      image: images.length > 0 ? images[0].url : "",
      isVerified: false,
      isFavorite: false // MVP, no favorite check on homepage yet
    }
  })

  return (
    <section className="py-10 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-foreground">
              Свежие объявления
            </h2>
            <p className="text-muted-foreground">
              {activeRegion ? `В регионе: ${activeRegion}` : "Новые предложения со всего Кыргызстана"}
            </p>
          </div>
          <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5 -ml-4 sm:ml-0 self-start sm:self-auto" asChild>
            <Link href="/catalog" className="flex items-center gap-2 font-medium">
              Смотреть все <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16 border rounded-2xl bg-muted/20">
            <h3 className="text-xl font-semibold mb-2">В этом регионе пока нет объявлений</h3>
            <p className="text-muted-foreground mb-6">Попробуйте посмотреть объявления из всех регионов</p>
            <Button asChild>
              <Link href="/catalog">Показать все регионы</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-5">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
