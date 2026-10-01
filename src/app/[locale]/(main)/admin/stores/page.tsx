import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { Store, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getTranslations } from "next-intl/server";
import Link from "next/link";

type StoreRow = { id: string, name: string, status: string, created_at: string, owner: { full_name: string | null } | null };

export const metadata = {
  title: "Магазины | BazarGo Admin",
}

export default async function AdminStoresPage(
  props: {
    searchParams?: Promise<{ q?: string, page?: string }>
  }
) {
  const t = await getTranslations();
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""
  const currentPage = Math.max(1, parseInt(searchParams?.page || "1", 10))
  const pageSize = 20

  const authRes = await verifyAdminAccess()
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">{t("net_dostupa_k_dannomu_1")}</div>;

  const adminClient = createAdminClient()

  let dbQuery = adminClient
    .from('stores')
    .select(`
      id,
      name,
      status,
      created_at,
      owner:profiles!owner_id ( id, full_name )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

  if (query) {
    dbQuery = dbQuery.ilike('name', `%${query}%`)
  }

  const { data, error, count } = await dbQuery;
  const stores = data as unknown as StoreRow[]
  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  if (error) {
    return <div className="text-destructive p-4">{t("oshibka_zagruzki_magazinov")}{error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="w-6 h-6 text-pink-500" />
          {t("magaziny")}
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
          <Button type="submit" variant="secondary">{t("primenit")}</Button>
        </form>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">{t("nazvanie")}</th>
                <th className="px-4 py-3">{t("vladelets")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("data_sozdaniya")}</th>
              </tr>
            </thead>
            <tbody>
              {stores?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    {t("magaziny_ne_naydeny")}</td>
                </tr>
              )}
              {stores?.map((store: StoreRow) => (
                <tr key={store.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {store.name}
                    <div className="text-[10px] text-muted-foreground font-mono mt-1">{store.id.split('-')[0]}...</div>
                  </td>
                  <td className="px-4 py-3 truncate max-w-[150px]">
                    {store.owner?.full_name || "Неизвестен"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium uppercase ${
                      store.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      store.status === 'BLOCKED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {store.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(store.created_at).toLocaleDateString('ru-RU')}
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
            <Link href={`?q=${query}&page=${currentPage - 1}`}>
              <Button variant="outline" size="sm">{t("nazad") || "Назад"}</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {t("stranitsa")} {currentPage} {t("iz")} {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={`?q=${query}&page=${currentPage + 1}`}>
              <Button variant="outline" size="sm">{t("vpered") || "Вперед"}</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
