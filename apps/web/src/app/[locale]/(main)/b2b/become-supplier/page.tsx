import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SupplierApplicationForm } from "@/features/b2b/components/supplier-application-form"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Стать поставщиком | BazarGo B2B",
}

export default async function BecomeSupplierPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?next=/b2b/become-supplier")
  }

  // Check if user has a pending application
  const { data: existingApps } = await supabase
    .from("b2b_applications")
    .select("status")
    .eq("user_id", session.user.id)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(1)

  const hasPending = existingApps && existingApps.length > 0

  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-3xl">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Стать поставщиком</h1>
        <p className="text-lg text-muted-foreground">Заполните заявку, чтобы получить статус проверенного поставщика на BazarGo B2B.</p>
      </div>

      <div className="flex flex-col gap-8">
        {hasPending && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Заявка на рассмотрении</h3>
                <p className="text-sm text-muted-foreground">У вас уже есть отправленная заявка, ожидающая ответа модератора.</p>
              </div>
            </div>
            <Button asChild variant="outline" className="shrink-0 w-full md:w-auto">
              <Link href="/b2b/my-applications">Мои заявки</Link>
            </Button>
          </div>
        )}

        <div className="bg-card border rounded-3xl p-6 md:p-10 shadow-sm">
          {!hasPending && (
            <div className="flex justify-end mb-6">
              <Button asChild variant="ghost" className="text-primary hover:text-primary">
                <Link href="/b2b/my-applications">Перейти к моим заявкам &rarr;</Link>
              </Button>
            </div>
          )}
          <Suspense fallback={<div className="h-[400px] animate-pulse bg-muted rounded-xl" />}>
            <SupplierApplicationForm userId={session.user.id} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
