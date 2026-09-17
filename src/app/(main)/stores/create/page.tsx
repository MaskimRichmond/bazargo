import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StoreForm } from "@/features/stores/components/store-form"

export const metadata = {
  title: "Создать магазин | BazarGo"
}

export default async function CreateStorePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/stores/create")
  }

  // Check if user already has a store
  const { data: existing } = await supabase
    .from("stores")
    .select("slug")
    .eq("owner_id", session.user.id)
    .maybeSingle()

  if (existing) {
    redirect("/my-store")
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .order("name")

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Создать магазин</h1>
        <p className="text-muted-foreground mt-2">
          Заполните информацию о вашем бизнесе, чтобы начать продавать профессионально.
        </p>
      </div>

      <StoreForm categories={categories || []} />
    </div>
  )
}
