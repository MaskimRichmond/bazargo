import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"
import { useTranslations } from "next-intl";

export const metadata = {
  title: "О нас | BazarGo"
}

export default function Page() {
    const t = useTranslations();
  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-4xl min-h-[60vh]">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{t("o_nas")}</h1>
        <p className="text-lg text-muted-foreground">{t("chto_takoe_bazargo_i")}</p>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold">
        <p>
          {t("eto_zaglushka_dlya_stranitsy")}</p>
        <h3>{t("razdel_1")}</h3>
        <p>
          {t("zdes_budet_podrobnoe_opisanie")}</p>
        <h3>{t("razdel_2")}</h3>
        <p>
          {t("platforma_bazargo_aktivno_razvivaetsya")}</p>
      </div>
    </div>
  );
}
