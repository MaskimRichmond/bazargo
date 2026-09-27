import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { ScrollText, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

type LogRow = { id: string, action: string, target_type: string, target_id: string, reason: string, created_at: string, actor: { full_name: string | null, role: string | null } | null };

export const metadata = {
  title: "Audit Logs | BazarGo Admin",
}

export default async function AdminAuditLogsPage(
  props: {
    searchParams?: Promise<{ q?: string }>
  }
) {
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""

  const authRes = await verifyAdminAccess()
  if (!authRes.authorized || !['ADMIN', 'SUPER_ADMIN'].includes(authRes.role)) {
    return <div className="text-destructive font-medium p-4">Нет доступа к данному разделу (Только ADMIN/SUPER_ADMIN).</div>
  }

  const adminClient = createAdminClient()

  let dbQuery = adminClient
    .from('audit_logs')
    .select(`
      id,
      action,
      target_type,
      target_id,
      reason,
      created_at,
      actor:profiles!actor_id ( id, full_name, role )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (query) {
    dbQuery = dbQuery.ilike('action', `%${query}%`)
  }

  const { data, error } = await dbQuery;
  const logs = data as unknown as LogRow[]

  if (error) {
    return <div className="text-destructive p-4">Ошибка загрузки Audit Logs: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-slate-500" />
          Журнал Аудита
        </h1>
        
        <form className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            name="q" 
            defaultValue={query} 
            placeholder="Поиск по action..." 
            className="pl-8"
          />
        </form>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3">Исполнитель</th>
                <th className="px-4 py-3">Действие</th>
                <th className="px-4 py-3">Тип цели</th>
                <th className="px-4 py-3">ID Цели</th>
                <th className="px-4 py-3">Причина</th>
              </tr>
            </thead>
            <tbody>
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Записи аудита не найдены
                  </td>
                </tr>
              )}
              {logs?.map((log: LogRow) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{log.actor?.full_name || "Система"}</div>
                    <div className="text-[10px] text-muted-foreground">{log.actor?.role}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.target_type}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] truncate max-w-[100px]" title={log.target_id}>
                    {log.target_id}
                  </td>
                  <td className="px-4 py-3 text-xs truncate max-w-[200px]" title={log.reason}>
                    {log.reason || "-"}
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
