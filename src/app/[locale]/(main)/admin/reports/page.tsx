import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { AlertTriangle, Filter } from "lucide-react"
import { ReportActions } from "@/features/admin/components/report-actions"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getTranslations } from "next-intl/server";

type ReportRow = { id: string, target_type: string, target_id: string, reason: string, status: string, created_at: string, reporter: { full_name: string | null } | null };

export const metadata = {
  title: "Жалобы и Модерация | BazarGo Admin",
}

export default async function AdminReportsPage(
  props: {
    searchParams?: Promise<{ status?: string, page?: string }>
  }
) {
  const t = await getTranslations();
  const searchParams = await props.searchParams
  const statusFilter = searchParams?.status || "OPEN"
  const currentPage = Math.max(1, parseInt(searchParams?.page || "1", 10))
  const pageSize = 20

  const authRes = await verifyAdminAccess('REPORTS_RESOLVE')
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">{t("net_dostupa_k_dannomu_1")}</div>;

  const adminClient = createAdminClient()

  let dbQuery = adminClient
    .from('reports')
    .select(`
      id,
      target_type,
      target_id,
      reason,
      status,
      created_at,
      reporter:profiles!reporter_id ( id, full_name )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

  if (statusFilter !== 'ALL') {
    dbQuery = dbQuery.eq('status', statusFilter)
  }

  const { data, error, count } = await dbQuery;
  const reports = data as unknown as ReportRow[]
  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  if (error) {
    return <div className="text-destructive p-4">{t("oshibka_zagruzki_zhalob")}{error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          {t("zhaloby")}
        </h1>
        
        <div className="flex flex-wrap gap-2">
          <Button variant={statusFilter === 'OPEN' ? 'default' : 'outline'} size="sm" asChild>
            <Link href="/admin/reports?status=OPEN">Открытые</Link>
          </Button>
          <Button variant={statusFilter === 'IN_REVIEW' ? 'default' : 'outline'} size="sm" asChild>
            <Link href="/admin/reports?status=IN_REVIEW">В работе</Link>
          </Button>
          <Button variant={statusFilter === 'RESOLVED' ? 'default' : 'outline'} size="sm" asChild>
            <Link href="/admin/reports?status=RESOLVED">Решенные</Link>
          </Button>
          <Button variant={statusFilter === 'REJECTED' ? 'default' : 'outline'} size="sm" asChild>
            <Link href="/admin/reports?status=REJECTED">Отклоненные</Link>
          </Button>
          <Button variant={statusFilter === 'ALL' ? 'default' : 'outline'} size="sm" asChild>
            <Link href="/admin/reports?status=ALL">{t("vse")}</Link>
          </Button>
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">{t("id_zhaloby")}</th>
                <th className="px-4 py-3">{t("tip_tseli")}</th>
                <th className="px-4 py-3">{t("prichina")}</th>
                <th className="px-4 py-3">{t("zayavitel")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3 text-right">{t("deystviya")}</th>
              </tr>
            </thead>
            <tbody>
              {reports?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {t("zhaloby_ne_naydeny")}</td>
                </tr>
              )}
              {reports?.map((report: ReportRow) => (
                <tr key={report.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <div className="text-xs font-mono">{report.id.split('-')[0]}...</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(report.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {report.target_type}
                    </span>
                    {report.target_type === 'LISTING' ? (
                      <Link href={`/admin/listings/${report.target_id}`} className="block text-[10px] font-mono text-primary hover:underline mt-1 truncate max-w-[100px]" title={report.target_id}>
                        {report.target_id}
                      </Link>
                    ) : report.target_type === 'USER' ? (
                      <Link href={`/admin/users/${report.target_id}`} className="block text-[10px] font-mono text-primary hover:underline mt-1 truncate max-w-[100px]" title={report.target_id}>
                        {report.target_id}
                      </Link>
                    ) : (
                      <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate max-w-[100px]" title={report.target_id}>
                        {report.target_id}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm line-clamp-2 max-w-[250px]" title={report.reason}>
                      {report.reason}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {report.reporter?.full_name || "Неизвестен"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                      report.status === 'RESOLVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      report.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      report.status === 'IN_REVIEW' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReportActions report={report} />
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
            <Link href={`?status=${statusFilter}&page=${currentPage - 1}`}>
              <Button variant="outline" size="sm">{t("nazad") || "Назад"}</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {t("stranitsa")} {currentPage} {t("iz")} {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={`?status=${statusFilter}&page=${currentPage + 1}`}>
              <Button variant="outline" size="sm">{t("vpered") || "Вперед"}</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
