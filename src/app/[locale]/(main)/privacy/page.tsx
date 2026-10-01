import Link from "next/link"
import { useTranslations } from "next-intl";

export const metadata = {
  title: "Политика конфиденциальности | BazarGo"
}

export default function PrivacyPage() {
    const t = useTranslations();
  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-4xl min-h-[60vh]">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{t("politika_konfidentsialnosti")}</h1>
        <p className="text-lg text-muted-foreground">{t("redaktsiya_ot_25_sentyabrya")}</p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold">
        <p>
          {t("nastoyaschaya_politika_konfidentsialnosti_opisyvaet")}<strong>{t("tsifrovym_kodeksom_kyrgyzskoy_respubliki")}</strong> {t("ot_31_iyulya_2025")}</p>

        <h2>{t("1_sbor_i_ispolzovanie")}</h2>
        <p>{t("dlya_predostavleniya_uslug_marketpleysa")}</p>
        <ul>
          <li><strong>{t("registratsionnye_dannye")}</strong> {t("nomer_telefona_email_imya")}</li>
          <li><strong>{t("dannye_prodavtsov_ip_osoo")}</strong> {t("v_sootvetstvii_so_st")}</li>
          <li><strong>{t("polzovatelskiy_kontent_ugc")}</strong> {t("tekst_obyavleniy_fotografii_soobscheniya")}</li>
          <li><strong>{t("tehnicheskie_dannye")}</strong> {t("logi_deystviy_ip_adresa")}</li>
        </ul>

        <h2>{t("2_transgranichnaya_peredacha_i")}</h2>
        <p>
          {t("bazargo_ispolzuet_zaschischennuyu_oblachnuyu")}</p>
        <ul>
          <li><strong>Supabase:</strong> {t("provayder_bazy_dannyh_i")}</li>
          <li><strong>Vercel:</strong> {t("provayder_hostinga_prilozheniya_obrabatyvaet")}</li>
          <li><strong>Resend:</strong> {t("provayder_email_uvedomleniy")}</li>
        </ul>

        <h2>{t("3_sroki_hraneniya_i")}</h2>
        <p>
          {t("v_sootvetstvii_so_statyami")}</p>
        <p>
          {t("polzovatel_imeet_pravo_otozvat")}<Link href="/account-deletion">{t("udalenie_akkaunta")}</Link>.
        </p>
        <p>
          <strong>{t("obratite_vnimanie")}</strong> {t("pri_udalenii_akkaunta_my")}<em>{t("obezlichivaniya")}</em> {t("depersonalizatsii_svyaz_dannyh_s")}</p>

        <h2>{t("4_zaschita_dannyh")}</h2>
        <p>
          {t("operator_vnedril_strogie_tehnicheskie")}<code>audit_log</code>.
        </p>

        <h2>{t("5_kontakty")}</h2>
        <p>
          {t("po_voprosam_zaschity_personalnyh")}<strong>privacy@bazargo.kg</strong>.
        </p>
      </div>
    </div>
  );
}
