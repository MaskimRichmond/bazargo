import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { Trash2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

type ReqRow = { user_id: string, status: string, started_at: string | null, completed_at: string | null, error_details: string | undefined, profiles: { full_name: string | null } | null };

export const metadata = {
  title: "Удаления Аккаунтов | BazarGo Admin",
}

export default async function AdminAccountDeletionsPage(
  props: {
    searchParams?: Promise<{ q?: string }>
  }
) {
    const t = await getTranslations();
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""

  const authRes = await verifyAdminAccess()
  if (!authRes.authorized || !['ADMIN', 'SUPER_ADMIN'].includes(authRes.role)) {
    return <div className="text-destructive font-medium p-4">{t("net_dostupa_k_dannomu")}</div>;
  }

  const adminClient = createAdminClient()

  let dbQuery = adminClient
    .from('account_deletion_requests')
    .select(`
      user_id,
      status,
      started_at,
      completed_at,
      error_details,
      profiles!user_id ( full_name )
    `)
    .order('started_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (query) {
    dbQuery = dbQuery.eq('status', query.toUpperCase()) // Filter by status instead of text search
  }

  const { data, error } = await dbQuery;
  const requests = data as unknown as ReqRow[]

  if (error) {
    return <div className="text-destructive p-4">{t("oshibka_zagruzki_udaleniy")}{error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-red-500" />
          {t("zaprosy_na_udalenie")}</h1>
        
        <form className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            name="q" 
            defaultValue={query} 
            placeholder={t("filtr_po_statusu")} 
            className="pl-8"
          />
        </form>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">{t("polzovatel")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("nachato")}</th>
                <th className="px-4 py-3">{t("zaversheno")}</th>
                <th className="px-4 py-3">{t("oshibka")}</th>
              </tr>
            </thead>
            <tbody>
              {requests?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    {t("zaprosy_ne_naydeny")}</td>
                </tr>
              )}
              {requests?.map((req: ReqRow) => (
                <tr key={req.user_id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {req.profiles?.full_name || "Удален/Аноним"}
                    <div className="text-[10px] text-muted-foreground font-mono mt-1">{req.user_id.split('-')[0]}...</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium uppercase ${
                      req.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      req.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {req.started_at ? new Date(req.started_at).toLocaleString('ru-RU') : '-'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {req.completed_at ? new Date(req.completed_at).toLocaleString('ru-RU') : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-500 truncate max-w-[200px]" title={req.error_details}>
                    {req.error_details || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
