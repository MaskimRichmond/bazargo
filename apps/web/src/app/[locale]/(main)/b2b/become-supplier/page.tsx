import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SupplierApplicationForm } from "@/features/b2b/components/supplier-application-form"
import { Clock, ArrowRight, Building2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Стать поставщиком | BazaarOS B2B",
  description: "Подайте заявку на аккредитацию поставщика или фабрики в BazaarOS: прямое подключение к B2B-заказам бизнеса Кыргызстана."
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
    <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 mb-3">
          <Building2 className="w-3.5 h-3.5" />
          <span>BazaarOS • Аккредитация поставщиков Кыргызстана</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          Аккредитация компании поставщика
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
          Заполните официальные реквизиты компании (ИП, ОсОО или фабрики) для верификации службой безопасности и подключения к закрытой базе оптовых закупок.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {hasPending && (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-3.5">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                    Заявка на модерации
                  </h3>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                    до 24 часов
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-xl">
                  Ваша заявка находится на проверке службы безопасности BazaarOS (до 24 часов). После подтверждения ваш оптовый прайс станет доступен покупателям.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs">
              <Link href="/b2b">
                <span>В личный кабинет</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        )}

        <div className="bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-10 shadow-sm">
          <Suspense fallback={<div className="h-[400px] animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-xl" />}>
            <SupplierApplicationForm userId={session.user.id} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
