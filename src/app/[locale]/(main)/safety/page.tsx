import Link from "next/link"
import { ShieldCheck, Flag, AlertTriangle, MessageSquareOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl";

export const metadata = {
  title: "Безопасность и правила | BazarGo",
  description: "Правила сообщества BazarGo и руководство по безопасности"
}

export default function SafetyPage() {
    const t = useTranslations();
  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-4xl min-h-[60vh]">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{t("bezopasnost_i_pravila")}</h1>
        <p className="text-lg text-muted-foreground">{t("rukovodstvo_soobschestva_bazargo_dlya")}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        <div className="bg-green-500/5 border border-green-500/20 p-6 rounded-2xl">
          <ShieldCheck className="w-8 h-8 text-green-500 mb-4" />
          <h3 className="text-lg font-bold mb-2">{t("chto_my_privetstvuem")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-4">
            <li>{t("chestnoe_i_tochnoe_opisanie")}</li>
            <li>{t("realnye_chetkie_fotografii")}</li>
            <li>{t("vezhlivoe_obschenie_v_chatah")}</li>
            <li>{t("soblyudenie_zakonov_kyrgyzskoy_respubliki")}</li>
          </ul>
        </div>
        <div className="bg-destructive/5 border border-destructive/20 p-6 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-destructive mb-4" />
          <h3 className="text-lg font-bold mb-2">{t("strogo_zaprescheno")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-4">
            <li>{t("prodazha_zapreschennyh_tovarov_oruzhie")}</li>
            <li>{t("oskorbleniya_ugrozy_i_razzhiganie")}</li>
            <li>{t("spam_i_publikatsiya_lozhnoy")}</li>
            <li>{t("popytki_moshennichestva_i_fishinga")}</li>
          </ul>
        </div>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed">
        <h2>{t("instrumenty_zaschity_polzovateley")}</h2>
        
        <div className="flex flex-col md:flex-row gap-6 my-8 items-start">
          <div className="flex-shrink-0 p-4 bg-muted rounded-xl">
            <Flag className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold mt-0 mb-2">{t("zhaloby_reports")}</h3>
            <p className="m-0">
              {t("esli_vy_zametili_podozritelnoe")}<strong>{t("pozhalovatsya_1")}</strong>{t("nashi_moderatory_proveryayut_vse")}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 my-8 items-start">
          <div className="flex-shrink-0 p-4 bg-muted rounded-xl">
            <MessageSquareOff className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold mt-0 mb-2">{t("blokirovka_polzovateley")}</h3>
            <p className="m-0">
              {t("esli_drugoy_polzovatel_vedet")}<strong>{t("zablokirovat")}</strong> {t("ego_pryamo_iz_chata")}</p>
          </div>
        </div>

        <h2>{t("moderatsiya_i_udalenie_kontenta")}</h2>
        <p>
          {t("bazargo_ostavlyaet_za_soboy")}</p>
        <p>
          {t("dlya_polucheniya_yuridicheskoy_informatsii")}<Link href="/terms" className="text-primary hover:underline">{t("usloviyami_ispolzovaniya")}</Link>.
        </p>

        <div className="mt-12 not-prose">
          <Link href="/">
            <Button variant="outline">{t("vernutsya_na_glavnuyu")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
