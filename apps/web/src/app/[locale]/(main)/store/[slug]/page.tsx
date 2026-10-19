import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductCard } from "@/components/shared/product-card"
import { Store, MapPin, CheckCircle2, Users, Star, Package } from "lucide-react"
import { ImageWithFallback } from "@/components/shared/image-with-fallback"
import { FollowButton } from "@/features/stores/components/follow-button"
import { ReplyToReview } from "@/features/reviews/components/reply-to-review"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const supabase = await createClient()
  const { data: store } = await supabase
    .from("stores")
    .select("name, description, logo_url, city")
    .eq("slug", params.slug)
    .eq("status", "APPROVED")
    .maybeSingle()
    
  if (!store) {
    return { title: "Магазин не найден | BazarGo" }
  }

  return {
    title: `${store.name} на BazarGo`,
    description: store.description?.substring(0, 160) || `Магазин ${store.name} в ${store.city}`,
    openGraph: {
      title: `${store.name} - BazarGo`,
      description: store.description?.substring(0, 160) || `Магазин ${store.name} в ${store.city}`,
      images: store.logo_url ? [{ url: store.logo_url }] : []
    }
  }
}

export default async function PublicStorePage(props: { params: Promise<{ slug: string }> }) {
    const t = await getTranslations();
  const params = await props.params;
  const slug = params.slug;
  const supabase = await createClient()

  const { data: store } = await supabase
    .from("stores")
    .select("*, categories(name)")
    .eq("slug", slug)
    .eq("status", "APPROVED")
    .maybeSingle()

  if (!store) {
    notFound()
  }

  // Fetch active listings
  const { data: listings } = await supabase
    .from("listings")
    .select(`
      id, title, price, city, created_at, condition, status,
      listing_images (url, order_index)
    `)
    .eq("store_id", store.id)
    .in("status", ["ACTIVE", "OUT_OF_STOCK"])
    .order("created_at", { ascending: false })

  // Fetch followers count
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("followed_store_id", store.id)

  // Check if current user is following
  let isFollowing = false
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    const { data: follow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", session.user.id)
      .eq("followed_store_id", store.id)
      .maybeSingle()
    if (follow) isFollowing = true
  }

  // Fetch Reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select(`
      id,
      rating,
      comment,
      reply,
      created_at,
      reviewer:profiles!reviewer_id(full_name, avatar_url)
    `)
    .eq("target_store_id", store.id)
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false })

  const isOwner = session?.user.id === store.owner_id

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Store Header */}
      <div className="bg-background rounded-3xl border p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 mb-8 shadow-sm">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-muted border-4 border-background shadow-md shrink-0 relative">
          {store.logo_url ? (
            <ImageWithFallback src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
              <Store className="w-16 h-16" />
            </div>
          )}
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-4 w-full">
          <div>
            <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2 mb-2">
              {store.name}
              {store.is_verified && <CheckCircle2 className="w-6 h-6 text-blue-500 shrink-0" />}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
              {store.categories?.name && (
                <span className="font-medium text-foreground bg-muted px-2.5 py-0.5 rounded-full">
                  {store.categories.name}
                </span>
              )}
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {store.city}</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {followersCount || 0} {t("podpischikov_1")}</span>
              <span className="flex items-center gap-1">
                <Star className={`w-4 h-4 ${store.rating > 0 ? "text-orange-400 fill-orange-400" : "text-muted-foreground"}`} /> 
                {store.rating || "0.0"} ({store.reviews_count || 0})
              </span>
            </div>
          </div>
          
          <p className="text-muted-foreground max-w-2xl line-clamp-3">
            {store.description || "Магазин пока не добавил описание."}
          </p>
          
          <div className="flex justify-center md:justify-start gap-3 pt-2">
            {!isOwner ? (
              <FollowButton storeId={store.id} initialIsFollowing={isFollowing} />
            ) : (
              <Button asChild variant="outline" className="rounded-xl font-semibold">
                <a href="/my-store/edit">{t("redaktirovat_magazin")}</a>
              </Button>
            )}
            {store.phone && (
              <Button variant="outline" className="rounded-xl font-semibold">{t("pozvonit")}</Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="w-full justify-start h-14 bg-transparent border-b rounded-none mb-8 overflow-x-auto">
          <TabsTrigger value="products" className="text-base h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            {t("tovary")} ({listings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-base h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            {t("otzyvy_0")} ({store.reviews_count || 0})
          </TabsTrigger>
          <TabsTrigger value="about" className="text-base h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            {t("o_magazine")}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="products" className="mt-0 outline-none">
          {listings && listings.length > 0 ? (
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
                  seller: { name: store.name, rating: store.rating, reviews: store.reviews_count },
                  image: images.length > 0 ? images[0].url : "",
                  isVerified: store.is_verified,
                  outOfStock: l.status === "OUT_OF_STOCK"
                }
                return <ProductCard key={l.id} product={product} />
              })}
            </div>
          ) : (
            <div className="text-center py-20 px-4 border rounded-3xl bg-muted/10">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">{t("net_aktivnyh_tovarov")}</h3>
              <p className="text-muted-foreground">{t("v_dannyy_moment_u")}</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="reviews" className="mt-0 outline-none">
          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((r: any) => (
                <div key={r.id} className="p-6 bg-card border rounded-2xl">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                        {r.reviewer?.avatar_url ? (
                          <img src={r.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">?</div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{r.reviewer?.full_name || "Покупатель"}</div>
                        <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ru-RU")}</div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`w-4 h-4 ${star <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm mt-3">{r.comment}</p>
                  
                  {r.reply ? (
                    <div className="mt-4 p-4 bg-muted/50 rounded-xl text-sm border-l-2 border-primary">
                      <span className="font-semibold block mb-1">Ответ магазина:</span>
                      {r.reply}
                    </div>
                  ) : isOwner ? (
                    <div className="mt-2">
                      <ReplyToReview reviewId={r.id} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 px-4 border rounded-3xl bg-muted/10">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">{t("otzyvov_poka_net")}</h3>
              <p className="text-muted-foreground">{t("stante_pervym_kto_ostavit")}</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="about" className="mt-0 outline-none">
          <div className="bg-background rounded-3xl border p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-3">{t("informatsiya")}</h3>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {store.description || "Описание отсутствует."}
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6 pt-6 border-t">
              <div>
                <h4 className="font-semibold mb-1">{t("gorod")}</h4>
                <p className="text-muted-foreground">{store.city}</p>
              </div>
              {store.phone && (
                <div>
                  <h4 className="font-semibold mb-1">{t("telefon")}</h4>
                  <p className="text-muted-foreground">{store.phone}</p>
                </div>
              )}
              {store.email && (
                <div>
                  <h4 className="font-semibold mb-1">Email</h4>
                  <p className="text-muted-foreground">{store.email}</p>
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-1">{t("na_sayte_s")}</h4>
                <p className="text-muted-foreground">{new Date(store.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
