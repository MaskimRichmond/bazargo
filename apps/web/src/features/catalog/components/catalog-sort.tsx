"use client"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from "next-intl";

export function CatalogSort({ sort }: { sort: string }) {
    const t = useTranslations();
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSortChange = (val: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    current.set("sort", val)
    current.delete("page")
    router.push(`${pathname}?${current.toString()}`)
  }

  return (
    <div className="hidden md:block">
      <Select value={sort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px] bg-background border rounded-xl">
          <SelectValue placeholder={t("sortirovka")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">{t("snachala_novye")}</SelectItem>
          <SelectItem value="oldest">{t("snachala_starye")}</SelectItem>
          <SelectItem value="cheapest">{t("snachala_deshevle")}</SelectItem>
          <SelectItem value="expensive">{t("snachala_dorozhe")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
