import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { Handshake, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { B2bActions } from "@/features/admin/components/b2b-actions";

type AppRow = { id: string, company_name: string, tax_id: string, status: string, created_at: string, applicant: { full_name: string | null } | null };

export const metadata = {
  title: "B2B Заявки | BazarGo Admin",
}

export default async function AdminB2bRequestsPage(
  props: {
    searchParams?: Promise<{ q?: string }>
  }
) {
    const t = await getTranslations();
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""

  const authRes = await verifyAdminAccess()
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">{t("net_dostupa_k_dannomu_1")}</div>;

  const adminClient = createAdminClient()

  let dbQuery = adminClient
    .from('b2b_applications')
    .select(`
      id,
      company_name,
      tax_id,
      status,
      created_at,
      applicant:profiles!user_id ( id, full_name )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (query) {
    dbQuery = dbQuery.ilike('company_name', `%${query}%`)
  }

  const { data, error } = await dbQuery;
  const apps = data as unknown as AppRow[]

  if (error) {
    return <div className="text-destructive p-4">{t("oshibka_zagruzki_b2b_zayavok")}{error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Handshake className="w-6 h-6 text-teal-500" />
          B2B Заявки
        </h1>
        
        <form className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            name="q" 
            defaultValue={query} 
            placeholder={t("poisk_po_kompanii")} 
            className="pl-8"
          />
        </form>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">{t("kompaniya")}</th>
                <th className="px-4 py-3">{t("inn")}</th>
                <th className="px-4 py-3">{t("zayavitel")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("data")}</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {apps?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {t("zayavki_ne_naydeny")}</td>
                </tr>
              )}
              {apps?.map((app: AppRow) => (
                <tr key={app.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {app.company_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {app.tax_id}
                  </td>
                  <td className="px-4 py-3 truncate max-w-[150px]">
                    {app.applicant?.full_name || "Неизвестен"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium uppercase ${
                      app.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      app.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(app.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <B2bActions appId={app.id} currentStatus={app.status} />
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
