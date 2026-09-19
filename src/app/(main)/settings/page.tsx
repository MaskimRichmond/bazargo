import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsForm } from "./settings-form"

export const metadata = {
  title: "Настройки | BazarGo",
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect("/login?next=/settings")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, city")
    .eq("id", session.user.id)
    .single()

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Настройки профиля</h1>
      
      <div className="bg-card border rounded-3xl p-6 md:p-8">
        <SettingsForm profile={profile} userId={session.user.id} />
      </div>
    </div>
  )
}
