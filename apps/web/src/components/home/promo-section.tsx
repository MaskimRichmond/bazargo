import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useTranslations } from "next-intl";

export function PromoSection() {
    const t = useTranslations();
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8">{t("skidki_i_aktsii")}</h2>
        
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <Card className="bg-gradient-to-r from-blue-900 to-slate-800 text-white overflow-hidden border-0">
            <CardContent className="p-8 flex flex-col justify-center h-full relative z-10">
              <div className="absolute top-0 right-0 h-full w-1/2 opacity-20 bg-[url('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60')] bg-cover bg-center" />
              <div className="bg-blue-500 text-xs font-bold px-2 py-1 rounded w-fit mb-4">{t("vygodno")}</div>
              <h3 className="text-2xl font-bold mb-2">{t("tehnika_so_skidkami")}</h3>
              <p className="text-slate-300 mb-6 max-w-xs">{t("luchshie_predlozheniya_ot_proverennyh")}</p>
              <Button asChild variant="secondary" className="w-fit">
                <Link href="/catalog">{t("smotret_aktsii")}</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-emerald-900 to-green-800 text-white overflow-hidden border-0">
            <CardContent className="p-8 flex flex-col justify-center h-full relative z-10">
              <div className="absolute top-0 right-0 h-full w-1/2 opacity-20 bg-[url('https://images.unsplash.com/photo-1555529771-835f59fc5efe?w=800&auto=format&fit=crop&q=60')] bg-cover bg-center" />
              <div className="bg-emerald-500 text-xs font-bold px-2 py-1 rounded w-fit mb-4">B2B</div>
              <h3 className="text-2xl font-bold mb-2">{t("stan_postavschikom")}</h3>
              <p className="text-emerald-100 mb-6 max-w-xs">{t("razvivay_svoy_biznes_vmeste")}</p>
              <Button asChild variant="secondary" className="w-fit">
                <Link href="/b2b/become-supplier">{t("uznat_bolshe")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
