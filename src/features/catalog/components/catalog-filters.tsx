"use client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Filter, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategoryPicker } from "@/features/catalog/components/category-picker"

import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

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

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyPriceFilter()
    }
  }

  const hasChanges = minPrice !== (searchParams.get("minPrice") || "") || maxPrice !== (searchParams.get("maxPrice") || "")

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input 
          type="number" 
          placeholder="От" 
          className="w-full h-10 px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          onKeyDown={handlePriceKeyDown}
        />
        <span className="text-muted-foreground">-</span>
        <input 
          type="number" 
          placeholder="До" 
          className="w-full h-10 px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          onKeyDown={handlePriceKeyDown}
        />
      </div>
      {hasChanges && (
        <Button size="sm" variant="secondary" onClick={applyPriceFilter} className="w-full text-xs h-8">
          Применить
        </Button>
      )}
    </div>
  )
}

export function CatalogFilters({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [isMobileOpen, setIsMobileOpen] = useState(false)

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
          <h3 className="font-medium mb-3">Категория</h3>
          <CategoryPicker 
            categories={categories} 
            value={searchParams.get("category") || ""} 
            onChange={(val) => updateFilter("category", val)} 
          />
        </div>
        
        <div>
          <h3 className="font-medium mb-3">Город</h3>
          <Select value={searchParams.get("city") || "all"} onValueChange={(val) => updateFilter("city", val)}>
            <SelectTrigger className="w-full bg-background border rounded-md">
              <SelectValue placeholder="Все города" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все города</SelectItem>
              <SelectItem value="Бишкек">Бишкек</SelectItem>
              <SelectItem value="Ош">Ош</SelectItem>
              <SelectItem value="Каракол">Каракол</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h3 className="font-medium mb-3">Цена</h3>
          <PriceFilter 
            searchParams={currentParams} 
            pathname={pathname} 
            router={router} 
            startTransition={startTransition} 
          />
        </div>

        <div>
          <h3 className="font-medium mb-3">Состояние</h3>
          <Select value={searchParams.get("condition") || "all"} onValueChange={(val) => updateFilter("condition", val)}>
            <SelectTrigger className="w-full bg-background border rounded-md">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все состояния</SelectItem>
              <SelectItem value="NEW">Новое</SelectItem>
              <SelectItem value="USED_LIKE_NEW">Как новое</SelectItem>
              <SelectItem value="USED_GOOD">Хорошее</SelectItem>
              <SelectItem value="USED_FAIR">Нормальное</SelectItem>
              <SelectItem value="FOR_PARTS">На запчасти</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {(searchParams.get("minPrice") || searchParams.get("maxPrice") || searchParams.get("category") || searchParams.get("city") || searchParams.get("condition")) && (
          <Button 
            variant="outline" 
            className="w-full text-xs" 
            onClick={() => {
              router.push(pathname)
            }}
          >
            Сбросить фильтры
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="hidden md:block w-64 shrink-0 opacity-100 transition-opacity" style={{ opacity: isPending ? 0.6 : 1 }}>
        <h2 className="font-semibold mb-4 text-lg">Фильтры</h2>
        <div className="p-4 bg-muted/30 rounded-xl">
          {renderFiltersContent()}
        </div>
      </div>

      <div className="md:hidden flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex-1 rounded-xl font-normal" onClick={() => setIsMobileOpen(true)}>
            <Filter className="w-4 h-4 mr-2" />
            Фильтры {activeCount > 0 && `· ${activeCount}`}
          </Button>
          
          <Select value={searchParams.get("sort") || "newest"} onValueChange={(val) => updateFilter("sort", val)}>
            <SelectTrigger className="w-[140px] bg-background border rounded-xl">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Сначала новые</SelectItem>
              <SelectItem value="oldest">Сначала старые</SelectItem>
              <SelectItem value="cheapest">Сначала дешевле</SelectItem>
              <SelectItem value="expensive">Сначала дороже</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isMobileOpen && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">Фильтры</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderFiltersContent()}
            </div>
            <div className="p-4 border-t">
              <Button className="w-full" onClick={() => setIsMobileOpen(false)}>Показать результаты</Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
