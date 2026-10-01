import { AccountDeletionForm } from "@/features/settings/components/account-deletion-form"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export default async function SettingsAccountPage() {
    const t = await getTranslations();
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("akkaunt")}</h1>
        <p className="text-muted-foreground">{t("upravlenie_vashim_akkauntom_i")}</p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-4">{t("dannye_profilya")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("dlya_izmeneniya_nomera_telefona")}</p>
        </section>

        <section className="pt-8 border-t">
          <h2 className="text-lg font-semibold mb-4 text-destructive">{t("opasnaya_zona")}</h2>
          <AccountDeletionForm />
        </section>
      </div>
    </div>
  );
}
