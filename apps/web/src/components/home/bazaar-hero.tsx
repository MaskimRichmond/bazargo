"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { parseRfqFallback } from "@/lib/rfq-parser"
import { BAZAAR_B2B_CATEGORIES } from "@/lib/categories"
import { 
  Sparkles, 
  ArrowRight, 
  Terminal,
  Zap,
  Calculator,
  Coffee,
  Hotel,
  UtensilsCrossed,
  MapPin,
  Clock,
  ShieldCheck,
  X
} from "lucide-react"

interface PresetScenario {
  title: string
  prompt: string
  icon: React.ComponentType<{ className?: string }>
  categoryTag: string
  specs: string
  qty: number
  unit: string
  unitPrice: number
  totalBudget: number
  city: string
  days: number
}

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    title: "Кофейня: стаканы + крышки",
    icon: Coffee,
    prompt: "2000 двухслойных крафт-стаканов 350 мл с крышками до 4.80 сом в Бишкеке за 4 дня",
    categoryTag: "cups",
    specs: "350 мл, двухслойный крафт 280 г/м² + крышки 80 мм",
    qty: 2000,
    unit: "шт",
    unitPrice: 4.80,
    totalBudget: 9600,
    city: "Бишкек",
    days: 4
  },
  {
    title: "Ресторан: ланч-боксы крафт",
    icon: UtensilsCrossed,
    prompt: "3000 ланч-боксов крафт трехсекционных 1000 мл до 18 сом в Бишкеке за 7 дней",
    categoryTag: "packaging",
    specs: "1000 мл, 3 секции, влагостойкий крафт с замком",
    qty: 3000,
    unit: "шт",
    unitPrice: 18,
    totalBudget: 54000,
    city: "Бишкек",
    days: 7
  },
  {
    title: "Отель: сатин и халаты",
    icon: Hotel,
    prompt: "100 комплектов белого сатинового постельного белья страйп и халаты до 2200 сом",
    categoryTag: "textiles",
    specs: "Сатин-страйп 100% хлопок, 140 г/м², белые, евро-размер",
    qty: 100,
    unit: "компл",
    unitPrice: 2200,
    totalBudget: 220000,
    city: "Бишкек",
    days: 10
  }
]

export function BazaarHero() {
  const router = useRouter()
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0)
  const currentScenario = PRESET_SCENARIOS[activeScenarioIdx]
  // Free interactive input: empty by default so user can immediately type
  const [prompt, setPrompt] = useState("")

  const handleSelectScenario = (idx: number) => {
    setActiveScenarioIdx(idx)
    setPrompt(PRESET_SCENARIOS[idx].prompt)
  }

  const handleClear = () => {
    setPrompt("")
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const clean = prompt.trim() || currentScenario.prompt
    router.push(`/requests/create?prompt=${encodeURIComponent(clean)}`)
  }

  // Reactive parsing on the fly from user typing
  const liveParsed = prompt.trim() ? parseRfqFallback(prompt) : null

  const displayTitle = liveParsed?.title || (prompt.trim() ? prompt.trim().slice(0, 45) : currentScenario.title)
  const displayQty = liveParsed ? liveParsed.quantity : currentScenario.qty
  const displayUnit = liveParsed ? liveParsed.unit : currentScenario.unit
  const displaySpecs = liveParsed?.specs || currentScenario.specs
  const displayCategoryTag = liveParsed?.category_tag || currentScenario.categoryTag
  const displayCity = liveParsed?.city || currentScenario.city
  const displayDays = liveParsed?.deadline_days || currentScenario.days

  // Calculate live budget
  let displayUnitPrice: number = currentScenario.unitPrice
  let displayTotalBudget: number = currentScenario.totalBudget

  if (liveParsed) {
    if (liveParsed.total_budget && liveParsed.total_budget > 0) {
      displayTotalBudget = liveParsed.total_budget
      displayUnitPrice = liveParsed.max_price || Math.round((liveParsed.total_budget / displayQty) * 10) / 10
    } else if (liveParsed.max_price && liveParsed.max_price > 0) {
      displayUnitPrice = liveParsed.max_price
      displayTotalBudget = Math.round(liveParsed.max_price * displayQty)
    } else {
      displayUnitPrice = currentScenario.unitPrice
      displayTotalBudget = Math.round(displayUnitPrice * displayQty)
    }
  }

  const matchedCategory = (BAZAAR_B2B_CATEGORIES as readonly { id: string; slug: string; tag: string; name: string; label: string }[]).find(
    c => c.slug === displayCategoryTag || c.tag === displayCategoryTag || c.id === displayCategoryTag
  )

  return (
    <section className="relative overflow-hidden bg-zinc-50 dark:bg-[#090A0F] text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800/80 pt-10 pb-16 md:pt-14 md:pb-20 transition-colors">
      {/* Adaptive SVG Grid Pattern Overlay */}
      <svg 
        className="absolute inset-0 w-full h-full stroke-zinc-200 dark:stroke-zinc-800/40 opacity-70 dark:opacity-30 pointer-events-none [mask-image:radial-gradient(100%_100%_at_top_center,white,transparent)]"
        aria-hidden="true"
      >
        <defs>
          <pattern id="hero-b2b-grid" width="32" height="32" patternUnits="userSpaceOnUse" x="50%" y="-1">
            <path d="M.5 32V.5H32" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" strokeWidth="0" fill="url(#hero-b2b-grid)" />
      </svg>

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        {/* Two-Column Strict Linear Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* LEFT COLUMN: Clean Left-Aligned Procurement Panel */}
          <div className="lg:col-span-6 space-y-6">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">BAZAAR_OS</span>
              <span className="text-zinc-300 dark:text-zinc-600">/</span>
              <span>PROCUREMENT ENGINE</span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-900 dark:text-white leading-[1.12]">
                Операционная система <span className="text-emerald-700 dark:text-emerald-400">оптовых закупок</span>
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl">
                Автоматизируем закупки для HoReCa, ритейла и производств Кыргызстана. Опишите потребность обычным языком — AI сформирует RFQ и найдет поставщиков без наценок и переплат.
              </p>
            </div>

            {/* Procurement Input Panel */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 p-4 sm:p-5 shadow-lg dark:shadow-2xl space-y-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>Свободный ввод закупки:</span>
                  </span>
                  {prompt ? (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Очистить</span>
                    </button>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500 hidden sm:inline">Ctrl + Enter для отправки</span>
                  )}
                </div>

                <div className="relative">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit()
                      }
                    }}
                    rows={3}
                    placeholder="Например: Нужно 2000 крафт-стаканов 350 мл до 4.80 сом в Бишкеке за 4 дня..."
                    className="w-full text-sm font-sans p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none transition-colors"
                  />
                </div>

                {/* Scenario Presets Chips */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">Готовые сценарии для быстрого старта:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SCENARIOS.map((item, idx) => {
                      const Icon = item.icon
                      const isSelected = activeScenarioIdx === idx && prompt === item.prompt
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectScenario(idx)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left border cursor-pointer ${
                            isSelected
                              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 font-bold"
                              : "bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                          <span>{item.title}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
                    <Zap className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                    <span>AI-расчет сметы в реальном времени</span>
                  </div>

                  <Button
                    type="submit"
                    className="rounded-xl px-5 py-2.5 text-xs font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-100 dark:text-zinc-950" />
                    <span>Разобрать через AI</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </form>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 shadow-sm">
                <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">СКОРОСТЬ</div>
                <div className="text-base font-bold text-zinc-900 dark:text-white mt-0.5 font-mono">15 минут</div>
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500">первые котировки</div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 shadow-sm">
                <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400">ЭКОНОМИЯ</div>
                <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">до 30%</div>
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500">без посредников</div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 shadow-sm">
                <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">ФАБРИКИ</div>
                <div className="text-base font-bold text-zinc-900 dark:text-white mt-0.5 font-mono">100% ПРОВЕРКА</div>
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500">юридическая чистота</div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Batch Estimator (Интерактивный калькулятор партии) */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl dark:shadow-2xl overflow-hidden">
              
              {/* Terminal Window Header Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 select-none">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-400 text-[11px] ml-2 font-mono">live-batch-estimator.sh</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40 font-mono">
                    ONLINE ESTIMATOR
                  </span>
                </div>
              </div>

              {/* Calculator Body */}
              <div className="p-6 space-y-6 text-zinc-700 dark:text-zinc-300">
                
                {/* Header title & category */}
                <div className="space-y-1.5 pb-3 border-b border-zinc-200 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40 font-mono">
                      {matchedCategory?.name || matchedCategory?.label || "Оптовая закупка"}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                      {displayCity}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                    {displayTitle}
                  </h3>

                  {displaySpecs && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono line-clamp-2">
                      Характеристики: {displaySpecs}
                    </p>
                  )}
                </div>

                {/* Key Spec Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 space-y-1">
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">Объем партии:</div>
                    <div className="text-base font-black text-zinc-900 dark:text-white font-mono">
                      {displayQty.toLocaleString("ru-RU")} <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">{displayUnit}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 space-y-1">
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">Цена за единицу:</div>
                    <div className="text-base font-black text-zinc-900 dark:text-white font-mono">
                      {displayUnitPrice} <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">сом / {displayUnit}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 space-y-1 col-span-2 sm:col-span-1">
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">Срок поставки:</div>
                    <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      до {displayDays} дн.
                    </div>
                  </div>
                </div>

                {/* Large Monospace Total Budget Box */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-zinc-50 dark:from-emerald-950/30 dark:to-zinc-900/80 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <Calculator className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <span>РАСЧЕТНАЯ СМЕТА ПАРТИИ:</span>
                    </span>
                    <span className="text-zinc-500">Без посредников</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight">
                      {displayTotalBudget.toLocaleString("ru-RU")}
                    </span>
                    <span className="text-lg font-bold text-zinc-700 dark:text-zinc-300 font-mono">СОМ</span>
                  </div>

                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono pt-1 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
                    <span>
                      Формула: {displayUnitPrice} сом × {displayQty.toLocaleString("ru-RU")} {displayUnit}
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Экономия до 30%</span>
                  </div>
                </div>

                {/* AI Assurance Banner */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    AI проверяет спецификацию по реальным прайс-листам производителей и базам прямых фабрик Кыргызстана.
                  </p>
                </div>

                {/* CTA Button to Request Creation */}
                <Button
                  onClick={handleSubmit}
                  className="w-full rounded-xl py-3.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 gap-2 transition-all shadow-lg shadow-emerald-950/20 dark:shadow-emerald-900/20 cursor-pointer"
                >
                  <span>Найти поставщиков под эту смету</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
