import Link from "next/link"
import { ShieldCheck, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Удаление аккаунта | BazarGo",
  description: "Запрос на удаление аккаунта и обезличивание данных BazarGo"
}

export default async function PublicAccountDeletionPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
    const t = await getTranslations();
  const resolvedParams = await searchParams
  const isSuccess = resolvedParams.success === 'true'

  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-3xl min-h-[60vh]">
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{t("udalenie_akkaunta_i_dannyh")}</h1>
        <p className="text-lg text-muted-foreground">{t("informatsiya_ob_upravlenii_vashimi")}</p>
      </div>

      {isSuccess ? (
        <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 p-8 rounded-2xl text-center space-y-4">
          <ShieldCheck className="w-12 h-12 mx-auto text-green-500" />
          <h2 className="text-2xl font-bold">{t("akkaunt_uspeshno_udalen")}</h2>
          <p>{t("vashi_personalnye_dannye_byli_obezlicheny_a")}</p>
          <div className="pt-4">
            <Link href="/">
              <Button variant="outline">{t("na_glavnuyu")}</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed">
            <p>
              {t("v_sootvetstvii_s_tsifrovym")}</p>

            <h3>{t("kak_udalit_akkaunt_v")}</h3>
            <ol>
              <li>{t("otkroyte_prilozhenie_ili_sayt")}</li>
              <li>{t("pereydite_v_razdel")}<strong>{t("nastroyki")}</strong>.</li>
              <li>{t("vyberite_punkt")}<strong>{t("akkaunt")}</strong>.</li>
              <li>{t("nazhmite")}<strong>{t("navsegda_udalit_akkaunt")}</strong> {t("v_samom_nizu_stranitsy")}</li>
            </ol>
            
            <div className="not-prose my-6">
              <Link href="/settings/account">
                <Button>{t("pereyti_v_nastroyki_akkaunta")}</Button>
              </Link>
            </div>

            <h3>{t("chto_proishodit_pri_udalenii")}</h3>
            <ul>
              <li><strong>{t("obezlichivanie")}</strong> {t("vashi_fio_nomer_telefona")}</li>
              <li><strong>{t("obyavleniya")}</strong> {t("vse_vashi_aktivnye_obyavleniya")}</li>
              <li><strong>{t("chaty")}</strong> {t("vashe_imya_v_suschestvuyuschih")}</li>
              <li><strong>{t("hranenie")}</strong> {t("my_mozhem_sohranit_nekotorye")}</li>
            </ul>

            <div className="bg-muted p-4 rounded-xl flex items-start gap-3 mt-8">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm m-0 text-muted-foreground">
                {t("esli_vy_poteryali_dostup")}<strong>privacy@bazargo.kg</strong> {t("s_pochty_na_kotoruyu")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
