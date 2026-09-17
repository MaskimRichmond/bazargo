import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MapPin, Clock, Tag, User, PackageSearch, ArrowLeft, CheckCircle2 } from "lucide-react"
import { OfferForm } from "@/features/requests/components/offer-form"
import { ProductCard } from "@/components/shared/product-card"

export default async function RequestDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const requestId = params.id;
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: request } = await supabase
    .from("requests")
    .select("*, categories(name), profiles(full_name)")
    .eq("id", requestId)
    .maybeSingle()

  if (!request) {
    notFound()
  }

  // Check if expired
  const isExpired = new Date(request.expires_at) < new Date()
  const effectiveStatus = isExpired && request.status === "OPEN" ? "EXPIRED" : request.status

  const isOwner = session?.user.id === request.buyer_id

  // Fetch offers if owner or if we have an offer as seller
  let offers = []
  if (session && (isOwner || !isOwner)) {
    let query = supabase
      .from("request_offers")
      .select(`
        *,
        listings (
          id, title, price, city, created_at, condition, status, store_id,
          listing_images (url, order_index),
          stores (name, is_verified)
        ),
        profiles (full_name)
      `)
      .eq("request_id", requestId)
    
    if (!isOwner) {
      // Sellers only see their own offers
      query = query.eq("seller_id", session.user.id)
    }
    
    const { data: offersData } = await query
    if (offersData) offers = offersData
  }

  // If seller and OPEN, fetch their ACTIVE listings to offer
  let sellerListings = []
  if (session && !isOwner && effectiveStatus === "OPEN") {
    const { data } = await supabase
      .from("listings")
      .select("id, title, price, status, listing_images(url)")
      .eq("seller_id", session.user.id)
      .eq("status", "ACTIVE")
    if (data) sellerListings = data
  }

  const conditionMap: Record<string, string> = {
    "ANY": "Любое",
    "NEW": "Новое",
    "USED_LIKE_NEW": "Как новое",
    "USED_GOOD": "Хорошее (Б/у)",
    "USED_FAIR": "Удовлетворительное",
    "FOR_PARTS": "На запчасти"
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <Link href="/requests" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        К списку запросов
      </Link>

      <div className="bg-background rounded-3xl border p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground uppercase tracking-wider">
                {request.categories?.name}
              </span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-md uppercase tracking-wider ${
                effectiveStatus === 'OPEN' ? 'bg-green-500/10 text-green-600' :
                effectiveStatus === 'EXPIRED' ? 'bg-orange-500/10 text-orange-600' :
                'bg-muted text-muted-foreground'
              }`}>
                {effectiveStatus === 'OPEN' ? 'Открыт' : 
                 effectiveStatus === 'CLOSED' ? 'Завершён' : 
                 effectiveStatus === 'CANCELLED' ? 'Отменён' : 'Истёк'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{request.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> {request.city}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> До {new Date(request.expires_at).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><User className="w-4 h-4"/> {request.profiles?.full_name}</span>
            </div>
          </div>
          <div className="bg-muted/30 p-4 rounded-xl border min-w-[200px] text-center shrink-0">
            <div className="text-sm text-muted-foreground mb-1">Бюджет до</div>
            {request.budget_max ? (
              <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                {request.budget_max.toLocaleString("ru-RU")} <span className="text-sm">сом</span>
              </div>
            ) : (
              <div className="text-lg font-medium">Не указан</div>
            )}
            {request.condition && request.condition !== "ANY" && (
              <div className="mt-2 text-sm font-medium">
                Состояние: {conditionMap[request.condition]}
              </div>
            )}
          </div>
        </div>

        {request.description && (
          <div className="pt-6 border-t">
            <h3 className="font-semibold mb-2">Описание</h3>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {request.description}
            </p>
          </div>
        )}
      </div>

      {!isOwner && effectiveStatus === "OPEN" && offers.length === 0 && (
        <div className="bg-primary/5 rounded-3xl border border-primary/20 p-6 md:p-8">
          <h2 className="text-xl font-bold mb-4">Предложить товар</h2>
          <OfferForm requestId={request.id} sellerListings={sellerListings} />
        </div>
      )}

      {(isOwner || offers.length > 0) && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">
            {isOwner ? `Предложения продавцов (${offers.length})` : "Ваше предложение"}
          </h2>
          
          {offers.length === 0 ? (
            <div className="text-center py-16 px-4 border rounded-3xl bg-muted/10">
              <PackageSearch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">Пока нет предложений</h3>
              <p className="text-muted-foreground">Продавцы ещё не предложили товары для вашего запроса.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {offers.map((offer: any) => {
                const l = offer.listings
                if (!l) return null
                const images = l.listing_images?.sort((a: any, b: any) => a.order_index - b.order_index) || []
                const store = l.stores
                
                const product = {
                  id: l.id,
                  title: l.title,
                  price: l.price,
                  city: l.city,
                  time: new Date(l.created_at).toLocaleDateString(),
                  condition: l.condition,
                  seller: store ? { name: store.name, rating: 0, reviews: 0 } : { name: offer.profiles?.full_name || "Продавец", rating: 0, reviews: 0 },
                  image: images.length > 0 ? images[0].url : "",
                  isVerified: store?.is_verified || false,
                  outOfStock: l.status === "OUT_OF_STOCK"
                }
                
                return (
                  <div key={offer.id} className="relative group">
                    <ProductCard product={product} />
                    <div className="absolute top-2 left-2 z-10 w-[calc(100%-16px)]">
                      {store && (
                        <div className="bg-background/95 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold shadow-sm flex items-center gap-1 border">
                          Магазин {store.is_verified && <CheckCircle2 className="w-3 h-3 text-blue-500"/>}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
