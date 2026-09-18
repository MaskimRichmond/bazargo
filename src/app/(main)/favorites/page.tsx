import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { ProductCard } from "@/components/shared/product-card"

export const metadata = {
  title: "Избранное | BazarGo"
}

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  let listings: any[] = []

  if (session) {
    const { data: favs } = await supabase
      .from("favorites")
      .select(`
        listing_id,
        listings (
          id, title, price, city, created_at, condition, status, quantity,
          profiles!seller_id ( full_name ),
          categories ( name ),
          listing_images ( url, order_index )
        )
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (favs) {
      listings = favs
        .map((f: any) => f.listings)
        .filter(Boolean)
        .map((l: any) => {
          const images = l.listing_images?.sort((a: any, b: any) => a.order_index - b.order_index) || []
          
          return {
            id: l.id,
            title: l.title,
            price: l.price,
            city: l.city,
            time: new Date(l.created_at).toLocaleDateString(),
            condition: l.condition,
            seller: {
              name: l.profiles?.full_name || "Продавец",
              rating: 5.0,
              reviews: 0
            },
            image: images.length > 0 ? images[0].url : "/placeholder.png",
            isVerified: false,
            outOfStock: l.status !== "ACTIVE",
            isFavorite: true // they are all favorites on this page
          }
        })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl min-h-[60vh]">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Избранное</h1>
        <p className="text-muted-foreground">Ваши сохраненные товары</p>
      </div>
      
      {!session ? (
        <div className="flex flex-col items-center justify-center text-center py-20 border rounded-3xl bg-muted/20 px-4">
          <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mb-6">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Войдите в аккаунт</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">Авторизуйтесь, чтобы сохранять понравившиеся товары в избранное</p>
          <Button asChild size="lg" className="rounded-xl font-semibold">
            <Link href="/login?redirect_to=/favorites">Войти</Link>
          </Button>
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 border rounded-3xl bg-muted/20 px-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">У вас пока нет избранных товаров.</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">Нажимайте на сердечко на карточках товаров, чтобы сохранить их здесь</p>
          <Button asChild size="lg" className="rounded-xl font-semibold">
            <Link href="/catalog">Перейти в каталог</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {listings.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      )}
    </div>
  )
}
