"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "@/i18n/routing"
import { createRequest, searchSuppliers, contactSupplierDirect, type SupplierSearchResult } from "@/app/actions/requests"
import { parseRfqFallback } from "@/lib/rfq-parser"
import { BazaarIcon } from "@/components/shared/bazaar-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CITIES_BY_REGION, guessRegionByCity } from "@/lib/regions"
import { BAZAAR_B2B_CATEGORIES } from "@/lib/categories"
import { toast } from "sonner"
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
  Package,
  Coffee,
  CupSoda,
  Flame,
  RotateCcw,
  X,
  Search,
  Building2,
  ShieldCheck,
  Check,
  ExternalLink,
  MessageSquare,
  Truck,
  Phone
} from "lucide-react"

interface BazaarOsCreateRfqProps {
  initialPrompt?: string
}

interface ExamplePrompt {
  label: string
  text: string
  icon: React.ComponentType<{ className?: string }>
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    label: "Коробки и тара",
    text: "300 коробок 30×20×15 см до 80 сом в Бишкеке за 7 дней",
    icon: Package
  },
  {
    label: "Стаканы с крышками",
    text: "2000 двухслойных стаканов 350 мл с крышками до 4.5 сом",
    icon: Coffee
  },
  {
    label: "Сиропы для бара",
    text: "50 бутылок сиропа карамель и ваниль 1л в Ош за 5 дней",
    icon: CupSoda
  },
  {
    label: "Кофе свежей обжарки",
    text: "100 кг бразильской арабики свежей обжарки до 900 сом",
    icon: Flame
  }
]

export function BazaarOsCreateRfq({ initialPrompt = "" }: BazaarOsCreateRfqProps) {
  const router = useRouter()
  const [prompt, setPrompt] = useState(initialPrompt)
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contactingId, setContactingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null)
  const [parsedSource, setParsedSource] = useState<"gemini" | "fallback" | null>(null)

  // Real supplier search state
  const [suppliers, setSuppliers] = useState<SupplierSearchResult[]>([])
  const [isSearchingSuppliers, setIsSearchingSuppliers] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)

  // Structured form state
  const [title, setTitle] = useState("")
  const [specs, setSpecs] = useState("")
  const [categoryTag, setCategoryTag] = useState<string>("packaging")
  const [quantity, setQuantity] = useState<string>("500")
  const [unit, setUnit] = useState<string>("шт")
  const [totalBudget, setTotalBudget] = useState<string>("")
  const [maxPrice, setMaxPrice] = useState<string>("")
  const [city, setCity] = useState<string>("Бишкек")
  const [deadlineDays, setDeadlineDays] = useState<number>(7)
  const [description, setDescription] = useState<string>("")
  const [hasParsed, setHasParsed] = useState<boolean>(false)

  // Sync totalBudget and maxPrice
  const handleTotalBudgetChange = (val: string) => {
    setTotalBudget(val)
    const numQty = Number(quantity) || 0
    if (val.trim() !== "" && !isNaN(Number(val)) && numQty > 0) {
      const p = parseFloat(val) / numQty
      setMaxPrice(p > 0 ? (Math.round(p * 100) / 100).toString() : "")
    } else if (!val.trim()) {
      setMaxPrice("")
    }
  }

  const handleMaxPriceChange = (val: string) => {
    setMaxPrice(val)
    const numQty = Number(quantity) || 0
    if (val.trim() !== "" && !isNaN(Number(val)) && numQty > 0) {
      const b = parseFloat(val) * numQty
      setTotalBudget(b > 0 ? Math.round(b).toString() : "")
    } else if (!val.trim()) {
      setTotalBudget("")
    }
  }

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleTotalBudgetChange(e.target.value)
  }

  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleMaxPriceChange(e.target.value)
  }

  const unitPrice = maxPrice

  const handleQuantityChange = (val: string) => {
    setQuantity(val)
    const numQty = Number(val) || 0
    if (maxPrice.trim() !== "" && !isNaN(Number(maxPrice)) && numQty > 0) {
      const b = parseFloat(maxPrice) * numQty
      setTotalBudget(b > 0 ? Math.round(b).toString() : "")
    } else if (totalBudget.trim() !== "" && !isNaN(Number(totalBudget)) && numQty > 0) {
      const p = parseFloat(totalBudget) / numQty
      setMaxPrice(p > 0 ? (Math.round(p * 100) / 100).toString() : "")
    }
  }

  const applyParsedData = (data: any, source: "gemini" | "fallback") => {
    if (data.title) setTitle(data.title)
    if (data.specs) setSpecs(data.specs)
    if (data.category_tag) setCategoryTag(data.category_tag)
    if (data.quantity) setQuantity(String(data.quantity))
    if (data.unit) setUnit(data.unit)
    if (data.city) setCity(data.city)
    if (data.deadline_days) setDeadlineDays(Number(data.deadline_days) || 7)

    const numQ = Number(data.quantity) || 1

    if (data.total_budget !== undefined && data.total_budget !== null) {
      setTotalBudget(String(data.total_budget))
      if (data.max_price) {
        setMaxPrice(String(data.max_price))
      } else {
        const p = Math.round((Number(data.total_budget) / numQ) * 100) / 100
        setMaxPrice(String(p))
      }
    } else if (data.max_price !== undefined && data.max_price !== null) {
      setMaxPrice(String(data.max_price))
      const b = Math.round(Number(data.max_price) * numQ)
      setTotalBudget(String(b))
    }

    setParsedSource(source)
    setHasParsed(true)
  }

  // Search real suppliers from DB
  const handleFindSuppliers = async (textToParse?: string) => {
    const text = (textToParse ?? prompt).trim()
    setIsSearchingSuppliers(true)
    setError(null)

    let parsedData: any = null

    if (text) {
      setIsParsing(true)
      try {
        const res = await fetch("/api/ai/parse-rfq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text })
        })

        if (res.ok) {
          const data = await res.json()
          if (data && typeof data === "object") {
            parsedData = data
            applyParsedData(data, data.parsed_by || "gemini")
          }
        }
      } catch (apiErr) {
        console.warn("Client fetch /api/ai/parse-rfq failed, using local client fallback:", apiErr)
      }

      if (!parsedData) {
        try {
          parsedData = parseRfqFallback(text)
          applyParsedData(parsedData, "fallback")
        } catch (fallbackErr) {
          console.error("Local fallback failed:", fallbackErr)
        }
      }
      setIsParsing(false)
    }

    // Now search real suppliers and real products in database
    try {
      const searchCat = parsedData?.category_tag || categoryTag || "packaging"
      const searchTitle = parsedData?.title || title || text
      const searchCity = parsedData?.city || city || "Бишкек"
      const searchQty = Number(parsedData?.quantity || quantity) || 1

      const suppRes = await searchSuppliers({
        categoryTag: searchCat,
        text: searchTitle,
        city: searchCity,
        quantity: searchQty
      })
      setSuppliers(suppRes.suppliers || [])
      setHasSearched(true)
    } catch (suppErr: any) {
      console.warn("Supplier search error:", suppErr)
      setSuppliers([])
      setHasSearched(true)
    } finally {
      setIsSearchingSuppliers(false)
    }
  }

  const handleResetForm = () => {
    setPrompt("")
    setTitle("")
    setSpecs("")
    setCategoryTag("packaging")
    setQuantity("500")
    setUnit("шт")
    setTotalBudget("")
    setMaxPrice("")
    setCity("Бишкек")
    setDeadlineDays(7)
    setDescription("")
    setHasParsed(false)
    setParsedSource(null)
    setSuppliers([])
    setHasSearched(false)
    setSelectedSupplierId(null)
    setCreatedRequestId(null)
    setError(null)
  }

  useEffect(() => {
    if (initialPrompt && !hasParsed) {
      handleFindSuppliers(initialPrompt)
    }
  }, [initialPrompt])

  const handleDirectOrder = async (supplierId: string, itemTitle: string) => {
    setContactingId(supplierId)
    try {
      const numQ = Number(quantity) || 1
      const res = await contactSupplierDirect({
        supplierId,
        message: `Здравствуйте! Хочу заказать партию «${itemTitle}» в объеме ${numQ.toLocaleString("ru-RU")} ${unit} с доставкой в ${city}.`
      })
      if (res.error) {
        toast.error(res.error)
      } else if (res.chatId) {
        toast.success("Чат с поставщиком открыт")
        router.push(`/messages/${res.chatId}`)
      }
    } catch (err: any) {
      toast.error(err.message || "Ошибка связи с поставщиком")
    } finally {
      setContactingId(null)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!title.trim()) {
      setError("Укажите наименование требуемого товара")
      toast.error("Укажите наименование требуемого товара")
      return
    }
    const numQty = Number(quantity) || 0
    if (numQty <= 0) {
      setError("Количество должно быть больше 0")
      toast.error("Количество должно быть больше 0")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const region = guessRegionByCity(city) || "Бишкек"
      const parsedTotalBudget = totalBudget.trim() !== "" ? (Number(totalBudget) || null) : null
      const parsedPrice = maxPrice.trim() !== "" ? (Number(maxPrice) || null) : null

      let finalDescription = description.trim()
      if (selectedSupplierId) {
        const found = suppliers.find(s => s.id === selectedSupplierId)
        if (found) {
          finalDescription = `[Запрос направлен поставщику: ${found.name} (${found.city})]\n\n${finalDescription}`.trim()
        }
      }

      const result = await createRequest({
        title: title.trim(),
        specs: specs.trim() || undefined,
        categoryTag,
        quantity: numQty,
        unit: unit.trim() || "шт",
        totalBudget: parsedTotalBudget,
        maxPrice: parsedPrice,
        city,
        region,
        deadlineDays,
        description: finalDescription || undefined,
        rawAiPrompt: prompt.trim() || undefined
      })

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        setIsSubmitting(false)
      } else if (result.id) {
        setIsSubmitting(false)
        setCreatedRequestId(result.id)
        toast.success("Запрос успешно опубликован!")
      } else {
        setIsSubmitting(false)
        router.push("/requests")
      }
    } catch (err: any) {
      const msg = err.message || "Ошибка создания заявки"
      setError(msg)
      toast.error(msg)
      setIsSubmitting(false)
    }
  }

  const numQty = Number(quantity) || 0
  const estimatedTotal = totalBudget.trim() !== "" && !isNaN(Number(totalBudget))
    ? Number(totalBudget)
    : (maxPrice.trim() !== "" && !isNaN(Number(maxPrice)) ? Number(maxPrice) * (numQty || 1) : null)

  return (
    <div className="space-y-8">
      {/* Top B2B Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide">
              <BazaarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>BazaarOS • AI Procurement Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Создание B2B-запроса котировок (RFQ)
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed">
              Опишите своими словами, что требуется для бизнеса. AI-ассистент сформирует спецификацию партии, рассчитает бюджет и проверит прямые прайс-листы поставщиков.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(prompt || hasParsed || title) && (
              <Button
                type="button"
                variant="outline"
                onClick={handleResetForm}
                className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs gap-1.5 font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Очистить / Новый запрос</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: AI Prompt & Natural Input */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-prompt" className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                Что необходимо закупить?
              </Label>
              {prompt && (
                <button
                  type="button"
                  onClick={() => setPrompt("")}
                  className="text-xs text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Стереть</span>
                </button>
              )}
            </div>

            <div className="relative">
              <Textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Например: Нужно 300 коробок 30×20×15 см, общий бюджет до 24 000 сом, доставить в Бишкек за 7 дней..."
                className="text-sm md:text-base p-4 rounded-xl bg-white dark:bg-[#090A0F] focus:bg-white dark:focus:bg-[#0c0e15] border-zinc-300 dark:border-zinc-800 focus:border-emerald-500/60 transition-all resize-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-visible:ring-emerald-500/20"
              />
            </div>

            {/* Example Prompt Chips */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Быстрый старт по шаблонам:</p>
              <div className="flex flex-col gap-2">
                {EXAMPLE_PROMPTS.map((ex, idx) => {
                  const Icon = ex.icon
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(ex.text)
                        handleFindSuppliers(ex.text)
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl text-xs font-medium bg-zinc-50 dark:bg-[#090A0F] hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-500/40 border border-zinc-200 dark:border-zinc-800/80 transition-all text-left text-zinc-700 dark:text-zinc-300 group cursor-pointer"
                    >
                      <span className="flex items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{ex.label}</span>
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 font-mono text-[11px] truncate max-w-[200px]">
                        {ex.text}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Parse & Supplier Search Button */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 space-y-3">
              <Button
                type="button"
                onClick={() => handleFindSuppliers()}
                disabled={isParsing || isSearchingSuppliers || !prompt.trim()}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm gap-2 transition-colors cursor-pointer"
              >
                {isParsing || isSearchingSuppliers ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Поиск поставщиков через AI...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Подобрать поставщиков и рассчитать</span>
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                {isParsing || isSearchingSuppliers ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Поиск по базе прайс-листов и B2B-поставщиков...
                  </span>
                ) : hasSearched ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {suppliers.length > 0 ? `Найдено позиций/поставщиков: ${suppliers.length}` : "Прямых совпадений нет (будет открытый тендер)"}
                  </span>
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-500">Нажмите для подбора реальных прайсов из базы</span>
                )}
              </div>
            </div>
          </div>

          {/* Additional Description Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] p-6 shadow-sm space-y-3">
            <Label htmlFor="description" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              Дополнительные требования (необязательно)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Укажите особые условия: безналичный расчет с НДС, сертификаты качества, график поставок..."
              className="bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 rounded-xl resize-none min-h-[90px] text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-visible:ring-emerald-500/20 focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Structured Form & Live Preview */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Спецификация коммерческого запроса</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Параметры партии и бюджет закупки
                  </p>
                </div>
              </div>
              {hasParsed && (
                <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md">
                  AI-Спецификация
                </span>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Title */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Наименование товара <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Картонные коробки 30×20×15 см или Двухслойные стаканы 350 мл"
                  className="h-11 rounded-xl bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-visible:ring-emerald-500/20 focus:border-emerald-500/50"
                  required
                />
              </div>

              {/* Specs */}
              <div className="space-y-2">
                <Label htmlFor="specs" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  Размеры / характеристики
                </Label>
                <Input
                  id="specs"
                  value={specs}
                  onChange={(e) => setSpecs(e.target.value)}
                  placeholder="Например: 30×20×15 см, крафт Т-23"
                  className="h-11 rounded-xl bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-visible:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>

              {/* Category Tag (8 B2B Wholesale Categories) */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  Категория закупки
                </Label>
                <Select
                  value={categoryTag}
                  onValueChange={(val: any) => setCategoryTag(val)}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                    {BAZAAR_B2B_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Другие B2B-товары</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Количество <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="500"
                    className="h-11 rounded-xl bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 font-mono text-zinc-900 dark:text-zinc-100 focus-visible:ring-emerald-500/20 focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Ед. изм.
                  </Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
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

              {/* City */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  Город доставки <span className="text-red-500">*</span>
                </Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                    <SelectValue placeholder="Выберите город" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-h-72">
                    {Object.entries(CITIES_BY_REGION).map(([region, cities]) => (
                      <div key={region}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider bg-zinc-100 dark:bg-[#090A0F]">
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

              {/* BUDGET SECTION: Total Budget & Max Unit Price with Live Sync */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start md:col-span-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between h-7">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 whitespace-nowrap">
                      <Coins className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0"/>
                      Бюджет партии *
                    </label>
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                      на всю партию
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={totalBudget}
                      onChange={handleBudgetChange}
                      placeholder="Например: 24000"
                      className="w-full h-11 px-3.5 pr-12 rounded-xl bg-white dark:bg-[#11131A] border border-zinc-300 dark:border-zinc-800 font-mono text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">сом</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between h-7">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 whitespace-nowrap">
                      <Tag className="w-3.5 h-3.5 text-zinc-400 shrink-0"/>
                      Цена за 1 шт
                    </label>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded whitespace-nowrap">
                      авторасчет
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={unitPrice}
                      onChange={handleUnitPriceChange}
                      placeholder="Например: 80"
                      className="w-full h-11 px-3.5 pr-12 rounded-xl bg-white dark:bg-[#11131A] border border-zinc-300 dark:border-zinc-800 font-mono text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">сом</span>
                  </div>
                </div>
              </div>

              {/* Deadline */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  Срок поставки
                </Label>
                <Select
                  value={String(deadlineDays)}
                  onValueChange={(val) => setDeadlineDays(parseInt(val, 10))}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                    <SelectItem value="3">Срочно (до 3 дней)</SelectItem>
                    <SelectItem value="7">Стандартно (до 7 дней)</SelectItem>
                    <SelectItem value="14">До 14 дней (2 недели)</SelectItem>
                    <SelectItem value="30">Плановая закупка (до 30 дней)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Live Calculation Banner */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#090A0F] border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
              <div className="space-y-1">
                <div className="font-mono text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm">
                  Партия: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{numQty.toLocaleString("ru-RU")}</span> {unit} • Доставка: <span className="text-zinc-700 dark:text-zinc-300">{city}</span> • Срок: <span className="text-zinc-700 dark:text-zinc-300 font-mono">до {deadlineDays} дн.</span>
                </div>
                {specs && (
                  <div className="text-xs font-mono text-zinc-500">
                    Спецификация: {specs}
                  </div>
                )}
              </div>
              {estimatedTotal !== null && (
                <div className="text-left sm:text-right sm:border-l sm:border-zinc-200 dark:sm:border-zinc-800 sm:pl-4">
                  <div className="text-xs text-zinc-500 font-mono">Общий бюджет закупки:</div>
                  <div className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">
                    до {Math.round(estimatedTotal).toLocaleString("ru-RU")} сом
                  </div>
                </div>
              )}
            </div>

            {/* TWO-STEP FLOW: Real Supplier Search Results */}
            {hasSearched ? (
              <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Прямые совпадения в базе поставщиков ({suppliers.length})
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Шаг 2 из 2
                  </span>
                </div>

                {suppliers.length > 0 ? (
                  <div className="space-y-3">
                    {suppliers.map((s) => {
                      const isProduct = s.source === "supplier_product"
                      return (
                        <div
                          key={s.id}
                          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-zinc-900 dark:text-white text-base">
                                  {isProduct ? s.title : s.name}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                  <ShieldCheck className="w-3 h-3" />
                                  {s.name}
                                </span>
                              </div>

                              <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 font-mono">
                                <span>{s.city}</span>
                                {s.specs && (
                                  <>
                                    <span>•</span>
                                    <span className="text-zinc-700 dark:text-zinc-300">{s.specs}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Direct Order Button */}
                            {s.supplierId && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={contactingId === s.supplierId}
                                onClick={() => handleDirectOrder(s.supplierId!, s.title || s.name)}
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shrink-0 cursor-pointer"
                              >
                                {contactingId === s.supplierId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <MessageSquare className="w-3.5 h-3.5" />
                                )}
                                <span>Заказать у этого поставщика (Открыть чат)</span>
                              </Button>
                            )}
                          </div>

                          {/* Price & MOQ calculation if supplier_product */}
                          {isProduct && (
                            <div className="p-3 rounded-lg bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                              <div>
                                <span className="text-zinc-500">Цена за ед: </span>
                                <span className="text-zinc-900 dark:text-white font-bold">{s.unitPrice} сом/{s.unit || "шт"}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500">Мин. заказ (MOQ): </span>
                                <span className={s.fitsMoq ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-amber-600 dark:text-amber-400 font-semibold"}>
                                  от {s.moq} {s.unit || "шт"}
                                </span>
                              </div>
                              <div>
                                <span className="text-zinc-500">Доставка: </span>
                                <span className="text-zinc-900 dark:text-white">{s.deliveryCost ? `${s.deliveryCost} сом` : "Бесплатно"}</span>
                              </div>
                              <div className="border-l border-zinc-200 dark:border-zinc-800 pl-3">
                                <span className="text-zinc-500 dark:text-zinc-400">Итого под ваш объем: </span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                                  {s.totalCost ? `${s.totalCost.toLocaleString("ru-RU")} сом` : "—"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* 100% Truthful Zero-Match State (NO FAKES) */
                  <div className="p-4 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 space-y-1.5">
                    <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Прямых прайсов по этим параметрам в базе поставщиков пока нет</span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-xs">
                      Опубликуйте RFQ-запрос — он сразу уйдет в Telegram-канал оптовиков и на Биржу заказов, чтобы поставщики прислали индивидуальные коммерческие предложения.
                    </p>
                  </div>
                )}

                {/* Explicit Publish RFQ Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 shadow-lg shadow-emerald-950/20 dark:shadow-emerald-950/40 gap-2 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Публикация запроса на бирже...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Опубликовать запрос на бирже RFQ</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                <Button
                  type="button"
                  onClick={() => handleFindSuppliers()}
                  disabled={isSearchingSuppliers || isParsing}
                  className="w-full h-12 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 shadow-lg shadow-emerald-950/20 dark:shadow-emerald-950/40 gap-2 transition-all cursor-pointer"
                >
                  {isSearchingSuppliers || isParsing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Поиск поставщиков...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Подобрать поставщиков и рассчитать</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {createdRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 text-center shadow-2xl relative">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                Запрос успешно опубликован!
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Тендер размещен на Бирже BazaarOS и отправлен в Telegram-канал оптовиков. Вы получите уведомления, как только поступят первые КП.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button asChild className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 font-bold gap-2">
                <Link href={`/requests/${createdRequestId}`}>
                  <span>Перейти к заявке</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full h-11 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold gap-2">
                <a href="https://t.me/bazaaros_orders_test" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Посмотреть публикацию в канале</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
