import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SupplierApplicationForm } from "@/features/b2b/components/supplier-application-form"
import { CheckCircle2 } from "lucide-react"

export const metadata = {
  title: "Стать поставщиком | BazarGo B2B",
}

export default async function BecomeSupplierPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?next=/b2b/become-supplier")
  }

  // Check if user already applied
  const { data: existingApp } = await supabase
    .from("b2b_applications")
    .select("status")
    .eq("user_id", session.user.id)
    .single()

  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-3xl">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Стать поставщиком</h1>
        <p className="text-lg text-muted-foreground">Заполните заявку, чтобы получить статус проверенного поставщика на BazarGo B2B.</p>
      </div>

      {existingApp ? (
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Заявка отправлена</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Ваша заявка находится на рассмотрении. Текущий статус: <strong>{existingApp.status}</strong>.
            Мы свяжемся с вами в ближайшее время.
          </p>
        </div>
      ) : (
        <div className="bg-card border rounded-3xl p-6 md:p-10 shadow-sm">
          <Suspense fallback={<div className="h-[400px] animate-pulse bg-muted rounded-xl" />}>
            <SupplierApplicationForm userId={session.user.id} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
