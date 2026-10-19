"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Terminal,
  Zap,
  TrendingDown
} from "lucide-react"
import { BazaarIcon } from "@/components/shared/bazaar-logo"

interface Scenario {
  title: string
  prompt: string
  categoryTag: string
  specs: string
  qty: number
  unit: string
  city: string
  optA: {
    price: number
    delivery: number
    days: number
    rating: number
    supplier: string
  }
  optB: {
    price: number
    delivery: number
    days: number
    rating: number
    supplier: string
  }
}

const PRESET_SCENARIOS: Scenario[] = [
  {
    title: "📦 300 коробок 30×20×15",
    prompt: "300 коробок 30×20×15 см до 80 сом в Бишкеке за 7 дней",
    categoryTag: "packaging",
    specs: "30×20×15 см, 3-слойный Т-23",
    qty: 300,
    unit: "шт",
    city: "Бишкек",
    optA: { price: 76, delivery: 1500, days: 6, rating: 4.9, supplier: "ОсОО «ГофроПак Бишкек»" },
    optB: { price: 69, delivery: 4000, days: 10, rating: 4.6, supplier: "«Азия-Тара» (Ош-склад)" }
  },
  {
    title: "☕ 2000 стаканов 350 мл",
    prompt: "2000 двухслойных стаканов 350 мл с крышками до 4.5 сом",
    categoryTag: "cups",
    specs: "350 мл, двухслойные крафт + крышки 80 мм",
    qty: 2000,
    unit: "шт",
    city: "Бишкек",
    optA: { price: 4.10, delivery: 500, days: 3, rating: 5.0, supplier: "CupCraft Кыргызстан" },
    optB: { price: 3.90, delivery: 1800, days: 7, rating: 4.7, supplier: "ПромПосуда Бишкек" }
  },
  {
    title: "🥤 50 бут. сиропа 1л",
    prompt: "50 бутылок сиропа карамель и ваниль 1л в Ош за 5 дней",
    categoryTag: "syrups",
    specs: "1000 мл стекло (карамель/ваниль)",
    qty: 50,
    unit: "бут",
    city: "Ош",
    optA: { price: 390, delivery: 1000, days: 4, rating: 4.8, supplier: "BarSupply HoReCa" },
    optB: { price: 380, delivery: 2500, days: 7, rating: 4.5, supplier: "Ингредиенты Плюс" }
  }
]

export function BazaarHero() {
  const router = useRouter()
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0)
  const currentScenario = PRESET_SCENARIOS[activeScenarioIdx]
  const [prompt, setPrompt] = useState(currentScenario.prompt)

  const handleSelectScenario = (idx: number) => {
    setActiveScenarioIdx(idx)
    setPrompt(PRESET_SCENARIOS[idx].prompt)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const clean = prompt.trim() || currentScenario.prompt
    router.push(`/requests/create?prompt=${encodeURIComponent(clean)}`)
  }

  // Calculations for right terminal
  const costA = (currentScenario.optA.price * currentScenario.qty) + currentScenario.optA.delivery
  const costB = (currentScenario.optB.price * currentScenario.qty) + currentScenario.optB.delivery
  const priceDiff = Math.abs(costB - costA)
  const daysDiff = Math.abs(currentScenario.optB.days - currentScenario.optA.days)

  return (
    <section className="relative overflow-hidden bg-[#090A0F] text-zinc-100 border-b border-zinc-800/80 pt-10 pb-16 md:pt-14 md:pb-20">
      {/* Subtle Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        {/* Two-Column Strict Linear Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* LEFT COLUMN: Clean Left-Aligned Procurement Panel */}
          <div className="lg:col-span-6 space-y-6">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 font-semibold">BAZAAR_OS</span>
              <span className="text-zinc-600">/</span>
              <span>PROCUREMENT ENGINE</span>
              <span className="text-[10px] text-zinc-500 ml-1">v2.0</span>
            </div>

            {/* Headline without hype */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.12]">
                Операционная система <span className="text-emerald-400">оптовых закупок</span>
              </h1>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl">
                Автоматизируем закупки для HoReCa, ритейла и производств Кыргызстана. Опишите потребность обычным языком — AI сформирует RFQ и соберет расчеты проверенных поставщиков.
              </p>
            </div>

            {/* Procurement Input Panel */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-5 shadow-2xl space-y-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Свободный ввод закупки:</span>
                  </span>
                  <span className="text-zinc-500 hidden sm:inline">Ctrl + Enter для отправки</span>
                </div>

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
                  placeholder="Например: Нужно 300 коробок 30×20×15 см до 80 сом в Бишкеке за 7 дней..."
                  className="w-full text-sm font-sans p-3.5 rounded-xl bg-zinc-900/90 border-zinc-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500 text-zinc-100 placeholder:text-zinc-500 resize-none transition-colors"
                />

                {/* Scenario Presets Chips */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-mono text-zinc-400">Готовые сценарии:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SCENARIOS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectScenario(idx)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left border ${
                          activeScenarioIdx === idx
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold"
                            : "bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-mono">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>Авторасчет цены и логистики</span>
                  </div>

                  <Button
                    type="submit"
                    className="rounded-xl px-5 py-2.5 text-xs font-bold shadow-md bg-emerald-600 hover:bg-emerald-500 text-white gap-2 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Разобрать через AI</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </form>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40">
                <div className="text-xs font-mono text-zinc-400">СКОРОСТЬ</div>
                <div className="text-base font-bold text-white mt-0.5 font-mono">15 минут</div>
                <div className="text-[11px] text-zinc-500">первые котировки</div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40">
                <div className="text-xs font-mono text-emerald-400">ЭКОНОМИЯ</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5 font-mono">до 30%</div>
                <div className="text-[11px] text-zinc-500">без посредников</div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40">
                <div className="text-xs font-mono text-zinc-400">ФАБРИКИ</div>
                <div className="text-base font-bold text-white mt-0.5 font-mono">100% ПРОВЕРКА</div>
                <div className="text-[11px] text-zinc-500">юридическая чистота</div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Terminal Preview ("Как считает BazaarOS") */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden font-mono text-xs">
              
              {/* Terminal Window Header Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 select-none">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-zinc-400 text-[11px] ml-2 font-mono">bazaargos-evaluation.sh</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    LIVE CALCULATION
                  </span>
                </div>
              </div>

              {/* Terminal Body */}
              <div className="p-5 space-y-5 text-zinc-300">
                
                {/* 1. Parsed RFQ Specs Box */}
                <div className="space-y-2">
                  <div className="text-zinc-500 text-[11px] uppercase tracking-wider flex items-center justify-between">
                    <span>[1] Спецификация закупки (распознано AI)</span>
                    <span className="text-emerald-400 font-semibold">STATUS: PARSED_OK</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/90 space-y-1.5 text-zinc-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Товар:</span>
                      <span className="font-bold text-white font-sans">{currentScenario.title.replace(/^.{2}\s*/, '')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Характеристики:</span>
                      <span className="text-emerald-400">{currentScenario.specs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Объем партии:</span>
                      <span className="font-bold text-white font-mono">{currentScenario.qty.toLocaleString("ru-RU")} {currentScenario.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Локация поставки:</span>
                      <span className="text-zinc-300">{currentScenario.city}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Live Supplier Offer Comparison */}
                <div className="space-y-2.5">
                  <div className="text-zinc-500 text-[11px] uppercase tracking-wider flex items-center justify-between">
                    <span>[2] Сравнение офферов (AI Comparison Engine)</span>
                    <span className="text-zinc-400">Формула полной стоимости</span>
                  </div>

                  {/* Option A (Recommended / AI Choice) */}
                  <div className="p-3.5 rounded-xl border border-emerald-500/50 bg-emerald-950/20 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">Вариант A</span>
                        <span className="text-zinc-400 text-[11px] font-sans">({currentScenario.optA.supplier})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-zinc-950 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Выбор AI
                      </span>
                    </div>

                    <div className="text-emerald-300 font-mono text-[12px] bg-zinc-950/60 p-2.5 rounded-lg border border-emerald-500/20">
                      <span className="font-bold text-white">{currentScenario.optA.price} сом</span>
                      <span className="text-zinc-500"> × </span>
                      <span>{currentScenario.qty} {currentScenario.unit}</span>
                      <span className="text-zinc-500"> + </span>
                      <span>{currentScenario.optA.delivery.toLocaleString("ru-RU")} сом доставка</span>
                      <span className="text-zinc-400"> = </span>
                      <span className="font-black text-emerald-400 text-sm">
                        {costA.toLocaleString("ru-RU")} сом
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                      <span>Срок: <strong className="text-white">{currentScenario.optA.days} дней</strong></span>
                      <span>Рейтинг поставщика: <strong className="text-amber-400">★ {currentScenario.optA.rating}</strong></span>
                      <span className="text-emerald-400 font-semibold">Лучшая совокупная цена</span>
                    </div>
                  </div>

                  {/* Option B (Alternative) */}
                  <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-300 text-sm">Вариант B</span>
                        <span className="text-zinc-500 text-[11px] font-sans">({currentScenario.optB.supplier})</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">Дороже логистика</span>
                    </div>

                    <div className="text-zinc-400 font-mono text-[12px] bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
                      <span>{currentScenario.optB.price} сом</span>
                      <span className="text-zinc-600"> × </span>
                      <span>{currentScenario.qty} {currentScenario.unit}</span>
                      <span className="text-zinc-600"> + </span>
                      <span>{currentScenario.optB.delivery.toLocaleString("ru-RU")} сом доставка</span>
                      <span className="text-zinc-600"> = </span>
                      <span className="font-bold text-zinc-200">
                        {costB.toLocaleString("ru-RU")} сом
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                      <span>Срок: {currentScenario.optB.days} дней</span>
                      <span>Рейтинг: ★ {currentScenario.optB.rating}</span>
                      <span className="text-red-400/90 font-mono">+{priceDiff.toLocaleString("ru-RU")} сом к заказу</span>
                    </div>
                  </div>
                </div>

                {/* Terminal Footnote Summary */}
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>AI-вердикт:</span>
                  </div>
                  <div>
                    Вариант A экономит <strong className="text-white">{priceDiff.toLocaleString("ru-RU")} сом</strong> совокупного бюджета и доставляется на <strong className="text-white">{daysDiff} дня быстрее</strong>.
                  </div>
                </div>

                {/* Direct CTA from terminal */}
                <Button
                  onClick={handleSubmit}
                  variant="outline"
                  className="w-full rounded-xl border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-300 font-mono text-xs font-semibold h-10 gap-2"
                >
                  <BazaarIcon className="w-4 h-4" />
                  <span>Запустить эту закупку в BazaarOS →</span>
                </Button>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
