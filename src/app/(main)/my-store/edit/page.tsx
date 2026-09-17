import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StoreForm } from "@/features/stores/components/store-form"

export const metadata = {
  title: "Редактировать магазин | BazarGo"
}

export default async function EditStorePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/my-store/edit")
  }

  // Fetch store
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", session.user.id)
    .maybeSingle()

  if (!store) {
    redirect("/stores/create")
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .order("name")

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Настройки магазина</h1>
        <p className="text-muted-foreground mt-2">
          Обновите информацию о вашем бизнесе.
        </p>
      </div>

      <StoreForm categories={categories || []} initialData={store} isEditing />
    </div>
  )
}
