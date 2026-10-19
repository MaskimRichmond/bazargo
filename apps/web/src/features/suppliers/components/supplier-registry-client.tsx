"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SupplierProduct } from "@bazargo/shared"
import { SupplierProfile, KYRGYZ_CITIES, CompanyType } from "@/types/supplier"
import { BAZAAR_B2B_CATEGORIES } from "@/lib/categories"
import { contactSupplierDirect } from "@/app/actions/requests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Search,
  Building2,
  Boxes,
  Truck,
  Clock,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  Phone,
  Store,
  Factory,
  UserCheck,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  ExternalLink,
  Briefcase
} from "lucide-react"

interface SupplierRegistryClientProps {
  initialProducts: SupplierProduct[]
  initialSuppliers: SupplierProfile[]
}

export function SupplierRegistryClient({
  initialProducts,
  initialSuppliers
}: SupplierRegistryClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"suppliers" | "products">("suppliers")
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedCity, setSelectedCity] = useState<string>("all")
  const [selectedLegalType, setSelectedLegalType] = useState<string>("all")
  const [contactingId, setContactingId] = useState<string | null>(null)

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return initialSuppliers.filter(sup => {
      if (selectedLegalType !== "all" && sup.companyType !== selectedLegalType) {
        return false
      }
      if (selectedCity !== "all" && sup.city && !sup.city.toLowerCase().includes(selectedCity.toLowerCase())) {
        return false
      }
      if (selectedCategory !== "all") {
        const catStr = Array.isArray(sup.categories) ? sup.categories.join(" ") : (sup.categories || sup.categoryTag || "")
        if (!catStr.toLowerCase().includes(selectedCategory.toLowerCase())) {
          return false
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const inComp = sup.companyName?.toLowerCase().includes(q)
        const inDesc = sup.description?.toLowerCase().includes(q)
        const inDirector = sup.directorName?.toLowerCase().includes(q)
        const inInn = sup.inn?.includes(q)
        if (!inComp && !inDesc && !inDirector && !inInn) return false
      }
      return true
    })
  }, [initialSuppliers, selectedLegalType, selectedCity, selectedCategory, search])

  // Filter products
  const filteredProducts = useMemo(() => {
    return initialProducts.filter(item => {
      if (selectedCategory !== "all" && item.category_tag !== selectedCategory) {
        return false
      }
      if (selectedCity !== "all" && item.city && !item.city.toLowerCase().includes(selectedCity.toLowerCase())) {
        return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const inTitle = item.title?.toLowerCase().includes(q)
        const inSpecs = item.specs?.toLowerCase().includes(q)
        const inComp = item.company_name?.toLowerCase().includes(q)
        if (!inTitle && !inSpecs && !inComp) return false
      }
      return true
    })
  }, [initialProducts, selectedCategory, selectedCity, search])

  const handleContactSupplier = async (supplierId: string, itemTitle?: string) => {
    if (!supplierId || supplierId === "me") {
      toast.error("Невозможно открыть чат с данным поставщиком")
      return
    }

    setContactingId(supplierId)
    try {
      const message = itemTitle
        ? `Здравствуйте! Интересует оптовая закупка позиции «${itemTitle}». Подскажите условия отгрузки.`
        : `Здравствуйте! Обращаюсь по вопросу оптовых поставок.`

      const res = await contactSupplierDirect({
        supplierId,
        message
      })

      if (res.error) {
        toast.error(res.error)
      } else if (res.chatId) {
        toast.success("Чат открыт")
        router.push(`/messages/${res.chatId}`)
      }
    } catch (err: any) {
      toast.error(err.message || "Ошибка соединения с поставщиком")
    } finally {
      setContactingId(null)
    }
  }

  const renderLegalBadge = (type: CompanyType) => {
    switch (type) {
      case "IP":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
            <UserCheck className="w-3 h-3" />
            <span>ИП</span>
          </span>
        )
      case "FACTORY":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
            <Factory className="w-3 h-3" />
            <span>Фабрика</span>
          </span>
        )
      case "LLC":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20">
            <Building2 className="w-3 h-3" />
            <span>ОсОО</span>
          </span>
        )
    }
  }

  const renderModerationBadge = (status: string) => {
    if (status === "VERIFIED") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>Верифицирован</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
        <Clock className="w-3 h-3 text-zinc-500" />
        <span>На модерации</span>
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Фильтры каталога и реестра</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Прямой поиск по зарегистрированным юридическим лицам, фабрикам и оптовым прайс-листам Кыргызстана.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-[#090A0F] p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 self-start md:self-auto">
            <button
              onClick={() => setActiveTab("suppliers")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "suppliers"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Компании ({filteredSuppliers.length})
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "products"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Товары в наличии ({filteredProducts.length})
            </button>
          </div>
        </div>

        {/* Custom B2B Filters (Radix UI Selects) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию, ИНН или директору..."
              className="pl-9 h-10 bg-white dark:bg-[#090A0F] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl hover:border-emerald-500/50 focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* 2. Category Select (Radix) */}
          <div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#090A0F] text-zinc-900 dark:text-zinc-100 px-3 py-2 text-xs hover:border-emerald-500/50 transition-colors">
                <SelectValue placeholder="Все категории" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs">
                <SelectItem value="all">Все категории ({BAZAAR_B2B_CATEGORIES.length})</SelectItem>
                {BAZAAR_B2B_CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. City Select (Radix) */}
          <div>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#090A0F] text-zinc-900 dark:text-zinc-100 px-3 py-2 text-xs hover:border-emerald-500/50 transition-colors">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  <SelectValue placeholder="Все города" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs">
                <SelectItem value="all">Все города</SelectItem>
                {KYRGYZ_CITIES.map(city => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Legal Entity Type Select (Radix) */}
          <div>
            <Select value={selectedLegalType} onValueChange={setSelectedLegalType}>
              <SelectTrigger className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#090A0F] text-zinc-900 dark:text-zinc-100 px-3 py-2 text-xs hover:border-emerald-500/50 transition-colors">
                <div className="flex items-center gap-1.5 truncate">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                  <SelectValue placeholder="Форма юрлица" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs">
                <SelectItem value="all">Все формы (ИП, ОсОО, Фабрики)</SelectItem>
                <SelectItem value="LLC">ОсОО (Юр. лица)</SelectItem>
                <SelectItem value="IP">ИП (Предприниматели)</SelectItem>
                <SelectItem value="FACTORY">Фабрики / Производства</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tab: Registered Suppliers (Companies) */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          {filteredSuppliers.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 text-center space-y-3 shadow-sm">
              <Building2 className="w-10 h-10 text-zinc-400 dark:text-zinc-500 mx-auto" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Поставщики по заданным фильтрам не найдены</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                Попробуйте сбросить параметры поиска или зарегистрируйтесь первым поставщиком в своей отрасли.
              </p>
              <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold mt-2">
                <Link href="/b2b/become-supplier">Пройти аккредитацию поставщика</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map(sup => {
                const isContacting = contactingId === sup.userId || contactingId === sup.id

                return (
                  <div
                    key={sup.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {renderLegalBadge(sup.companyType)}
                          {renderModerationBadge(sup.moderationStatus)}
                        </div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-mono">
                          <MapPin className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                          {sup.city || "Бишкек"}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-zinc-900 dark:text-white leading-snug">
                          {sup.companyName}
                        </h4>

                        {sup.inn && (
                          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                            <span className="text-zinc-400 dark:text-zinc-500 font-sans">ИНН:</span>
                            <strong className="text-zinc-700 dark:text-zinc-300">{sup.inn}</strong>
                          </div>
                        )}

                        {sup.directorName && (
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 flex items-center gap-1">
                            <span className="text-zinc-400">Руководитель:</span>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">{sup.directorName}</span>
                          </div>
                        )}
                      </div>

                      {sup.categories && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-1">
                          <span className="text-zinc-400">Специализация:</span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                            {Array.isArray(sup.categories) ? sup.categories.join(", ") : sup.categories}
                          </span>
                        </div>
                      )}

                      {sup.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {sup.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center gap-2">
                      <Button
                        onClick={() => handleContactSupplier(sup.userId || sup.id)}
                        disabled={isContacting}
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                        <span>{isContacting ? "Открытие..." : "Связаться с отделом продаж"}</span>
                      </Button>

                      {sup.telegramUsername && (
                        <Button
                          asChild
                          variant="outline"
                          className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] text-blue-600 dark:text-blue-400 hover:text-white hover:bg-blue-600 text-xs px-2.5 h-9"
                          title={`Написать в Telegram @${sup.telegramUsername}`}
                        >
                          <a
                            href={`https://t.me/${sup.telegramUsername.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Products in Stock */}
      {activeTab === "products" && (
        <div className="space-y-4">
          {filteredProducts.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                <Boxes className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Товары по заданным параметрам не найдены
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Попробуйте изменить категорию или город, либо создайте персональный RFQ-запрос под вашу спецификацию.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs">
                  <Link href="/requests/create">Создать закупку (AI)</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => {
                const cat = BAZAAR_B2B_CATEGORIES.find(c => c.id === product.category_tag)
                const isContacting = contactingId === product.supplier_id

                return (
                  <div
                    key={product.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 truncate">
                          {cat?.label || product.category_tag}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-mono">
                          <MapPin className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                          {product.city || "Бишкек"}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                          <span className="truncate">{product.company_name}</span>
                        </div>
                        <h4 className="text-base font-bold text-zinc-900 dark:text-white mt-1 leading-snug line-clamp-2">
                          {product.title}
                        </h4>
                        {product.specs && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {product.specs}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800/80">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-zinc-500 font-mono text-[11px]">Оптовая цена:</div>
                          <div className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
                            {product.unit_price} сом <span className="text-xs font-normal font-sans text-zinc-500 dark:text-zinc-400">/ {product.unit}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500 font-mono text-[11px]">Мин. партия (MOQ):</div>
                          <div className="text-sm font-bold text-zinc-900 dark:text-white font-mono">
                            от {product.moq.toLocaleString("ru-RU")} {product.unit}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-[#090A0F] p-2 rounded-xl border border-zinc-200 dark:border-zinc-800/60">
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                          {product.delivery_cost > 0 ? `${product.delivery_cost} сом` : "Доставка 0 сом"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                          {product.lead_time_days} дн. отгрузка
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => handleContactSupplier(product.supplier_id, product.title)}
                          disabled={isContacting}
                          className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                          <span>{isContacting ? "Открытие..." : "Заказать / Чат"}</span>
                        </Button>

                        {product.telegram_username && (
                          <Button
                            asChild
                            variant="outline"
                            className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] text-blue-600 dark:text-blue-400 hover:text-white hover:bg-blue-600 text-xs px-2.5 h-9"
                            title={`Написать в Telegram @${product.telegram_username}`}
                          >
                            <a
                              href={`https://t.me/${product.telegram_username.replace(/^@/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
