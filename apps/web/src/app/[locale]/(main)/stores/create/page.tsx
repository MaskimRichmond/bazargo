import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StoreForm } from "@/features/stores/components/store-form"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Создать магазин | BazarGo"
}

export default async function CreateStorePage() {
    const t = await getTranslations();
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
        <h1 className="text-3xl font-bold tracking-tight">{t("sozdat_magazin")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("zapolnite_informatsiyu_o_vashem")}</p>
      </div>

      <StoreForm categories={categories || []} />
    </div>
  );
}
