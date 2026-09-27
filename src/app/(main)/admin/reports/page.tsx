import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { AlertTriangle, Filter } from "lucide-react"
import { ReportActions } from "@/features/admin/components/report-actions"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Жалобы и Модерация | BazarGo Admin",
}

export default async function AdminReportsPage(
  props: {
    searchParams?: Promise<{ status?: string }>
  }
) {
  const searchParams = await props.searchParams
  const statusFilter = searchParams?.status || "PENDING"

  const authRes = await verifyAdminAccess('REPORTS_RESOLVE')
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">Нет доступа к данному разделу.</div>

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
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (statusFilter !== 'ALL') {
    dbQuery = dbQuery.eq('status', statusFilter)
  }

  const { data: reports, error } = await dbQuery

  if (error) {
    return <div className="text-destructive p-4">Ошибка загрузки жалоб: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          Жалобы
        </h1>
        
        <div className="flex gap-2">
          <Button variant={statusFilter === 'PENDING' ? 'default' : 'outline'} size="sm" asChild>
            <Link href="/admin/reports?status=PENDING">Ожидают</Link>
          </Button>
          <Button variant={statusFilter === 'ALL' ? 'default' : 'outline'} size="sm" asChild>
            <Link href="/admin/reports?status=ALL">Все</Link>
          </Button>
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">ID Жалобы</th>
                <th className="px-4 py-3">Тип цели</th>
                <th className="px-4 py-3">Причина</th>
                <th className="px-4 py-3">Заявитель</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {reports?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Жалобы не найдены
                  </td>
                </tr>
              )}
              {reports?.map((report: Record<string, any>) => (
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
                    <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate max-w-[100px]" title={report.target_id}>
                      {report.target_id}
                    </div>
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
    </div>
  )
}
