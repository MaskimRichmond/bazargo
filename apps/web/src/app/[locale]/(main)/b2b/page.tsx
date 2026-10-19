import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getPublicRegistry } from "@/app/actions/b2b"
import { SupplierProduct } from "@bazargo/shared"
import { Button } from "@/components/ui/button"
import { BazaarIcon } from "@/components/shared/bazaar-logo"
import { SupplierProductsManager } from "@/features/b2b/components/supplier-products-manager"
import { PublicRegistryView } from "@/features/b2b/components/public-registry-view"
import { 
  Building2, 
  Send, 
  Layers, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Coins, 
  Boxes, 
  FileText,
  AlertCircle,
  Plus
} from "lucide-react"

export const metadata = {
  title: "Кабинет поставщика и Реестр прайс-листов | BazaarOS B2B",
  description: "BazaarOS для поставщиков и оптовых производителей. Прямой реестр оптовых товаров и заказы бизнеса без посредников."
}

export default async function B2bSupplierCabinetPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // 1. Count active open RFQs
  const { count: openRfqsCount } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "OPEN")

  // 2. Fetch user's submitted offers, supplier status & products
  let myOffers: any[] = []
  let b2bApp: any = null
  let myProducts: SupplierProduct[] = []

  if (session) {
    const [offersRes, appRes, productsRes] = await Promise.all([
      supabase
        .from("request_offers")
        .select(`
          id,
          unit_price,
          offered_quantity,
          delivery_cost,
          total_cost,
          lead_time_days,
          status,
          created_at,
          requests (
            id,
            title,
            city,
            quantity,
            unit
          )
        `)
        .eq("seller_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("b2b_applications")
        .select("id, company_name, city, phone, telegram_username, status, categories, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("supplier_products")
        .select("*")
        .eq("supplier_id", session.user.id)
        .order("created_at", { ascending: false })
    ])

    myOffers = offersRes.data || []
    b2bApp = appRes.data || null
    myProducts = (productsRes.data as SupplierProduct[]) || []
  }

  const publicRegistry = await getPublicRegistry()

  const isVerifiedSupplier = b2bApp?.status === "APPROVED"
  const isPendingSupplier = b2bApp?.status === "PENDING"

  return (
    <div className="container mx-auto px-4 py-8 md:py-14 max-w-6xl space-y-12">
      {/* Top Banner */}
      <div className="rounded-3xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 p-6 md:p-10 relative overflow-hidden shadow-sm">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <BazaarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>BazaarOS • Для поставщиков и производств</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Кабинет поставщика BazaarOS
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base leading-relaxed">
            Получайте прямые коммерческие запросы от кофеен, ресторанов, фабрик и ритейла Кыргызстана. Выставляйте КП в 3 клика или загружайте оптовый прайс-лист для мгновенных заказов.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
            <Link href="/requests">
              <span>Смотреть открытые RFQ-запросы</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
          {!isVerifiedSupplier && (
            <Button asChild variant="outline" className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Link href="/b2b/become-supplier">
                {isPendingSupplier ? "Статус заявки поставщика" : "Пройти аккредитацию поставщика"}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-mono">
            <span>ОТКРЫТЫЕ RFQ НА БИРЖЕ</span>
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono">
            {openRfqsCount ?? 0}
          </div>
          <p className="text-xs text-zinc-500">
            Готовые заявки от бизнеса, ожидающие предложений
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-mono">
            <span>ВАШИ ПОДАННЫЕ КП</span>
            <Send className="w-4 h-4 text-emerald-600 dark:text-primary" />
          </div>
          <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono">
            {myOffers.length}
          </div>
          <p className="text-xs text-zinc-500">
            Коммерческие расчеты, отправленные заказчикам
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-mono">
            <span>СТАТУС АККРЕДИТАЦИИ</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg font-bold">
            {isVerifiedSupplier ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" />
                Верифицирован
              </span>
            ) : isPendingSupplier ? (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Clock className="w-5 h-5" />
                На модерации
              </span>
            ) : (
              <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                Базовый аккаунт
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            {isVerifiedSupplier ? "Максимальный приоритет в AI-сравнении" : "Верификация повышает доверие заказчиков"}
          </p>
        </div>
      </div>

      {/* Supplier's Own Price-list Management (If logged in) */}
      {session ? (
        <SupplierProductsManager
          initialProducts={myProducts}
          companyName={b2bApp?.company_name}
          defaultCity={b2bApp?.city}
          defaultPhone={b2bApp?.phone}
          defaultTelegram={b2bApp?.telegram_username}
        />
      ) : (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Управление оптовым прайс-листом</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl">
              Войдите в аккаунт поставщика, чтобы добавлять оптовые товары в каталог BazaarOS для автоматического подбора в AI-закупках.
            </p>
          </div>
          <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs whitespace-nowrap">
            <Link href="/auth/login">Войти в аккаунт</Link>
          </Button>
        </div>
      )}

      {/* Public Registry of Wholesale Products & Suppliers */}
      <PublicRegistryView
        initialProducts={publicRegistry.products}
        initialSuppliers={publicRegistry.suppliers}
      />

      {/* Advantages of BazaarOS RFQ Model */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Преимущества работы по модели RFQ</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-2.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              01
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Горячие заявки без рекламы</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Не нужно тратить бюджет на контекстную рекламу или менеджеров по холодным продажам. Заказчики сами публикуют точные спецификации партий.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-2.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
              02
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Быстрый расчет КП в 3 поля</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Укажите цену за единицу, минимальную партию (MOQ) и стоимость доставки. Алгоритм рассчитывает и презентует полную математику заказчику.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-2.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              03
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Мгновенные алерты в Telegram</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Подключите Telegram и получайте уведомления о новых тендерах по вашей специализации (упаковка, стаканы, сиропы, кофе) в первую минуту.
            </p>
          </div>
        </div>
      </div>

      {/* Submitted Quotes Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Ваши поданные коммерческие предложения ({myOffers.length})</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Статусы согласования и прямые ссылки на сделки
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white">
            <Link href="/requests">Подать новое КП</Link>
          </Button>
        </div>

        {myOffers.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Вы еще не отправляли КП</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              Перейдите в открытую биржу коммерческих запросов, чтобы предложить оптовую цену заказчикам.
            </p>
            <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs mt-2">
              <Link href="/requests">Перейти к открытым запросам</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {myOffers.map((offer: any) => {
              const req = offer.requests
              const isAccepted = offer.status === "ACCEPTED"
              const isPending = offer.status === "PENDING"
              const total = offer.total_cost || ((offer.unit_price || 0) * (offer.offered_quantity || 1) + (offer.delivery_cost || 0))

              return (
                <div 
                  key={offer.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isAccepted
                      ? "bg-emerald-500/10 border-emerald-500/40"
                      : "bg-white dark:bg-[#11131A] border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {isAccepted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white px-2.5 py-0.5 rounded-full bg-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Принято заказчиком
                          </span>
                        ) : isPending ? (
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                            На рассмотрении
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                            {offer.status}
                          </span>
                        )}
                        <span className="text-xs text-zinc-500 font-mono">
                          {new Date(offer.created_at).toLocaleDateString("ru-RU")}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-zinc-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                        <Link href={`/requests/${req?.id || ""}`}>
                          {req?.title || "Запрос на закупку"}
                        </Link>
                      </h3>

                      <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-3 font-mono">
                        <span>Город: <strong className="text-zinc-800 dark:text-zinc-200">{req?.city || "Бишкек"}</strong></span>
                        <span>•</span>
                        <span>Партия: <strong className="text-zinc-800 dark:text-zinc-200">{offer.offered_quantity} {req?.unit || "шт"}</strong></span>
                        <span>•</span>
                        <span>Срок: <strong className="text-zinc-800 dark:text-zinc-200">{offer.lead_time_days} дн.</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200 dark:border-zinc-800">
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-zinc-500 font-mono">Сумма КП:</div>
                        <div className="text-lg font-black text-zinc-900 dark:text-white font-mono">
                          {total.toLocaleString("ru-RU")} <span className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">сом</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          ({offer.unit_price} сом/{req?.unit || "шт"})
                        </div>
                      </div>

                      <Button asChild variant="outline" size="sm" className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white">
                        <Link href={`/requests/${req?.id || ""}`}>
                          <span>Перейти</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
