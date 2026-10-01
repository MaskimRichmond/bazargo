import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, MapPin, CheckCircle, Star } from "lucide-react"

import { ContactSeller } from "@/features/product/components/contact-seller"
import { BuyButtons } from "@/features/product/components/buy-buttons"

import { FavoriteButton } from "@/components/shared/favorite-button"
import { ProductImageGallery } from "@/components/shared/product-image-gallery"
import { ShareButton } from "@/components/shared/share-button"
import { ProductCard } from "@/components/shared/product-card"
import { getCachedProductData } from "@/features/product/api/get-product"
import { getConditionLabel } from "@/lib/condition-labels"
import { ReportModal } from "@/features/reports/components/report-modal"
import { CreateB2BOfferModal } from "@/features/b2b/components/create-offer-modal"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const data = await getCachedProductData(id)
  
  if (!data || !data.listing) {
    return { title: "Товар не найден | BazarGo" }
  }

  const { listing } = data
  const images = listing.listing_images?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index) || []
  const mainImage = images.length > 0 ? images[0].url : "/placeholder.png"
  
  return {
    title: `${listing.title} за ${listing.price} сом | BazarGo`,
    description: listing.description?.substring(0, 160) || `Купить ${listing.title} в ${listing.city}`,
    openGraph: {
      title: `${listing.title} - ${listing.price} сом`,
      description: listing.description?.substring(0, 160) || `Купить ${listing.title} в ${listing.city}`,
      images: [{ url: mainImage }]
    }
  }
}

export default async function ProductPage(props: { params: Promise<{ id: string }> }) {
    const t = await getTranslations();
  const params = await props.params;
  const { id } = params;
  
  const data = await getCachedProductData(id)

  if (!data || !data.listing) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center min-h-[70vh]">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">{t("tovar_ne_nayden")}</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          {t("obyavlenie_bylo_udaleno_ili")}</p>
        <Button asChild size="lg" className="rounded-xl font-semibold">
          <a href="/catalog">{t("vernutsya_v_katalog")}</a>
        </Button>
      </div>
    );
  }

  const { listing, similarListings, sellerListings } = data

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

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
  const images = listing.listing_images?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index) || []
  const mainImage = images.length > 0 ? images[0].url : "/placeholder.png"

  const seller = listing.profiles
  const sellerInitial = seller?.full_name?.charAt(0) || "U"

  let sellerPhone = null;
  if (listing.show_phone || session?.user?.id === listing.seller_id) {
    const { data: phoneData } = await supabase.rpc("get_listing_phone", { p_listing_id: listing.id })
    if (phoneData) sellerPhone = phoneData;
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Images */}
        <ProductImageGallery 
          images={images}
          title={listing.title}
          status={listing.status}
          favoriteButton={
            <div className="flex items-center gap-2">
              <ShareButton 
                title={listing.title} 
                className="w-10 h-10 rounded-full opacity-100 bg-background/80 hover:bg-background/90 text-foreground"
              />
              <FavoriteButton 
                listingId={listing.id}
                initialIsFavorite={isFavorite}
                className="!w-10 !h-10 opacity-100 bg-background/80 hover:bg-background/90"
                iconClassName="!w-6 !h-6"
              />
            </div>
          }
        />

        {/* Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="bg-muted px-2 py-1 rounded-md">{listing.categories?.name}</span>
              <span>•</span>
              <span>{new Date(listing.created_at).toLocaleDateString()}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{listing.title}</h1>
            <p className="text-4xl font-bold text-primary">{listing.price.toLocaleString("ru-RU")} {t("som")}</p>
            
            {listing.is_b2b && listing.wholesale_price && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                <div className="space-y-1">
                  <div className="font-semibold text-primary flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    B2B Оптовое предложение
                  </div>
                  <div className="text-sm">Оптовая цена: <span className="font-bold">{listing.wholesale_price.toLocaleString("ru-RU")} {t("som")}</span></div>
                  <div className="text-sm">Минимальная партия: <span className="font-bold">{listing.min_order_quantity} шт.</span></div>
                </div>
                <div className="pt-2">
                  <CreateB2BOfferModal 
                    listingId={listing.id}
                    minOrderQuantity={listing.min_order_quantity || 1}
                    suggestedPrice={listing.wholesale_price || listing.price}
                    sellerId={listing.seller_id}
                    currentUserId={session?.user?.id}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:block space-y-3">
            <ContactSeller 
              listingId={listing.id}
              sellerId={listing.seller_id}
              currentUserId={session?.user?.id}
              showPhone={listing.show_phone}
              phone={sellerPhone}
            />

            <BuyButtons 
              listingId={listing.id}
              sellerId={listing.seller_id}
              currentUserId={session?.user?.id}
              status={listing.status}
              quantity={listing.quantity}
              listingType={listing.listing_type}
            />
          </div>

          <Card className="p-4 space-y-4 rounded-xl border-border/50 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl overflow-hidden">
                {seller?.avatar_url ? <img src={seller.avatar_url} className="w-full h-full object-cover" /> : sellerInitial}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg">{seller?.full_name || "Пользователь"}</p>
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                  {seller?.rating > 0 ? (
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {seller.rating} ({seller.reviews_count} {t("otzyvov")})
                    </span>
                  ) : (
                    <span>Нет отзывов</span>
                  )}
                  <span>•</span>
                  <span>{t("na_bazargo_s")}{new Date(seller?.created_at).getFullYear()}</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <h2 className="text-xl font-semibold">{t("harakteristiki")}</h2>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-muted-foreground">{t("sostoyanie")}</div>
              <div className="font-medium">
                {getConditionLabel(listing.condition)}
              </div>
              <div className="text-muted-foreground">{t("gorod")}</div>
              <div className="font-medium flex items-center gap-1"><MapPin className="w-4 h-4 text-muted-foreground"/> {listing.city}</div>
              
              {listing.listing_type === "INVENTORY" && (
                <>
                  <div className="text-muted-foreground">{t("v_nalichii_1")}</div>
                  <div className="font-medium">{listing.quantity} {t("sht_1")}</div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <h2 className="text-xl font-semibold">{t("opisanie")}</h2>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {listing.description}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <h2 className="text-xl font-semibold">{t("sposob_polucheniya")}</h2>
            <div className="flex gap-2 flex-wrap">
              {(listing.delivery_methods || []).map((m: string) => {
                if (m === "PICKUP") return <span key={m} className="px-3 py-1 bg-muted rounded-full text-xs font-medium">{t("samovyvoz")}</span>;
                if (m === "SELLER_DELIVERY") return <span key={m} className="px-3 py-1 bg-muted rounded-full text-xs font-medium">{t("dostavka_prodavtsom")}</span>;
                if (m === "THIRD_PARTY") return <span key={m} className="px-3 py-1 bg-muted rounded-full text-xs font-medium">{t("kurer")}</span>;
                return <span key={m} className="px-3 py-1 bg-muted rounded-full text-xs font-medium">{m}</span>
              })}
            </div>
          </div>

          <div className="pt-8 flex justify-end">
             <ReportModal targetId={listing.id} targetType="LISTING" />
          </div>

        </div>
      </div>

      {/* Similar Products */}
      {similarListings && similarListings.length > 0 && (
        <div className="mt-16 border-t pt-10">
          <h2 className="text-2xl font-bold mb-6">{t("pohozhie_tovary")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {similarListings.map((l: { id: string, title: string, price: number, city: string, created_at: string, condition: string, profiles?: { full_name?: string }, listing_images?: { url: string, order_index: number }[] }) => {
              const images = l.listing_images?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index) || []
              return (
                <ProductCard 
                  key={l.id} 
                  product={{
                    id: l.id,
                    title: l.title,
                    price: l.price,
                    city: l.city,
                    time: new Date(l.created_at).toLocaleDateString(),
                    condition: l.condition,
                    seller: { name: l.profiles?.full_name || "Пользователь" },
                    image: images.length > 0 ? images[0].url : "",
                    isVerified: false,
                  }} 
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Seller Products */}
      {sellerListings && sellerListings.length > 0 && (
        <div className="mt-16 border-t pt-10">
          <h2 className="text-2xl font-bold mb-6">{t("drugie_tovary_prodavtsa")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sellerListings.map((l: { id: string, title: string, price: number, city: string, created_at: string, condition: string, profiles?: { full_name?: string }, listing_images?: { url: string, order_index: number }[] }) => {
              const images = l.listing_images?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index) || []
              return (
                <ProductCard 
                  key={l.id} 
                  product={{
                    id: l.id,
                    title: l.title,
                    price: l.price,
                    city: l.city,
                    time: new Date(l.created_at).toLocaleDateString(),
                    condition: l.condition,
                    seller: { name: seller?.full_name || "Пользователь" },
                    image: images.length > 0 ? images[0].url : "",
                    isVerified: false,
                  }} 
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Mobile Sticky Action Bar */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 p-3 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-40 flex flex-col gap-2">
        <ContactSeller 
          listingId={listing.id}
          sellerId={listing.seller_id}
          currentUserId={session?.user?.id}
          showPhone={listing.show_phone}
          phone={sellerPhone}
        />
        <BuyButtons 
          listingId={listing.id}
          sellerId={listing.seller_id}
          currentUserId={session?.user?.id}
          status={listing.status}
          quantity={listing.quantity}
          listingType={listing.listing_type}
        />
      </div>
      <div className="h-24 md:hidden" /> {/* Spacer for mobile bar */}
    </div>
  );
}

