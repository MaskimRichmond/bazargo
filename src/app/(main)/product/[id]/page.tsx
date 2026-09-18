import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, MapPin, CheckCircle } from "lucide-react"

import { POPULAR_PRODUCTS } from "@/lib/mock-data"
import { ContactSeller } from "@/features/product/components/contact-seller"

import { FavoriteButton } from "@/components/shared/favorite-button"

export default async function ProductPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Try to fetch real listing
  let { data: listing, error } = await supabase
    .from("listings")
    .select(`
      *,
      profiles!seller_id(id, full_name, phone, avatar_url, created_at),
      categories(id, name),
      listing_images(url, order_index)
    `)
    .eq("id", id)
    .single()

  if (error || !listing) {
    const mock = POPULAR_PRODUCTS.find(p => p.id === id)
    if (mock) {
      // Create a mock listing object compatible with the page
      listing = {
        id: mock.id,
        seller_id: mock.seller.name,
        title: mock.title,
        price: mock.price,
        city: mock.city,
        condition: mock.condition === "Новое" ? "NEW" : "USED_GOOD",
        description: "Описание для демо-товара.",
        created_at: new Date().toISOString(),
        categories: { name: "Разное" },
        profiles: { full_name: mock.seller.name, created_at: new Date().toISOString() },
        listing_images: [{ url: mock.image, order_index: 0 }],
        delivery_methods: ["PICKUP"]
      }
    } else {
      return (
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center min-h-[70vh]">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">Товар не найден</h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Объявление было удалено или перемещено в архив продавцом.
          </p>
          <Button asChild size="lg" className="rounded-xl font-semibold">
            <a href="/catalog">Вернуться в каталог</a>
          </Button>
        </div>
      )
    }
  }

  let isFavorite = false
  if (session?.user?.id) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("listing_id")
      .eq("user_id", session.user.id)
      .eq("listing_id", listing.id)
      .maybeSingle()
    if (fav) isFavorite = true
  }

  // Sort images
  const images = listing.listing_images?.sort((a: any, b: any) => a.order_index - b.order_index) || []
  const mainImage = images.length > 0 ? images[0].url : "/placeholder.png"

  const seller = listing.profiles
  const sellerInitial = seller?.full_name?.charAt(0) || "U"

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-[4/3] bg-muted rounded-2xl overflow-hidden relative group">
            <img src={mainImage} alt={listing.title} className="w-full h-full object-cover" />
            <FavoriteButton 
              listingId={listing.id}
              initialIsFavorite={isFavorite}
              className="absolute top-4 right-4 !w-10 !h-10 opacity-100 bg-background/80 hover:bg-background/90"
              iconClassName="!w-6 !h-6"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
              {images.slice(1).map((img: any, i: number) => (
                <div key={i} className="w-24 h-24 rounded-xl bg-muted overflow-hidden shrink-0 snap-start border">
                  <img src={img.url} className="w-full h-full object-cover" alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="bg-muted px-2 py-1 rounded-md">{listing.categories?.name}</span>
              <span>•</span>
              <span>{new Date(listing.created_at).toLocaleDateString()}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{listing.title}</h1>
            <p className="text-4xl font-bold text-primary">{listing.price.toLocaleString("ru-RU")} сом</p>
          </div>

          <ContactSeller 
            listingId={listing.id}
            sellerId={listing.seller_id}
            currentUserId={session?.user?.id}
            showPhone={listing.show_phone}
            phone={(listing.show_phone || session?.user?.id === listing.seller_id) ? listing.profiles?.phone : null}
          />

          <Card className="p-4 space-y-4 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl overflow-hidden">
                {seller?.avatar_url ? <img src={seller.avatar_url} className="w-full h-full object-cover" /> : sellerInitial}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg">{seller?.full_name || "Пользователь"}</p>
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">На BazarGo с {new Date(seller?.created_at).getFullYear()}</p>
              </div>
            </div>
          </Card>

          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-xl font-semibold">Характеристики</h2>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-muted-foreground">Состояние</div>
              <div className="font-medium">
                {listing.condition === "NEW" ? "Новое" : 
                 listing.condition === "USED_LIKE_NEW" ? "Б/у (идеальное)" : 
                 listing.condition === "USED_GOOD" ? "Б/у (хорошее)" : 
                 listing.condition === "USED_FAIR" ? "Б/у (нормальное)" : "На запчасти"}
              </div>
              <div className="text-muted-foreground">Город</div>
              <div className="font-medium flex items-center gap-1"><MapPin className="w-4 h-4"/> {listing.city}</div>
              
              {listing.listing_type === "INVENTORY" && (
                <>
                  <div className="text-muted-foreground">В наличии</div>
                  <div className="font-medium">{listing.quantity} шт</div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-xl font-semibold">Описание</h2>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {listing.description}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-xl font-semibold">Способ получения</h2>
            <div className="flex gap-2 flex-wrap">
              {(listing.delivery_methods || []).map((m: string) => {
                if (m === "PICKUP") return <span key={m} className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium">Самовывоз</span>
                if (m === "SELLER_DELIVERY") return <span key={m} className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium">Доставка продавцом</span>
                if (m === "THIRD_PARTY") return <span key={m} className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium">Доставка через сторонний сервис</span>
                return <span key={m} className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium">{m}</span>
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
