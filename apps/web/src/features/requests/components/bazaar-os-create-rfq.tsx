"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createRequest } from "@/app/actions/requests"
import { parseRfqFallback } from "@/lib/rfq-parser"
import { BazaarIcon } from "@/components/shared/bazaar-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CITIES_BY_REGION, guessRegionByCity } from "@/lib/regions"
import { 
  Sparkles, 
  Send, 
  Loader2, 
  CheckCircle2, 
  Boxes, 
  Clock, 
  MapPin, 
  Coins, 
  Tag, 
  SlidersHorizontal,
  ArrowRight,
  FileText,
  HelpCircle
} from "lucide-react"

interface BazaarOsCreateRfqProps {
  initialPrompt?: string
}

const EXAMPLE_PROMPTS = [
  {
    label: "📦 Коробки",
    text: "300 коробок 30×20×15 см до 80 сом в Бишкеке за 7 дней"
  },
  {
    label: "☕ Стаканы с крышками",
    text: "2000 двухслойных стаканов 350 мл с крышками до 4.5 сом"
  },
  {
    label: "🥤 Сиропы для бара",
    text: "50 бутылок сиропа карамель и ваниль 1л в Ош за 5 дней"
  },
  {
    label: "🫘 Кофе свежей обжарки",
    text: "100 кг бразильской арабики свежей обжарки до 900 сом"
  }
]

export function BazaarOsCreateRfq({ initialPrompt = "" }: BazaarOsCreateRfqProps) {
  const router = useRouter()
  const [prompt, setPrompt] = useState(initialPrompt)
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedSource, setParsedSource] = useState<"gemini" | "fallback" | null>(null)

  // Structured form state
  const [title, setTitle] = useState("")
  const [specs, setSpecs] = useState("")
  const [categoryTag, setCategoryTag] = useState<"packaging" | "cups" | "syrups" | "coffee" | "other">("packaging")
  const [quantity, setQuantity] = useState<number>(1)
  const [unit, setUnit] = useState<string>("шт")
  const [maxPrice, setMaxPrice] = useState<string>("")
  const [city, setCity] = useState<string>("Бишкек")
  const [deadlineDays, setDeadlineDays] = useState<number>(7)
  const [description, setDescription] = useState<string>("")
  const [hasParsed, setHasParsed] = useState<boolean>(false)

  const applyParsedData = (data: any, source: "gemini" | "fallback") => {
    if (data.title) setTitle(data.title)
    if (data.specs) setSpecs(data.specs)
    if (data.category_tag) setCategoryTag(data.category_tag)
    if (data.quantity) setQuantity(Number(data.quantity) || 1)
    if (data.unit) setUnit(data.unit)
    if (data.max_price !== undefined && data.max_price !== null) {
      setMaxPrice(String(data.max_price))
    }
    if (data.city) setCity(data.city)
    if (data.deadline_days) setDeadlineDays(Number(data.deadline_days) || 7)
    setParsedSource(source)
    setHasParsed(true)
  }

  // Handle parsing through AI API route with 100% resilient client fallback
  const handleParsePrompt = async (textToParse?: string) => {
    const text = (textToParse ?? prompt).trim()
    if (!text) {
      setError("Введите текст запроса или выберите один из примеров")
      return
    }

    setIsParsing(true)
    setError(null)

    try {
      const res = await fetch("/api/ai/parse-rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text })
      })

      if (res.ok) {
        const data = await res.json()
        if (data && typeof data === "object") {
          applyParsedData(data, data.parsed_by || "gemini")
          setIsParsing(false)
          return
        }
      }
    } catch (apiErr) {
      console.warn("Client fetch /api/ai/parse-rfq failed, using local client fallback:", apiErr)
    }

    // Direct client fallback - 100% fail-safe, never displays parsing error
    try {
      const fallbackData = parseRfqFallback(text)
      applyParsedData(fallbackData, "fallback")
    } catch (fallbackErr) {
      console.error("Local fallback failed:", fallbackErr)
    } finally {
      setIsParsing(false)
    }
  }

  // Auto-parse on load if initialPrompt is supplied
  useEffect(() => {
    if (initialPrompt && !hasParsed) {
      handleParsePrompt(initialPrompt)
    }
  }, [initialPrompt])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError("Укажите наименование требуемого товара")
      return
    }
    if (quantity <= 0) {
      setError("Количество должно быть больше 0")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const region = guessRegionByCity(city) || "Бишкек"
      const parsedPrice = maxPrice ? parseFloat(maxPrice) : null

      const result = await createRequest({
        title: title.trim(),
        specs: specs.trim() || undefined,
        categoryTag,
        quantity: Math.round(quantity),
        unit: unit.trim() || "шт",
        maxPrice: parsedPrice,
        city,
        region,
        deadlineDays,
        description: description.trim() || undefined,
        rawAiPrompt: prompt.trim() || undefined
      })

      if (result.error) {
        setError(result.error)
        setIsSubmitting(false)
      } else if (result.id) {
        router.push(`/requests/${result.id}`)
      } else {
        router.push("/requests")
      }
    } catch (err: any) {
      setError(err.message || "Ошибка создания заявки")
      setIsSubmitting(false)
    }
  }

  const estimatedTotal = maxPrice && !isNaN(parseFloat(maxPrice)) ? parseFloat(maxPrice) * quantity : null

  return (
    <div className="space-y-8">
      {/* Top B2B Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#11131A] border border-zinc-800 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide">
              <BazaarIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>BazaarOS • AI Procurement Engine v2.0</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Создание B2B-запроса котировок (RFQ)
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed">
              Опишите своими словами, что требуется для бизнеса. AI-ассистент мгновенно выделит характеристики партии, сформирует спецификацию и уведомит проверенных поставщиков Кыргызстана.
            </p>
          </div>
          <div className="hidden lg:flex flex-col gap-1 p-4 bg-[#090A0F] rounded-xl border border-zinc-800 text-xs text-zinc-400 font-mono shadow-inner">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>RFQ Dispatch Active</span>
            </div>
            <span className="text-zinc-500">Авторасчет MOQ, цен и сроков доставки</span>
          </div>
        </div>
      </div>

      {/* 2-Column Linear / Stripe Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: AI Prompt & Natural Input */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-[#11131A] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-prompt" className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                Что необходимо закупить?
              </Label>
              <span className="text-xs text-zinc-500 hidden sm:inline">
                Свободный русский текст
              </span>
            </div>

            <div className="relative">
              <Textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Например: Нужно 300 коробок 30×20×15 см, желательно до 80 сом за штуку, доставить в Бишкек за 7 дней..."
                className="text-sm md:text-base p-4 rounded-xl bg-[#090A0F] focus:bg-[#0c0e15] border-zinc-800 focus:border-emerald-500/60 transition-all resize-none text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500/20"
              />
            </div>

            {/* Example Prompt Chips */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-zinc-400">Быстрый старт по шаблонам:</p>
              <div className="flex flex-col gap-2">
                {EXAMPLE_PROMPTS.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(ex.text)
                      handleParsePrompt(ex.text)
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl text-xs font-medium bg-[#090A0F] hover:bg-emerald-950/20 hover:border-emerald-500/40 border border-zinc-800/80 transition-all text-left text-zinc-300 group"
                  >
                    <span className="font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                      {ex.label}
                    </span>
                    <span className="text-zinc-500 group-hover:text-zinc-400 font-mono text-[11px] truncate max-w-[200px]">
                      {ex.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Parse Button & Status */}
            <div className="pt-3 border-t border-zinc-800/80 space-y-3">
              <Button
                type="button"
                onClick={() => handleParsePrompt()}
                disabled={isParsing || !prompt.trim()}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm gap-2 transition-colors cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI извлекает спецификацию...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Разобрать через AI</span>
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center text-xs text-zinc-400">
                {isParsing ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Сегментация параметров партии...
                  </span>
                ) : hasParsed ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Спецификация структурирована {parsedSource === "gemini" ? "(Gemini 2.5)" : "(BazaarOS AI)"}
                  </span>
                ) : (
                  <span className="text-zinc-500">Нажмите кнопку для автозаполнения формы справа</span>
                )}
              </div>
            </div>
          </div>

          {/* Additional Description Card */}
          <div className="rounded-2xl border border-zinc-800 bg-[#11131A] p-6 shadow-sm space-y-3">
            <Label htmlFor="description" className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              Дополнительные требования (необязательно)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Укажите особые условия: безналичный расчет с НДС, сертификаты качества, периодичность поставок..."
              className="bg-[#090A0F] border-zinc-800 rounded-xl resize-none min-h-[90px] text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500/20 focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Structured Form & Live Preview */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800 bg-[#11131A] p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Параметры коммерческого запроса</h2>
                  <p className="text-xs text-zinc-400">
                    Проверьте и при необходимости скорректируйте данные
                  </p>
                </div>
              </div>
              {hasParsed && (
                <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                  AI-Спецификация
                </span>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Title */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title" className="text-sm font-semibold text-zinc-200">
                  Наименование товара <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Картонные коробки 30×20×15 см или Стаканы 350 мл"
                  className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500/20 focus:border-emerald-500/50"
                  required
                />
              </div>

              {/* Specs */}
              <div className="space-y-2">
                <Label htmlFor="specs" className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-zinc-400" />
                  Размеры / характеристики
                </Label>
                <Input
                  id="specs"
                  value={specs}
                  onChange={(e) => setSpecs(e.target.value)}
                  placeholder="Например: 30×20×15 см, крафт"
                  className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 font-mono text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>

              {/* Category Tag */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-zinc-400" />
                  Категория закупки
                </Label>
                <Select
                  value={categoryTag}
                  onValueChange={(val: any) => setCategoryTag(val)}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 text-zinc-100">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#11131A] border-zinc-800 text-zinc-100">
                    <SelectItem value="packaging">📦 Упаковка и тара (коробки, пакеты)</SelectItem>
                    <SelectItem value="cups">☕ Стаканы, крышки и посуда</SelectItem>
                    <SelectItem value="syrups">🥤 Сиропы, топпинги и концентраты</SelectItem>
                    <SelectItem value="coffee">🫘 Кофе в зернах и чай</SelectItem>
                    <SelectItem value="other">📋 Другие B2B-товары</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-sm font-semibold text-zinc-200">
                    Количество <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 font-mono text-zinc-100 focus-visible:ring-emerald-500/20 focus:border-emerald-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-sm font-semibold text-zinc-200">
                    Ед. изм.
                  </Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#11131A] border-zinc-800 text-zinc-100">
                      <SelectItem value="шт">шт (штук)</SelectItem>
                      <SelectItem value="коробок">коробок</SelectItem>
                      <SelectItem value="стаканов">стаканов</SelectItem>
                      <SelectItem value="уп">упаковок</SelectItem>
                      <SelectItem value="кг">кг</SelectItem>
                      <SelectItem value="л">литров</SelectItem>
                      <SelectItem value="бутылок">бутылок</SelectItem>
                      <SelectItem value="рулонов">рулонов</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Max Price */}
              <div className="space-y-2">
                <Label htmlFor="maxPrice" className="text-sm font-semibold text-zinc-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-zinc-400" />
                    Макс. цена за 1 {unit}
                  </span>
                  <span className="text-xs text-zinc-500 font-normal">Необязательно</span>
                </Label>
                <div className="relative">
                  <Input
                    id="maxPrice"
                    type="number"
                    step="0.01"
                    min={0}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Например: 80"
                    className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 pr-12 font-mono text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500/20 focus:border-emerald-500/50"
                  />
                  <span className="absolute right-3.5 top-3 text-xs text-zinc-400 font-mono pointer-events-none">
                    сом
                  </span>
                </div>
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-zinc-400" />
                  Город доставки <span className="text-red-400">*</span>
                </Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 text-zinc-100">
                    <SelectValue placeholder="Выберите город" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#11131A] border-zinc-800 text-zinc-100 max-h-72">
                    {Object.entries(CITIES_BY_REGION).map(([region, cities]) => (
                      <div key={region}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-[#090A0F]">
                          {region}
                        </div>
                        {cities.map((c: string) => (
                          <SelectItem key={c} value={c} className="pl-6">
                            {c}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  Срок поставки
                </Label>
                <Select
                  value={String(deadlineDays)}
                  onValueChange={(val) => setDeadlineDays(parseInt(val, 10))}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 text-zinc-100 font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#11131A] border-zinc-800 text-zinc-100">
                    <SelectItem value="3">Срочно (до 3 дней)</SelectItem>
                    <SelectItem value="7">Стандартно (до 7 дней)</SelectItem>
                    <SelectItem value="14">До 14 дней (2 недели)</SelectItem>
                    <SelectItem value="30">Плановая закупка (до 30 дней)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Calculation Terminal Banner */}
            <div className="p-4 rounded-xl bg-[#090A0F] border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
              <div className="space-y-1">
                <div className="font-mono text-zinc-200 text-xs sm:text-sm">
                  Партия: <span className="text-emerald-400 font-bold">{quantity.toLocaleString("ru-RU")}</span> {unit} • Доставка: <span className="text-zinc-300">{city}</span> • Срок: <span className="text-zinc-300 font-mono">до {deadlineDays} дн.</span>
                </div>
                {specs && (
                  <div className="text-xs font-mono text-zinc-500">
                    Спецификация: {specs}
                  </div>
                )}
              </div>
              {estimatedTotal !== null && (
                <div className="text-left sm:text-right sm:border-l sm:border-zinc-800 sm:pl-4">
                  <div className="text-xs text-zinc-500 font-mono">Ориентировочный бюджет:</div>
                  <div className="text-base font-mono font-extrabold text-emerald-400">
                    ~ {estimatedTotal.toLocaleString("ru-RU")} сом
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl text-base font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 gap-2 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Публикация запроса на бирже...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Отправить запрос поставщикам</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
