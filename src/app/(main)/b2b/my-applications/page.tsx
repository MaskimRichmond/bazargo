import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Building2, Calendar, MapPin, ListPlus, FileText } from "lucide-react"

export const metadata = {
  title: "Мои заявки поставщика | BazarGo B2B",
}

const STATUS_MAP: Record<string, { label: string, bg: string, text: string }> = {
  PENDING: { label: "На рассмотрении", bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-500" },
  APPROVED: { label: "Одобрена", bg: "bg-green-500/10", text: "text-green-600 dark:text-green-500" },
  REJECTED: { label: "Отклонена", bg: "bg-red-500/10", text: "text-red-600 dark:text-red-500" }
}

export default async function MyApplicationsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?next=/b2b/my-applications")
  }

  const { data: applications, error } = await supabase
    .from("b2b_applications")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Мои заявки поставщика</h1>
          <p className="text-muted-foreground">История ваших заявок на получение статуса проверенного поставщика.</p>
        </div>
        <Button asChild className="rounded-xl shrink-0">
          <Link href="/b2b/become-supplier">Подать новую заявку</Link>
        </Button>
      </div>

      {!applications || applications.length === 0 ? (
        <div className="bg-muted/20 border border-dashed rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">У вас еще нет заявок</h2>
          <p className="text-muted-foreground mb-6">Вы можете подать заявку, чтобы стать проверенным поставщиком.</p>
          <Button asChild>
            <Link href="/b2b/become-supplier">Подать заявку</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app: any) => {
            const statusInfo = STATUS_MAP[app.status] || { label: app.status, bg: "bg-muted", text: "text-muted-foreground" }
            
            return (
              <div key={app.id} className="bg-background border rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      {app.company_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {app.city}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(app.created_at).toLocaleDateString("ru-RU")}</span>
                      <span className="flex items-center gap-1"><ListPlus className="w-4 h-4" /> {app.categories.join(", ")}</span>
                    </div>
                  </div>
                  <div className={`shrink-0 px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                    {statusInfo.label}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Контактное лицо:</span>
                    <span className="font-medium">{app.contact_name} ({app.contact_phone})</span>
                  </div>
                  {app.admin_comment && (
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <span className="text-muted-foreground block mb-1 text-xs">Комментарий модератора:</span>
                      <span className="font-medium text-foreground">{app.admin_comment}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
