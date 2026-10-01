"use client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Filter } from "lucide-react"
import { CITIES_BY_REGION } from "@/lib/regions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategoryPicker } from "@/features/catalog/components/category-picker"

import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { useTranslations } from "next-intl";

type Category = { id: string, name: string, slug: string }

function PriceFilter({ 
  searchParams, 
  pathname, 
  router, 
  startTransition 
}: { 
  searchParams: URLSearchParams, 
  pathname: string, 
  router: AppRouterInstance, 
  startTransition: React.TransitionStartFunction 
}) {
    const t = useTranslations();
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "")
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "")

  const urlMin = searchParams.get("minPrice") || ""
  const urlMax = searchParams.get("maxPrice") || ""

  useEffect(() => {
    setMinPrice(urlMin)
    setMaxPrice(urlMax)
  }, [urlMin, urlMax])

  const applyPriceFilter = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    if (minPrice) current.set("minPrice", minPrice)
    else current.delete("minPrice")
    
    if (maxPrice) current.set("maxPrice", maxPrice)
    else current.delete("maxPrice")

    current.delete("page")
    startTransition(() => {
      router.push(`${pathname}?${current.toString()}`)
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    applyPriceFilter()
  }

  const hasChanges = minPrice !== (searchParams.get("minPrice") || "") || maxPrice !== (searchParams.get("maxPrice") || "")

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input 
          type="number" 
          placeholder={t("ot")} 
          className="w-full h-10 px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <span className="text-muted-foreground">-</span>
        <input 
          type="number" 
          placeholder={t("do_1")} 
          className="w-full h-10 px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>
      {hasChanges && (
        <Button size="sm" type="submit" variant="secondary" className="w-full text-xs h-8">
          {t("primenit")}</Button>
      )}
    </form>
  );
}

export function CatalogFiltersWidget({ categories }: { categories: Category[] }) {
    const t = useTranslations();
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  useEffect(() => {
    console.log("[SEARCH PARAMS]", searchParams.toString())
  }, [searchParams])

  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileOpen(false)
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [])

  const updateFilter = (key: string, value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    if (!value || value === "all") {
      current.delete(key)
    } else {
      current.set(key, value)
    }
    if (key !== "page") current.delete("page")
    
    startTransition(() => {
      router.push(`${pathname}?${current.toString()}`)
    })
  }

  const activeCount = Array.from(searchParams.keys()).filter(k => k !== "sort" && k !== "page").length

  const renderFiltersContent = () => {
    const currentParams = new URLSearchParams(Array.from(searchParams.entries()))
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-medium mb-3">{t("kategoriya")}</h3>
          <CategoryPicker 
            categories={categories} 
            value={searchParams.get("category") || ""} 
            onChange={(val) => updateFilter("category", val)} 
          />
        </div>

        <div>
          <h3 className="font-medium mb-3">{t("gorod")}</h3>
          <Select value={searchParams.get("city") || "all"} onValueChange={(val) => updateFilter("city", val)}>
            <SelectTrigger className="w-full bg-background border rounded-md">
              <SelectValue placeholder={t("vse_goroda")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("vse_goroda")}</SelectItem>
              {Object.entries(CITIES_BY_REGION).map(([region, cities]) => (
                <div key={region}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                    {region}
                  </div>
                  {cities.map((city: string) => (
                    <SelectItem key={city} value={city} className="pl-6">{city}</SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <h3 className="font-medium mb-3">{t("tsena")}</h3>
          <PriceFilter 
            searchParams={currentParams} 
            pathname={pathname} 
            router={router} 
            startTransition={startTransition} 
          />
        </div>

        <div>
          <h3 className="font-medium mb-3">{t("sostoyanie")}</h3>
          <Select value={searchParams.get("condition") || "all"} onValueChange={(val) => updateFilter("condition", val)}>
            <SelectTrigger className="w-full bg-background border rounded-md">
              <SelectValue placeholder={t("vse")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("vse_sostoyaniya")}</SelectItem>
              <SelectItem value="NEW">{t("novoe")}</SelectItem>
              <SelectItem value="USED_LIKE_NEW">{t("kak_novoe")}</SelectItem>
              <SelectItem value="USED_GOOD">{t("horoshee")}</SelectItem>
              <SelectItem value="USED_FAIR">{t("normalnoe")}</SelectItem>
              <SelectItem value="FOR_PARTS">{t("na_zapchasti")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-primary"
              checked={searchParams.get("b2b") === "true"}
              onChange={(e) => updateFilter("b2b", e.target.checked ? "true" : "")}
            />
            <span className="font-medium">Только опт (B2B)</span>
          </label>
        </div>

        {(searchParams.get("minPrice") || searchParams.get("maxPrice") || searchParams.get("category") || searchParams.get("city") || searchParams.get("q") || searchParams.get("condition") || searchParams.get("b2b")) && (
          <Button 
            variant="outline" 
            className="w-full text-xs" 
            onClick={() => {
              router.push(pathname)
            }}
          >
            {t("sbrosit_filtry")}</Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block w-64 shrink-0 opacity-100 transition-opacity" style={{ opacity: isPending ? 0.6 : 1 }}>
        <h2 className="font-semibold mb-4 text-lg">{t("filtry")}</h2>
        <div className="p-4 bg-muted/30 rounded-xl">
          {renderFiltersContent()}
        </div>
      </div>

      <div className="md:hidden flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex-1 rounded-xl font-normal" onClick={() => setIsMobileOpen(true)}>
            <Filter className="w-4 h-4 mr-2" />
            {t("filtry")}{activeCount > 0 && `· ${activeCount}`}
          </Button>
          
          <Select value={searchParams.get("sort") || "newest"} onValueChange={(val) => updateFilter("sort", val)}>
            <SelectTrigger className="w-[140px] bg-background border rounded-xl">
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

        {isMobileOpen && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">{t("filtry")}</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderFiltersContent()}
            </div>
            <div className="p-4 border-t">
              <Button className="w-full" onClick={() => setIsMobileOpen(false)}>{t("pokazat_rezultaty")}</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
