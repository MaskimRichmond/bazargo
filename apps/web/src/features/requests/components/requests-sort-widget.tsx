"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from "next-intl";

export function RequestsSortWidget({ sort }: { sort: string }) {
    const t = useTranslations();
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleSortChange = (val: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    if (val && val !== "newest") {
      current.set("sort", val)
    } else {
      current.delete("sort")
    }
    current.delete("page")
    
    startTransition(() => {
      router.push(`${pathname}?${current.toString()}`)
    })
  }

  return (
    <div className="hidden md:flex items-center gap-2 shrink-0">
      <span className="text-sm text-muted-foreground">{t("sortirovka_1")}</span>
      <Select value={sort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px] h-9 bg-muted/30 border-none font-medium">
          <SelectValue placeholder={t("snachala_novye")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">{t("snachala_novye")}</SelectItem>
          <SelectItem value="oldest">{t("snachala_starye")}</SelectItem>
          <SelectItem value="budget_desc">{t("byudzhet_vyshe")}</SelectItem>
          <SelectItem value="budget_asc">{t("byudzhet_nizhe")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
