import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"
import { useTranslations } from "next-intl";

export const metadata = {
  title: "Страница не найдена | BazarGo"
}

export default function NotFound() {
    const t = useTranslations();
  return (
    <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center min-h-[70vh]">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
        <ShoppingBag className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{t("stranitsa_ne_naydena")}</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        {t("pohozhe_etoy_stranitsy_ne")}</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild size="lg" className="rounded-xl font-semibold">
          <Link href="/catalog">{t("v_katalog")}</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-xl font-semibold">
          <Link href="/">{t("na_glavnuyu")}</Link>
        </Button>
      </div>
    </div>
  );
}
