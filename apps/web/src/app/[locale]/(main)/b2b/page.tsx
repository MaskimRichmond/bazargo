import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { SupplierProduct } from "@bazargo/shared"
import { CompanyType, ModerationStatus, validateKyrgyzInn } from "@/types/supplier"
import { Button } from "@/components/ui/button"
import { BazaarIcon } from "@/components/shared/bazaar-logo"
import { SupplierProductsManager } from "@/features/b2b/components/supplier-products-manager"
import { 
  Building2, 
  Send, 
  Layers, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Boxes, 
  FileText,
  AlertCircle,
  Plus,
  Store,
  UserCheck,
  Factory,
  Settings,
  Phone,
  Sparkles
} from "lucide-react"

export const metadata = {
  title: "Кабинет поставщика | BazaarOS B2B",
  description: "Рабочий кабинет оптового поставщика: управление оптовыми прайс-листами, поданными КП и аккредитацией юрлица в Кыргызстане."
}

export default async function B2bSupplierCabinetPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // 1. Count active open RFQs
  const { count: openRfqsCount } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "OPEN")

  // 2. Fetch user's submitted offers, supplier status & products if authenticated
  let myOffers: any[] = []
  let b2bApp: any = null
  let profile: any = null
  let myProducts: SupplierProduct[] = []

  if (session) {
    const [offersRes, appRes, productsRes, profileRes] = await Promise.all([
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
        .limit(20),
      supabase
        .from("b2b_applications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("supplier_products")
        .select("*")
        .eq("supplier_id", session.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle()
    ])

    myOffers = offersRes.data || []
    b2bApp = appRes.data || null
    myProducts = (productsRes.data as SupplierProduct[]) || []
    profile = profileRes.data || null
  }

  // Derive legal entity details
  const companyName = b2bApp?.company_name || profile?.company_name || profile?.full_name || "Оптовый поставщик"
  let companyType: CompanyType = (b2bApp?.company_type as CompanyType) || "LLC"
  if (!b2bApp?.company_type) {
    const lower = companyName.toLowerCase()
    if (lower.startsWith("ип ") || lower.includes("ип ")) companyType = "IP"
    else if (lower.includes("фабрик") || lower.includes("завод") || lower.includes("производств")) companyType = "FACTORY"
  }

  let inn = b2bApp?.inn || ""
  if (!inn && b2bApp?.description) {
    const match = b2bApp.description.match(/ИНН[:\s]+(\d{14})/)
    if (match) inn = match[1]
  }

  const isVerifiedSupplier = b2bApp?.status === "APPROVED"
  const isPendingSupplier = b2bApp?.status === "PENDING"
  const directorName = b2bApp?.director_name || b2bApp?.contact_name || profile?.full_name

  // If visitor is unauthenticated, show clean dedicated onboarding page
  if (!session) {
    return (
      <div className="container mx-auto px-4 py-10 md:py-16 max-w-5xl space-y-12">
        <div className="rounded-3xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 p-8 md:p-12 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <BazaarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>BazaarOS • Для поставщиков и оптовых производств</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Личный кабинет поставщика
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base leading-relaxed">
              Прямой канал оптовых продаж для производителей и дистрибьюторов Кыргызстана. Получайте коммерческие запросы от бизнеса, загружайте прайс-лист и участвуйте в AI-подборе без рекламных бюджетов.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
              <Link href="/auth/login">Войти в кабинет</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white">
              <Link href="/b2b/become-supplier">Подать заявку поставщика</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
              <Link href="/suppliers">
                <Store className="w-4 h-4 mr-1.5" />
                <span>Открыть публичный реестр</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-2.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
              01
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Горячие заявки бизнеса</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Кофейни, рестораны и ритейл публикуют реальные партии с бюджетом. Вы предлагаете КП напрямую заказчику.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-2.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold">
              02
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Каталог прайс-листов</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Загрузите оптовые товары один раз: алгоритм автоматически сопоставляет их с запросами покупателей при AI-парсинге.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-2.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold">
              03
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Оповещения в Telegram</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Получайте мгновенные уведомления о новых тендерах по вашей категории в Telegram и выставляйте счет в 3 клика.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated Supplier Workspace
  return (
    <div className="container mx-auto px-4 py-8 md:py-14 max-w-6xl space-y-10">
      {/* Supplier Profile Card */}
      <div className="rounded-3xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <BazaarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Кабинет поставщика BazaarOS</span>
              </span>

              {/* Legal Badge */}
              {companyType === "IP" ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>ИП</span>
                </span>
              ) : companyType === "FACTORY" ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                  <Factory className="w-3.5 h-3.5" />
                  <span>Фабрика</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>ОсОО</span>
                </span>
              )}

              {/* Moderation Badge */}
              {isVerifiedSupplier ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Верифицирован</span>
                </span>
              ) : isPendingSupplier ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>На модерации</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Базовый аккаунт</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              {companyName}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              {inn && (
                <span>
                  ИНН: <strong className="text-zinc-800 dark:text-zinc-200">{inn}</strong>
                </span>
              )}
              {directorName && (
                <span>
                  Руководитель: <strong className="text-zinc-800 dark:text-zinc-200">{directorName}</strong>
                </span>
              )}
              {b2bApp?.city && (
                <span>
                  Город: <strong className="text-zinc-800 dark:text-zinc-200">{b2bApp.city}</strong>
                </span>
              )}
              {b2bApp?.telegram_username && (
                <span className="text-blue-600 dark:text-blue-400">
                  TG: @{b2bApp.telegram_username.replace(/^@/, '')}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs">
              <Link href="/requests">
                <span>Смотреть открытые RFQ</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs">
              <Link href="/suppliers">
                <Store className="w-3.5 h-3.5 mr-1.5" />
                <span>Открыть реестр</span>
              </Link>
            </Button>
            {!isVerifiedSupplier && (
              <Button asChild variant="outline" className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs">
                <Link href="/b2b/become-supplier">
                  {isPendingSupplier ? "Статус аккредитации" : "Пройти аккредитацию"}
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#090A0F] border border-zinc-200 dark:border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-mono">
              <span>ОТКРЫТЫЕ RFQ НА БИРЖЕ</span>
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
              {openRfqsCount ?? 0}
            </div>
            <p className="text-[11px] text-zinc-500">
              Актуальные запросы партий от покупателей
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#090A0F] border border-zinc-200 dark:border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-mono">
              <span>ВАШИ ПОДАННЫЕ КП</span>
              <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
              {myOffers.length}
            </div>
            <p className="text-[11px] text-zinc-500">
              Коммерческие расчеты, направленные заказчикам
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#090A0F] border border-zinc-200 dark:border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-mono">
              <span>ТОВАРЫ В ПРАЙС-ЛИСТЕ</span>
              <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
              {myProducts.length}
            </div>
            <p className="text-[11px] text-zinc-500">
              Позиции в каталоге для AI-подбора
            </p>
          </div>
        </div>
      </div>

      {/* Supplier's Wholesale Price-list Management */}
      <SupplierProductsManager
        initialProducts={myProducts}
        companyName={companyName}
        defaultCity={b2bApp?.city || profile?.city || "Бишкек"}
        defaultPhone={b2bApp?.phone || profile?.phone || ""}
        defaultTelegram={b2bApp?.telegram_username || profile?.telegram_username || ""}
      />

      {/* Submitted Quotations Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Поданные коммерческие предложения ({myOffers.length})</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Статусы рассмотрения ваших оптовых расчетов заказчиками
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
