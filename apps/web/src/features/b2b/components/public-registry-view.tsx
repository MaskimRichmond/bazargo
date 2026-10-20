"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SupplierProduct } from "@bazargo/shared"
import { BAZAAR_B2B_CATEGORIES } from "@/lib/categories"
import { contactSupplierDirect } from "@/app/actions/requests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  SlidersHorizontal,
  ExternalLink,
  Store,
  Layers
} from "lucide-react"

interface PublicRegistryViewProps {
  initialProducts: SupplierProduct[]
  initialSuppliers: any[]
}

export function PublicRegistryView({
  initialProducts,
  initialSuppliers
}: PublicRegistryViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"products" | "suppliers">("products")
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedCity, setSelectedCity] = useState<string>("all")
  const [contactingId, setContactingId] = useState<string | null>(null)

  // Filter products
  const filteredProducts = initialProducts.filter(item => {
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

  // Filter suppliers
  const filteredSuppliers = initialSuppliers.filter(sup => {
    if (selectedCategory !== "all" && sup.categories && !sup.categories.includes(selectedCategory)) {
      return false
    }
    if (selectedCity !== "all" && sup.city && !sup.city.toLowerCase().includes(selectedCity.toLowerCase())) {
      return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      const inComp = sup.company_name?.toLowerCase().includes(q)
      const inDesc = sup.description?.toLowerCase().includes(q)
      if (!inComp && !inDesc) return false
    }
    return true
  })

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

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Реестр поставщиков и оптовых прайс-листов</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Прямой доступ к производителям и оптовым складам Кыргызстана. Заказывайте партии напрямую без посредников.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-[#090A0F] p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 self-start md:self-auto">
            <button
              onClick={() => setActiveTab("products")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "products"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Товары в наличии ({initialProducts.length})
            </button>
            <button
              onClick={() => setActiveTab("suppliers")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "suppliers"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Компании ({initialSuppliers.length})
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию, характеристикам или компании..."
              className="pl-9 bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs rounded-xl focus:border-emerald-500"
            />
          </div>

          <div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full bg-white dark:bg-[#090A0F] border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2.5 focus:border-emerald-500">
                <SelectValue placeholder="Все категории" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs">
                <SelectItem value="all">Все категории ({BAZAAR_B2B_CATEGORIES.length})</SelectItem>
                {BAZAAR_B2B_CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-full bg-white dark:bg-[#090A0F] border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs rounded-xl px-3 py-2.5 focus:border-emerald-500">
                <SelectValue placeholder="Все города" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs">
                <SelectItem value="all">Все города</SelectItem>
                <SelectItem value="Бишкек">Бишкек</SelectItem>
                <SelectItem value="Ош">Ош</SelectItem>
                <SelectItem value="Чуйская область">Чуйская область</SelectItem>
                <SelectItem value="Джалал-Абад">Джалал-Абад</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

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
                  В реестре пока нет оптовых товаров
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Зарегистрируйтесь как поставщик или авторизуйтесь, чтобы добавить первый оптовый прайс-лист в базу BazaarOS.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs">
                  <Link href="/b2b/become-supplier">
                    <span>Пройти аккредитацию поставщика</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs">
                  <Link href="/requests/create">
                    <span>Создать запрос котировок (RFQ)</span>
                  </Link>
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
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 truncate">
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
                          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
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

      {/* Tab: Registered Suppliers */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          {filteredSuppliers.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 text-center space-y-3 shadow-sm">
              <Building2 className="w-10 h-10 text-zinc-400 dark:text-zinc-500 mx-auto" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Поставщики не найдены</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                Попробуйте изменить параметры поиска или зарегистрируйтесь первым в своей категории.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map(sup => {
                const isContacting = contactingId === sup.user_id
                const isApproved = sup.status === "APPROVED"

                return (
                  <div
                    key={sup.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-mono">
                          <MapPin className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                          {sup.city || "Бишкек"}
                        </span>
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            Аккредитован
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            <Clock className="w-3 h-3 text-amber-500" />
                            На модерации
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                        {sup.company_name}
                      </h4>

                      {sup.categories && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Категории: <span className="text-zinc-700 dark:text-zinc-300">{sup.categories}</span>
                        </p>
                      )}

                      {sup.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                          {sup.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center gap-2">
                      <Button
                        onClick={() => handleContactSupplier(sup.user_id)}
                        disabled={isContacting}
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                        <span>{isContacting ? "Открытие..." : "Связаться с отделом продаж"}</span>
                      </Button>

                      {sup.telegram_username && (
                        <Button
                          asChild
                          variant="outline"
                          className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] text-blue-600 dark:text-blue-400 hover:text-white hover:bg-blue-600 text-xs px-2.5 h-9"
                          title={`Написать в Telegram @${sup.telegram_username}`}
                        >
                          <a
                            href={`https://t.me/${sup.telegram_username.replace(/^@/, '')}`}
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
    </div>
  )
}
