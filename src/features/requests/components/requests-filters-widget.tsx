"use client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition, useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Search, Filter, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategoryPicker } from "@/features/catalog/components/category-picker"

import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

type Category = { id: string, name: string, slug: string, parent_id?: string | null }

function SearchFilter({ searchParams, pathname, router, startTransition }: { searchParams: URLSearchParams, pathname: string, router: AppRouterInstance, startTransition: React.TransitionStartFunction }) {
  const [q, setQ] = useState(searchParams.get("q") || "")
  const urlQ = searchParams.get("q") || ""

  useEffect(() => {
    setQ(urlQ)
  }, [urlQ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    if (q) current.set("q", q)
    else current.delete("q")
    
    current.delete("page")
    startTransition(() => {
      router.push(`${pathname}?${current.toString()}`)
    })
  }

  const hasChanges = q !== urlQ

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input 
          type="search" 
          placeholder="Что ищут?" 
          className="w-full h-10 pl-9 pr-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {hasChanges && (
        <Button size="sm" type="submit" variant="secondary" className="w-full text-xs h-8">
          Найти
        </Button>
      )}
    </form>
  )
}

function BudgetFilter({ searchParams, pathname, router, startTransition }: { searchParams: URLSearchParams, pathname: string, router: AppRouterInstance, startTransition: React.TransitionStartFunction }) {
  const urlMin = searchParams.get("budgetMin") || ""
  const urlMax = searchParams.get("budgetMax") || ""
  
  const [minPrice, setMinPrice] = useState(urlMin)
  const [maxPrice, setMaxPrice] = useState(urlMax)

  useEffect(() => {
    setMinPrice(urlMin)
    setMaxPrice(urlMax)
  }, [urlMin, urlMax])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    if (minPrice) current.set("budgetMin", minPrice)
    else current.delete("budgetMin")
    
    if (maxPrice) current.set("budgetMax", maxPrice)
    else current.delete("budgetMax")

    current.delete("page")
    startTransition(() => {
      router.push(`${pathname}?${current.toString()}`)
    })
  }

  const hasChanges = minPrice !== urlMin || maxPrice !== urlMax

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input 
          type="number" 
          placeholder="От" 
          className="w-full h-10 px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <span className="text-muted-foreground">-</span>
        <input 
          type="number" 
          placeholder="До" 
          className="w-full h-10 px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>
      {hasChanges && (
        <Button size="sm" type="submit" variant="secondary" className="w-full text-xs h-8">
          Применить
        </Button>
      )}
    </form>
  )
}

export function RequestsFiltersWidget({ categories }: { categories: Category[] }) {
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

  const renderFiltersContent = () => {
    const currentParams = new URLSearchParams(Array.from(searchParams.entries()))
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-medium mb-3">Поиск</h3>
          <SearchFilter 
            searchParams={currentParams} 
            pathname={pathname} 
            router={router} 
            startTransition={startTransition} 
          />
        </div>

        <div>
          <h3 className="font-medium mb-3">Категория</h3>
          <CategoryPicker 
            categories={categories} 
            value={searchParams.get("category") || ""} 
            onChange={(val) => updateFilter("category", val)} 
          />
        </div>

        <div>
          <h3 className="font-medium mb-3">Бюджет</h3>
          <BudgetFilter 
            searchParams={currentParams} 
            pathname={pathname} 
            router={router} 
            startTransition={startTransition} 
          />
        </div>

        <div>
          <h3 className="font-medium mb-3">Регион</h3>
          <Select value={searchParams.get("region") || "all"} onValueChange={(val) => updateFilter("region", val)}>
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="Все регионы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все регионы</SelectItem>
              <SelectItem value="Бишкек">Бишкек</SelectItem>
              <SelectItem value="Ош">Ош</SelectItem>
              <SelectItem value="Баткенская область">Баткенская область</SelectItem>
              <SelectItem value="Джалал-Абадская область">Джалал-Абадская область</SelectItem>
              <SelectItem value="Иссык-Кульская область">Иссык-Кульская область</SelectItem>
              <SelectItem value="Нарынская область">Нарынская область</SelectItem>
              <SelectItem value="Ошская область">Ошская область</SelectItem>
              <SelectItem value="Таласская область">Таласская область</SelectItem>
              <SelectItem value="Чуйская область">Чуйская область</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <h3 className="font-medium mb-3">Статус</h3>
          <Select value={searchParams.get("status") || "OPEN"} onValueChange={(val) => updateFilter("status", val)}>
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="Открытые" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Только открытые</SelectItem>
              <SelectItem value="ALL">Все статусы</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(searchParams.get("budgetMin") || searchParams.get("budgetMax") || searchParams.get("category") || searchParams.get("region") || searchParams.get("q") || (searchParams.get("status") && searchParams.get("status") !== "OPEN")) && (
          <Button 
            variant="outline" 
            className="w-full text-xs" 
            type="button"
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

  let activeCount = 0
  if (searchParams.get("budgetMin")) activeCount++
  if (searchParams.get("budgetMax")) activeCount++
  if (searchParams.get("category")) activeCount++
  if (searchParams.get("region")) activeCount++
  if (searchParams.get("q")) activeCount++
  if (searchParams.get("status") && searchParams.get("status") !== "OPEN") activeCount++

  return (
    <>
      <div className="hidden md:block w-64 shrink-0 opacity-100 transition-opacity" style={{ opacity: isPending ? 0.6 : 1 }}>
        <h2 className="font-semibold mb-4 text-lg">Фильтры</h2>
        <div className="p-4 bg-muted/30 rounded-xl">
          {renderFiltersContent()}
        </div>
      </div>

      <div className="md:hidden flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <Button variant="outline" type="button" className="flex-1 rounded-xl font-normal" onClick={() => setIsMobileOpen(true)}>
            <Filter className="w-4 h-4 mr-2" />
            Фильтры {activeCount > 0 && `· ${activeCount}`}
          </Button>
          
          <Select value={searchParams.get("sort") || "newest"} onValueChange={(val) => updateFilter("sort", val)}>
            <SelectTrigger className="w-40 rounded-xl bg-muted/30 border-none font-normal">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Новые</SelectItem>
              <SelectItem value="oldest">Старые</SelectItem>
              <SelectItem value="budget_desc">Бюджет: выше</SelectItem>
              <SelectItem value="budget_asc">Бюджет: ниже</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <h2 className="font-semibold text-lg">Фильтры</h2>
            <button 
              type="button"
              className="p-2 -mr-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {renderFiltersContent()}
          </div>
          <div className="p-4 border-t shrink-0 bg-background">
            <Button type="button" className="w-full rounded-xl" onClick={() => setIsMobileOpen(false)}>
              Показать результаты
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
