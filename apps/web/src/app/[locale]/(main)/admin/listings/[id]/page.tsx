import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Package, User } from "lucide-react"
import { ListingActions } from "@/features/admin/components/listing-actions"
import { getTranslations } from "next-intl/server"

export const metadata = {
  title: "Детали объявления | BazarGo Admin",
}

export default async function AdminListingDetailPage({ params }: { params: { id: string } }) {
  const t = await getTranslations();
  const authRes = await verifyAdminAccess('LISTINGS_MODERATE')
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">{t("net_dostupa_k_dannomu_1")}</div>;

  const adminClient = createAdminClient()

  const { data: listing, error } = await adminClient
    .from('listings')
    .select(`
      *,
      profiles!seller_id ( id, full_name, role, is_banned ),
      categories ( id, name )
    `)
    .eq('id', params.id)
    .single()

  if (error || !listing) {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/admin/listings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4 mr-1" /> К списку объявлений
      </Link>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {listing.images && listing.images.length > 0 ? (
              <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{listing.title}</h1>
            <div className="text-sm text-muted-foreground font-mono mt-1">{listing.id}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                listing.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                listing.status === 'BLOCKED' ? 'bg-red-100 text-red-700' :
                listing.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                'bg-secondary text-secondary-foreground'
              }`}>
                {listing.status}
              </span>
              <span className="font-semibold text-primary">{listing.price} {t("som")}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 min-w-40">
          <ListingActions listing={listing} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Listing Details */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Детали объявления</h3>
          <div className="grid grid-cols-3 gap-y-3 text-sm">
            <span className="text-muted-foreground">Категория:</span>
            <span className="font-medium col-span-2">{listing.categories?.name || listing.category_id || "—"}</span>
            
            <span className="text-muted-foreground">Тип:</span>
            <span className="font-medium col-span-2">{listing.listing_type}</span>
            
            <span className="text-muted-foreground">Состояние:</span>
            <span className="font-medium col-span-2">{listing.condition || "—"}</span>
            
            <span className="text-muted-foreground">Создано:</span>
            <span className="font-medium col-span-2">{new Date(listing.created_at).toLocaleString('ru-RU')}</span>
          </div>
          
          <div className="pt-2 border-t">
            <span className="text-muted-foreground block text-sm mb-1">Описание:</span>
            <p className="text-sm whitespace-pre-wrap">{listing.description}</p>
          </div>
        </div>

        {/* Seller Info */}
        <div className="bg-card border rounded-xl p-5 space-y-4 h-fit">
          <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" />
            Продавец
          </h3>
          <div className="grid grid-cols-3 gap-y-3 text-sm">
            <span className="text-muted-foreground">Имя:</span>
            <span className="font-medium col-span-2">
              <Link href={`/admin/users/${listing.seller_id}`} className="hover:underline text-primary">
                {listing.profiles?.full_name || "Неизвестен"}
              </Link>
            </span>
            
            <span className="text-muted-foreground">ID:</span>
            <span className="font-mono text-xs col-span-2">{listing.seller_id}</span>
            
            <span className="text-muted-foreground">Статус:</span>
            <span className="col-span-2">
              {listing.profiles?.is_banned ? (
                <span className="text-red-500 font-medium text-xs">Заблокирован</span>
              ) : (
                <span className="text-green-500 font-medium text-xs">Активен</span>
              )}
            </span>
          </div>
        </div>
      </div>
      
      {/* Images Gallery */}
      {listing.images && listing.images.length > 0 && (
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Фотографии</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {listing.images.map((img: string, idx: number) => (
              <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden border hover:opacity-90">
                <img src={img} alt={`Фото ${idx + 1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
