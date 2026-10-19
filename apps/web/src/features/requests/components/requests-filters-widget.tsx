"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Search, Filter, SlidersHorizontal, RotateCcw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BAZAAR_B2B_CATEGORIES } from "@/lib/categories"

const CITIES = [
  "Бишкек",
  "Ош",
  "Джалал-Абад",
  "Каракол",
  "Токмок",
  "Нарын",
  "Талас",
  "Балыкчы",
  "Кант"
]

export function RequestsFiltersWidget({ categories = [] }: { categories?: any[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Search filter
  const [q, setQ] = useState(searchParams.get("q") || "")
  const urlQ = searchParams.get("q") || ""
  useEffect(() => { setQ(urlQ) }, [urlQ])

  // Budget filters
  const [budgetMin, setBudgetMin] = useState(searchParams.get("budgetMin") || "")
  const [budgetMax, setBudgetMax] = useState(searchParams.get("budgetMax") || "")
  useEffect(() => {
    setBudgetMin(searchParams.get("budgetMin") || "")
    setBudgetMax(searchParams.get("budgetMax") || "")
  }, [searchParams])

  // Quantity filter
  const [minQty, setMinQty] = useState(searchParams.get("minQty") || "")
  useEffect(() => { setMinQty(searchParams.get("minQty") || "") }, [searchParams])

  const updateParam = (key: string, value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    if (!value || value === "all") {
      current.delete(key)
    } else {
      current.set(key, value)
    }
    current.delete("page")
    startTransition(() => {
      router.push(`${pathname}?${current.toString()}`)
    })
  }

  const handleApplyNumbers = (e: React.FormEvent) => {
    e.preventDefault()
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    if (q.trim()) current.set("q", q.trim())
    else current.delete("q")

    if (budgetMin.trim()) current.set("budgetMin", budgetMin.trim())
    else current.delete("budgetMin")

    if (budgetMax.trim()) current.set("budgetMax", budgetMax.trim())
    else current.delete("budgetMax")

    if (minQty.trim()) current.set("minQty", minQty.trim())
    else current.delete("minQty")

    current.delete("page")
    startTransition(() => {
      router.push(`${pathname}?${current.toString()}`)
    })
  }

  const handleReset = () => {
    setQ("")
    setBudgetMin("")
    setBudgetMax("")
    setMinQty("")
    startTransition(() => {
      router.push(pathname)
    })
  }

  const activeCategory = searchParams.get("category") || "all"
  const activeCity = searchParams.get("city") || "all"
  const activeStatus = searchParams.get("status") || "OPEN"

  const hasActiveFilters = Boolean(
    searchParams.get("q") ||
    searchParams.get("category") ||
    searchParams.get("budgetMin") ||
    searchParams.get("budgetMax") ||
    searchParams.get("minQty") ||
    (searchParams.get("city") && searchParams.get("city") !== "all") ||
    (searchParams.get("status") && searchParams.get("status") !== "OPEN")
  )

  const content = (
    <div className="space-y-6">
      {/* Search Bar */}
      <div>
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
          Поиск по запросам
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <input
            type="search"
            placeholder="Название, характеристики..."
            className="w-full h-10 pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-[#090A0F] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-sm focus:outline-none focus:border-emerald-500/50"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApplyNumbers(e)
            }}
          />
        </div>
      </div>

      {/* Category Filter (8 B2B Wholesale Categories) */}
      <div>
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
          Категория закупки
        </label>
        <Select value={activeCategory} onValueChange={(val) => updateParam("category", val)}>
          <SelectTrigger className="w-full h-10 rounded-xl bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm">
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200">
            <SelectItem value="all">Все оптовые категории</SelectItem>
            {BAZAAR_B2B_CATEGORIES.map((cat) => (
              <SelectItem key={cat.slug} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Total Budget Filter */}
      <form onSubmit={handleApplyNumbers} className="space-y-2">
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
          Общий бюджет (сом)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="от"
            className="w-full h-10 px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-[#090A0F] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-sm font-mono focus:outline-none focus:border-emerald-500/50"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
          />
          <span className="text-zinc-400 dark:text-zinc-600">—</span>
          <input
            type="number"
            placeholder="до"
            className="w-full h-10 px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-[#090A0F] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-sm font-mono focus:outline-none focus:border-emerald-500/50"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
          />
        </div>

        {/* Min Quantity Filter */}
        <div className="pt-2">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
            Мин. партия (от N шт.)
          </label>
          <input
            type="number"
            placeholder="Например: 500"
            className="w-full h-10 px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-[#090A0F] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-sm font-mono focus:outline-none focus:border-emerald-500/50"
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          size="sm"
          className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 font-bold text-xs mt-3 cursor-pointer"
        >
          Применить фильтры
        </Button>
      </form>

      {/* City Filter */}
      <div>
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
          Город доставки
        </label>
        <Select value={activeCity} onValueChange={(val) => updateParam("city", val)}>
          <SelectTrigger className="w-full h-10 rounded-xl bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm">
            <SelectValue placeholder="Все города" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200">
            <SelectItem value="all">Все города Кыргызстана</SelectItem>
            {CITIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div>
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
          Статус тендера
        </label>
        <Select value={activeStatus} onValueChange={(val) => updateParam("status", val)}>
          <SelectTrigger className="w-full h-10 rounded-xl bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200">
            <SelectItem value="OPEN">Только открытые закупки</SelectItem>
            <SelectItem value="ALL">Все статусы (включая закрытые)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="w-full h-9 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Сбросить все фильтры</span>
        </Button>
      )}
    </div>
  )

  return (
    <div className="w-full">
      {/* Mobile Toggle Button */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          className="w-full rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] text-zinc-800 dark:text-zinc-200 justify-between h-11"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Фильтры оптовых закупок</span>
          </span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          )}
        </Button>

        {isMobileOpen && (
          <div className="mt-3 p-5 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 shadow-xl">
            {content}
          </div>
        )}
      </div>

      {/* Desktop Sidebar (parent has sticky top-24) */}
      <div className="hidden lg:block p-5 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Фильтры RFQ</h2>
          </div>
          {hasActiveFilters && (
            <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
              Активны
            </span>
          )}
        </div>
        {content}
      </div>
    </div>
  )
}
