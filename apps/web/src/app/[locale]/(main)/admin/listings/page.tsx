import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { Package, Search } from "lucide-react"
import { ListingActions } from "@/features/admin/components/listing-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getTranslations } from "next-intl/server";
import Link from "next/link";

type ListingRow = { id: string, title: string, price: number, status: string, created_at: string, profiles: { full_name: string | null } | null };

export const metadata = {
  title: "Управление объявлениями | BazarGo Admin",
}

export default async function AdminListingsPage(
  props: {
    searchParams?: Promise<{ q?: string, page?: string, status?: string }>
  }
) {
  const t = await getTranslations();
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""
  const currentPage = Math.max(1, parseInt(searchParams?.page || "1", 10))
  const statusFilter = searchParams?.status || ""
  const pageSize = 20

  const authRes = await verifyAdminAccess('LISTINGS_MODERATE')
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">{t("net_dostupa_k_dannomu_1")}</div>;

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
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

  if (query) {
    dbQuery = dbQuery.ilike('title', `%${query}%`)
  }
  
  if (statusFilter) {
    dbQuery = dbQuery.eq('status', statusFilter)
  }

  const { data, error, count } = await dbQuery;
  const listings = data as unknown as ListingRow[]
  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  if (error) {
    return <div className="text-destructive p-4">{t("oshibka_zagruzki_obyavleniy")}{error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-green-500" />
          {t("obyavleniya_1")}
        </h1>
        
        <form className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              name="q" 
              defaultValue={query} 
              placeholder={t("poisk_po_nazvaniyu")} 
              className="pl-8"
            />
          </div>
          <select name="status" defaultValue={statusFilter} className="border rounded-md px-3 text-sm">
            <option value="">Все статусы</option>
            <option value="ACTIVE">Активные</option>
            <option value="PENDING">На модерации</option>
            <option value="REJECTED">Отклоненные</option>
            <option value="BLOCKED">Заблокированные</option>
            <option value="DRAFT">Черновики</option>
          </select>
          <Button type="submit" variant="secondary">{t("primenit")}</Button>
        </form>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">{t("nazvanie")}</th>
                <th className="px-4 py-3">{t("prodavets")}</th>
                <th className="px-4 py-3">{t("tsena")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("data")}</th>
                <th className="px-4 py-3 text-right">{t("deystviya")}</th>
              </tr>
            </thead>
            <tbody>
              {listings?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {t("obyavleniya_ne_naydeny")}</td>
                </tr>
              )}
              {listings?.map((listing: ListingRow) => (
                <tr key={listing.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/listings/${listing.id}`} className="truncate max-w-[200px] hover:underline text-primary" title={listing.title}>
                      {listing.title}
                    </Link>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{listing.id.split('-')[0]}...</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">
                    {listing.profiles?.full_name || "Неизвестен"}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {listing.price} {t("som")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      listing.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      listing.status === 'BLOCKED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      listing.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
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
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {currentPage > 1 && (
            <Link href={`?q=${query}&status=${statusFilter}&page=${currentPage - 1}`}>
              <Button variant="outline" size="sm">{t("nazad") || "Назад"}</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {t("stranitsa")} {currentPage} {t("iz")} {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={`?q=${query}&status=${statusFilter}&page=${currentPage + 1}`}>
              <Button variant="outline" size="sm">{t("vpered") || "Вперед"}</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
