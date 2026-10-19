import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsForm } from "./settings-form"
import { Building2 } from "lucide-react"

export const metadata = {
  title: "Настройки профиля компании | BazaarOS B2B",
  description: "Управление реквизитами бизнеса, адресом доставки и каналами связи в BazaarOS"
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect("/login?next=/settings")

  let profile: any = null
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, city, company_name, business_type, delivery_address, whatsapp, telegram_username")
      .eq("id", session.user.id)
      .maybeSingle()

    if (!error && data) {
      profile = data
    }
  } catch (err) {
    console.warn("Could not query all B2B profile columns, fetching core profile:", err)
  }

  if (!profile) {
    const { data: baseData } = await supabase
      .from("profiles")
      .select("id, full_name, city")
      .eq("id", session.user.id)
      .maybeSingle()
    profile = baseData || { id: session.user.id }
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl space-y-8">
      {/* Page Header */}
      <div className="space-y-2 border-b border-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide">
          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>BazaarOS • Профиль компании</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Настройки профиля бизнеса
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Укажите реквизиты вашей компании, адрес доставки и контакты. Поставщики используют эти данные при расчете сроков и логистики в коммерческих предложениях.
        </p>
      </div>

      {/* Main Settings Form */}
      <SettingsForm profile={profile} userId={session.user.id} />
    </div>
  )
}
