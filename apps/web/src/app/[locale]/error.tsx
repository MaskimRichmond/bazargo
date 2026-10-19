"use client"

import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { useEffect } from "react"
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
    const t = useTranslations();
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center min-h-[70vh]">
      <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-4">{t("ne_udalos_zagruzit_dannye")}</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        {t("proizoshla_nepredvidennaya_tehnicheskaya_oshibka")}</p>
      <Button onClick={reset} size="lg" className="rounded-xl font-semibold">
        {t("poprobuyte_eschyo_raz")}</Button>
    </div>
  );
}
