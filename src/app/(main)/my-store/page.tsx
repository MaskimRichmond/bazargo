import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Edit2, ExternalLink, PackagePlus, Store, Users, Package, CheckCircle2 } from "lucide-react"
import { ImageWithFallback } from "@/components/shared/image-with-fallback"
import { MyListingsClient } from "@/features/my-listings/components/my-listings-client"

export const metadata = {
  title: "Мой магазин | BazarGo"
}

export default async function MyStorePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/my-store")
  }

  // Fetch store
  const { data: store } = await supabase
    .from("stores")
    .select("*, categories(name)")
    .eq("owner_id", session.user.id)
    .maybeSingle()

  if (!store) {
    return (
      <div className="container max-w-2xl mx-auto py-20 px-4 text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
          <Store className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">У вас пока нет магазина</h1>
          <p className="text-muted-foreground">Создайте магазин и начните продавать товары регулярно.</p>
        </div>
        <Button asChild size="lg" className="rounded-xl">
          <Link href="/stores/create">Создать магазин</Link>
        </Button>
      </div>
    )
  }

  // Fetch store listings
  const { data: listings } = await supabase
    .from("listings")
    .select(`
      id, title, price, status, created_at,
      listing_images (url, order_index)
    `)
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })

  // Fetch followers count
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("followed_store_id", store.id)

  const activeCount = listings?.filter((l: any) => l.status === "ACTIVE" || l.status === "OUT_OF_STOCK").length || 0
  const soldCount = listings?.filter((l: any) => l.status === "SOLD").length || 0

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Store Header Info */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 bg-muted/30 p-6 rounded-2xl border">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border relative shrink-0">
          {store.logo_url ? (
            <ImageWithFallback src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Store className="w-10 h-10" />
            </div>
          )}
        </div>
        
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {store.name}
            {store.is_verified && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
          </h1>
          <p className="text-muted-foreground text-sm line-clamp-2">{store.description || "Нет описания"}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{store.categories?.name}</span>
            <span>•</span>
            <span>{store.city}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <Button asChild variant="outline" className="w-full justify-start rounded-xl">
            <Link href={`/store/${store.slug}`}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Открыть магазин
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start rounded-xl">
            <Link href="/my-store/edit">
              <Edit2 className="w-4 h-4 mr-2" />
              Настройки
            </Link>
          </Button>
          <Button asChild className="w-full justify-start rounded-xl">
            <Link href="/sell?type=INVENTORY">
              <PackagePlus className="w-4 h-4 mr-2" />
              Добавить товар
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/20 p-4 rounded-xl border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">Всего товаров</span>
          </div>
          <p className="text-2xl font-bold">{listings?.length || 0}</p>
        </div>
        <div className="bg-muted/20 p-4 rounded-xl border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium">Активных</span>
          </div>
          <p className="text-2xl font-bold">{activeCount}</p>
        </div>
        <div className="bg-muted/20 p-4 rounded-xl border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-medium">Проданных</span>
          </div>
          <p className="text-2xl font-bold">{soldCount}</p>
        </div>
        <div className="bg-muted/20 p-4 rounded-xl border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Подписчиков</span>
          </div>
          <p className="text-2xl font-bold">{followersCount || 0}</p>
        </div>
      </div>

      {/* Store Listings */}
      <div>
        <h2 className="text-xl font-bold mb-4">Мои товары ({listings?.length || 0})</h2>
        {listings && listings.length > 0 ? (
          <MyListingsClient listings={listings} />
        ) : (
          <div className="text-center py-12 px-4 border rounded-2xl bg-muted/20">
            <h3 className="text-lg font-semibold mb-2">В магазине пока нет товаров</h3>
            <p className="text-muted-foreground mb-6">Добавьте первый товар, чтобы начать продажи.</p>
            <Button asChild>
              <Link href="/sell?type=INVENTORY">Добавить товар</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
