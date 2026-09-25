import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { verifyAdminAccess } from "@/features/admin/actions"
import { resolveReportAction } from "@/features/admin/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminReportsPage() {
  const isAuthorized = await verifyAdminAccess()
  if (!isAuthorized) redirect("/")

  const supabase = await createClient()
  
  // Fetch pending reports
  const { data: reports, error } = await supabase
    .from("reports")
    .select(`
      *,
      reporter:reporter_id(full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Очередь жалоб (Reports)</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Причина</TableHead>
                <TableHead>Заявитель</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports?.map((report: any) => (
                <TableRow key={report.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.target_type}</Badge>
                    <div className="text-xs mt-1 text-muted-foreground truncate w-24" title={report.target_id}>{report.target_id}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{report.reason}</span>
                    {report.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{report.description}</p>}
                  </TableCell>
                  <TableCell>
                    {report.reporter?.full_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={report.status === 'OPEN' ? 'destructive' : 'secondary'}>{report.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {report.status === 'OPEN' && (
                      <form action={async () => {
                        "use server"
                        await resolveReportAction(report.id, 'RESOLVED', 'Рассмотрено модератором')
                      }}>
                        <Button size="sm" variant="outline">Отметить решенным</Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!reports?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Жалоб нет.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
