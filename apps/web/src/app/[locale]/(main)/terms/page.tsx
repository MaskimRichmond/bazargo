import Link from "next/link"
import { useTranslations } from "next-intl";

export const metadata = {
  title: "Пользовательское соглашение | BazarGo"
}

export default function TermsPage() {
    const t = useTranslations();
  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-4xl min-h-[60vh]">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{t("polzovatelskoe_soglashenie")}</h1>
        <p className="text-lg text-muted-foreground">{t("pravila_ispolzovaniya_platformy_bazargo")}</p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold">
        <h2>{t("1_obschie_polozheniya")}</h2>
        <p>
          {t("bazargo_dalee_platforma_yavlyaetsya")}</p>
        <p>
          BazarGo <strong>{t("ne_yavlyaetsya_storonoy_sdelki")}</strong> {t("mezhdu_pokupatelem_i_prodavtsom")}</p>

        <h2>{t("2_prava_i_obyazannosti")}</h2>
        <ul>
          <li><strong>{t("pokupatel_buyer")}</strong> {t("obyazuetsya_soblyudat_pravila_obscheniya")}</li>
          <li><strong>{t("prodavets_seller_i_magazin")}</strong> {t("v_sluchae_osuschestvleniya_sistematicheskoy")}</li>
        </ul>

        <h2>{t("3_polzovatelskiy_kontent_ugc")}</h2>
        <p>
          {t("razmeschaya_informatsiyu_tekst_izobrazheniya")}</p>
        <p>
          <strong>{t("strogo_zaprescheno_1")}</strong> {t("razmeschenie_informatsii_o_zapreschennyh")}</p>
        <p>
          {t("v_sootvetstvii_s_zakonom")}</p>

        <h2>{t("4_blokirovka_blocking_i")}</h2>
        <p>
          {t("kazhdyy_polzovatel_imeet_pravo")}</p>

        <h2>{t("5_intellektualnaya_sobstvennost")}</h2>
        <p>
          {t("vse_prava_na_programmnyy")}</p>

        <h2>{t("6_razreshenie_sporov")}</h2>
        <p>
          {t("platforma_prilagaet_usiliya_dlya")}</p>
      </div>
    </div>
  );
}
