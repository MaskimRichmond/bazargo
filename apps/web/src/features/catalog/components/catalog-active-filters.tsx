"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { X } from "lucide-react"
import { useTranslations } from "next-intl";

export function CatalogActiveFilters({ categories }: { categories: any[] }) {
    const t = useTranslations();
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const removeFilter = (key: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    current.delete(key)
    current.delete("page")
    router.push(`${pathname}?${current.toString()}`)
  }

  const clearAll = () => {
    router.push(pathname)
  }

  const chips: { key: string, label: string }[] = []

  if (searchParams.get("q")) {
    chips.push({ key: "q", label: `Поиск: ${searchParams.get("q")}` })
  }
  
  if (searchParams.get("category")) {
    const cat = categories.find(c => c.slug === searchParams.get("category"))
    chips.push({ key: "category", label: cat ? cat.name : "Категория" })
  }

  if (searchParams.get("city") && searchParams.get("city") !== "all") {
    chips.push({ key: "city", label: searchParams.get("city") as string })
  }

  if (searchParams.get("condition") && searchParams.get("condition") !== "all") {
    const conditionMap: Record<string, string> = {
      "NEW": "Новое",
      "USED_LIKE_NEW": "Как новое",
      "USED_GOOD": "Хорошее",
      "USED_FAIR": "Нормальное",
      "FOR_PARTS": "На запчасти"
    }
    chips.push({ key: "condition", label: conditionMap[searchParams.get("condition") as string] || "Состояние" })
  }

  const minP = searchParams.get("minPrice")
  const maxP = searchParams.get("maxPrice")
  if (minP || maxP) {
    if (minP && maxP) chips.push({ key: "price_both", label: `${minP} - ${maxP} сом` })
    else if (minP) chips.push({ key: "minPrice", label: `От ${minP} сом` })
    else if (maxP) chips.push({ key: "maxPrice", label: `До ${maxP} сом` })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar mb-4 mt-2">
      {chips.map(chip => (
        <button
          key={chip.key}
          onClick={() => {
            if (chip.key === "price_both") {
              const current = new URLSearchParams(Array.from(searchParams.entries()))
              current.delete("minPrice")
              current.delete("maxPrice")
              current.delete("page")
              router.push(`${pathname}?${current.toString()}`)
            } else {
              removeFilter(chip.key)
            }
          }}
          className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-muted text-foreground hover:bg-muted/80 rounded-full text-sm font-medium transition-colors shrink-0"
        >
          {chip.label}
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          onClick={clearAll}
          className="whitespace-nowrap px-3 py-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors shrink-0 underline underline-offset-2"
        >
          {t("sbrosit_vsyo")}</button>
      )}
    </div>
  );
}
