import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { Package, Search } from "lucide-react"
import { ListingActions } from "@/features/admin/components/listing-actions"
import { Input } from "@/components/ui/input"

type ListingRow = { id: string, title: string, price: number, status: string, created_at: string, profiles: { full_name: string | null } | null };

export const metadata = {
  title: "Управление объявлениями | BazarGo Admin",
}

export default async function AdminListingsPage(
  props: {
    searchParams?: Promise<{ q?: string }>
  }
) {
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""

  const authRes = await verifyAdminAccess('LISTINGS_MODERATE')
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">Нет доступа к данному разделу.</div>

  const adminClient = createAdminClient()

  let dbQuery = adminClient
    .from('listings')
    .select(`
      id,
      title,
      price,
      status,
      created_at,
      profiles!seller_id ( id, full_name )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (query) {
    dbQuery = dbQuery.ilike('title', `%${query}%`)
  }

  const { data, error } = await dbQuery;
  const listings = data as unknown as ListingRow[]

  if (error) {
    return <div className="text-destructive p-4">Ошибка загрузки объявлений: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-green-500" />
          Объявления
        </h1>
        
        <form className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            name="q" 
            defaultValue={query} 
            placeholder="Поиск по названию..." 
            className="pl-8"
          />
        </form>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Продавец</th>
                <th className="px-4 py-3">Цена</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {listings?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Объявления не найдены
                  </td>
                </tr>
              )}
              {listings?.map((listing: ListingRow) => (
                <tr key={listing.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <div className="truncate max-w-[200px]" title={listing.title}>
                      {listing.title}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{listing.id.split('-')[0]}...</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">
                    {listing.profiles?.full_name || "Неизвестен"}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {listing.price} сом
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      listing.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      listing.status === 'BLOCKED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {listing.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(listing.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ListingActions listing={listing} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
