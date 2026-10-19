"use client"

import { useState, useTransition } from "react"
import { SupplierProduct } from "@bazargo/shared"
import { BAZAAR_B2B_CATEGORIES } from "@/lib/categories"
import { addSupplierProduct, deleteSupplierProduct } from "@/app/actions/b2b"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  PackagePlus,
  Trash2,
  Boxes,
  Truck,
  Clock,
  MapPin,
  CheckCircle2,
  Plus,
  ChevronDown,
  ChevronUp,
  Coins,
  Send
} from "lucide-react"

interface SupplierProductsManagerProps {
  initialProducts: SupplierProduct[]
  companyName?: string
  defaultCity?: string
  defaultPhone?: string
  defaultTelegram?: string
}

export function SupplierProductsManager({
  initialProducts,
  companyName,
  defaultCity = "Бишкек",
  defaultPhone = "",
  defaultTelegram = ""
}: SupplierProductsManagerProps) {
  const [products, setProducts] = useState<SupplierProduct[]>(initialProducts)
  const [isOpenForm, setIsOpenForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form states
  const [title, setTitle] = useState("")
  const [categoryTag, setCategoryTag] = useState<string>("packaging")
  const [specs, setSpecs] = useState("")
  const [unit, setUnit] = useState("шт")
  const [unitPrice, setUnitPrice] = useState("")
  const [moq, setMoq] = useState("500")
  const [deliveryCost, setDeliveryCost] = useState("0")
  const [leadTimeDays, setLeadTimeDays] = useState("3")
  const [city, setCity] = useState(defaultCity)
  const [phone, setPhone] = useState(defaultPhone)
  const [telegramUsername, setTelegramUsername] = useState(defaultTelegram)

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error("Укажите наименование товара")
      return
    }
    const price = Number(unitPrice)
    if (!price || price <= 0) {
      toast.error("Укажите корректную оптовую цену за единицу")
      return
    }

    startTransition(async () => {
      const res = await addSupplierProduct({
        title: title.trim(),
        category_tag: categoryTag,
        specs: specs.trim() || undefined,
        unit: unit.trim() || "шт",
        unit_price: price,
        moq: Number(moq) || 1,
        delivery_cost: Number(deliveryCost) || 0,
        lead_time_days: Number(leadTimeDays) || 3,
        city: city.trim() || "Бишкек",
        phone: phone.trim() || undefined,
        telegram_username: telegramUsername.trim() || undefined,
        company_name: companyName
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Товар успешно добавлен в оптовый прайс-лист")
        // Create optimistic entry
        const newProduct: SupplierProduct = {
          id: `temp-${Date.now()}`,
          supplier_id: "me",
          company_name: companyName || "Моя компания",
          title: title.trim(),
          category_tag: categoryTag,
          specs: specs.trim() || null,
          unit: unit.trim() || "шт",
          unit_price: price,
          moq: Number(moq) || 1,
          delivery_cost: Number(deliveryCost) || 0,
          lead_time_days: Number(leadTimeDays) || 3,
          city: city.trim() || "Бишкек",
          phone: phone.trim() || null,
          telegram_username: telegramUsername.trim() || null,
          in_stock: true,
          created_at: new Date().toISOString()
        }
        setProducts(prev => [newProduct, ...prev])
        setTitle("")
        setSpecs("")
        setUnitPrice("")
        setIsOpenForm(false)
      }
    })
  }

  const handleDelete = (id: string) => {
    setDeletingId(id)
    startTransition(async () => {
      const res = await deleteSupplierProduct(id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Товар удален из каталога")
        setProducts(prev => prev.filter(p => p.id !== id))
      }
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Мой оптовый прайс-лист (Товары в наличии)
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
            Позиции из прайс-листа автоматически предлагаются заказчикам в AI-подборе при создании RFQ и доступны для мгновенного заказа в 1 клик.
          </p>
        </div>

        <Button
          onClick={() => setIsOpenForm(!isOpenForm)}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          {isOpenForm ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Свернуть форму</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Добавить оптовый товар</span>
            </>
          )}
        </Button>
      </div>

      {/* Add Product Form */}
      {isOpenForm && (
        <form onSubmit={handleAddProduct} className="p-6 rounded-2xl bg-zinc-50 dark:bg-[#141722] border border-emerald-500/30 space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Новая товарная позиция в прайс-лист</span>
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              Компания: {companyName || "Ваша организация"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300">
                Наименование товара <span className="text-red-500">*</span>
              </Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Например: Стаканы двухслойные крафт 250 мл"
                className="bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm rounded-xl focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300">Оптовая категория</Label>
              <select
                value={categoryTag}
                onChange={e => setCategoryTag(e.target.value)}
                className="w-full bg-white dark:bg-[#090A0F] border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm rounded-xl px-3 py-2 focus:border-emerald-500 outline-none"
              >
                {BAZAAR_B2B_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300">
                Характеристики / Размеры / Плотность
              </Label>
              <Input
                value={specs}
                onChange={e => setSpecs(e.target.value)}
                placeholder="Диаметр 80 мм, 280 г/м², без крышки"
                className="bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm rounded-xl focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300">
                Оптовая цена за единицу (сом) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={unitPrice}
                onChange={e => setUnitPrice(e.target.value)}
                placeholder="4.50"
                className="bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-sm rounded-xl focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300">Единица измерения</Label>
              <Input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="шт, кг, упак, л"
                className="bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm rounded-xl focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300">
                Минимальная партия (MOQ)
              </Label>
              <Input
                type="number"
                min="1"
                value={moq}
                onChange={e => setMoq(e.target.value)}
                placeholder="500"
                className="bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-sm rounded-xl focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300">
                Стоимость доставки партии (сом)
              </Label>
              <Input
                type="number"
                min="0"
                value={deliveryCost}
                onChange={e => setDeliveryCost(e.target.value)}
                placeholder="0 (если включена)"
                className="bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-sm rounded-xl focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300">
                Срок отгрузки / готовности (дней)
              </Label>
              <Input
                type="number"
                min="1"
                value={leadTimeDays}
                onChange={e => setLeadTimeDays(e.target.value)}
                placeholder="3"
                className="bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-sm rounded-xl focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300">Город / Склад отгрузки</Label>
              <Input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Бишкек"
                className="bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm rounded-xl focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300">Контактный телефон</Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+996 555 123 456"
                className="bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm rounded-xl focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-700 dark:text-zinc-300">Telegram для заказов</Label>
              <Input
                value={telegramUsername}
                onChange={e => setTelegramUsername(e.target.value)}
                placeholder="@username или юзернейм"
                className="bg-white dark:bg-[#090A0F] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm rounded-xl focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpenForm(false)}
              className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#090A0F] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
            >
              {isPending ? "Сохранение..." : "Сохранить товар в прайс-лист"}
            </Button>
          </div>
        </form>
      )}

      {/* Products List */}
      {products.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
            <Boxes className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">В вашем прайс-листе пока нет товаров</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Добавьте ваши регулярные оптовые позиции (стаканы, упаковка, сиропы, текстиль), чтобы покупатели находили их в AI-поиске и заказывали напрямую.
          </p>
          <Button
            onClick={() => setIsOpenForm(true)}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs mt-2"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Добавить первую позицию
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map(product => {
            const cat = BAZAAR_B2B_CATEGORIES.find(c => c.id === product.category_tag)
            return (
              <div
                key={product.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm transition-colors space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono">
                      <span>{cat?.label || product.category_tag}</span>
                    </div>
                    <h4 className="text-base font-bold text-zinc-900 dark:text-white leading-snug">
                      {product.title}
                    </h4>
                    {product.specs && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {product.specs}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === product.id}
                    onClick={() => handleDelete(product.id)}
                    className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg p-2 h-auto cursor-pointer"
                    title="Удалить позицию"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 text-xs">
                  <div>
                    <div className="text-zinc-500 font-mono text-[11px]">Оптовая цена:</div>
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {product.unit_price} сом <span className="text-zinc-500 dark:text-zinc-400 font-sans font-normal">/ {product.unit}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-zinc-500 font-mono text-[11px]">Мин. партия (MOQ):</div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-white font-mono">
                      от {product.moq.toLocaleString("ru-RU")} {product.unit}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                    <Truck className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    <span>Доставка: {product.delivery_cost > 0 ? `${product.delivery_cost} сом` : "Бесплатно"}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                    <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    <span>Срок: {product.lead_time_days} дн.</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500 font-mono pt-2 border-t border-zinc-200 dark:border-zinc-800/50">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                    {product.city || "Бишкек"}
                  </span>
                  {product.telegram_username && (
                    <span className="text-blue-600 dark:text-blue-400 font-sans">
                      @{product.telegram_username}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
