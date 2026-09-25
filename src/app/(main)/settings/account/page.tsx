import { AccountDeletionForm } from "@/features/settings/components/account-deletion-form"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function SettingsAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Аккаунт</h1>
        <p className="text-muted-foreground">Управление вашим аккаунтом и данными.</p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-4">Данные профиля</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Для изменения номера телефона или имени перейдите на страницу редактирования профиля.
          </p>
        </section>

        <section className="pt-8 border-t">
          <h2 className="text-lg font-semibold mb-4 text-destructive">Опасная зона</h2>
          <AccountDeletionForm />
        </section>
      </div>
    </div>
  )
}
