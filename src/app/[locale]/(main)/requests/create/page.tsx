import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RequestForm } from "@/features/requests/components/request-form"
import { PackageSearch } from "lucide-react"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Создать запрос | BazarGo"
}

export default async function CreateRequestPage() {
    const t = await getTranslations();
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/requests/create")
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .order("name")

  return (
    <div className="container max-w-2xl mx-auto py-8 md:py-12 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <PackageSearch className="w-5 h-5" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("sozdat_zapros")}</h1>
        </div>
        <p className="text-muted-foreground">
          {t("opishite_tovar_kotoryy_vy")}</p>
      </div>

      <div className="bg-background rounded-3xl border p-4 md:p-8 shadow-sm">
        <RequestForm categories={categories || []} />
      </div>
    </div>
  );
}
