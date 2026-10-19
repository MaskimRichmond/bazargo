import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { BazaarHero } from "@/components/home/bazaar-hero"
import { Button } from "@/components/ui/button"
import { BazaarIcon } from "@/components/shared/bazaar-logo"
import { BAZAAR_B2B_CATEGORIES } from "@/lib/categories"
import { 
  Sparkles, 
  ArrowRight, 
  Boxes, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Building2, 
  Layers, 
  CheckCircle2, 
  FileText, 
  Send, 
  Coins, 
  Package, 
  Coffee, 
  CupSoda, 
  Flame, 
  Utensils, 
  Shirt, 
  Sparkle, 
  Printer, 
  Wrench 
} from "lucide-react"

export const metadata = {
  title: "BazaarOS — AI-снабженец для бизнеса в Кыргызстане | B2B Оптовые закупки",
  description: "AI-платформа B2B-закупок BazaarOS. Автоматический разбор потребностей, быстрые коммерческие предложения от поставщиков и расчет полной стоимости партии."
}

export default async function Home() {
  const supabase = await createClient()

  // Fetch real open RFQs from public.requests
  const { data: realRequests } = await supabase
    .from("requests")
    .select(`
      id,
      title,
      category_tag,
      specs,
      quantity,
      unit,
      total_budget,
      max_price,
      city,
      deadline_days,
      raw_ai_prompt,
      created_at
    `)
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(6)

  const requestsList = realRequests || []

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-[#090A0F] text-zinc-900 dark:text-zinc-100">
      {/* 1. Hero Section */}
      <BazaarHero />

      {/* 2. How BazaarOS Works (3 Steps) */}
      <section className="py-16 md:py-20 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-[#0C0E14]">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center space-y-3 mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <BazaarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Интеллектуальный процесс</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Как работает AI-снабжение в BazaarOS
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto">
              Мы убрали долгие согласования, прайс-листы в PDF и бесконечные звонки. Закупки работают так же просто, как переписка в чате.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Step 1 */}
            <div className="grid grid-rows-[auto_auto_1fr_auto] h-full p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800/80 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xl font-mono">
                1
              </div>
              <h3 className="text-lg font-bold min-h-[3.5rem] flex items-center text-zinc-900 dark:text-white">
                Свободный запрос через AI
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Напишите, что нужно вашему кафе, ресторану или производству. Наш AI-парсер мгновенно извлечет размеры, объем партии, бюджет и город.
              </p>
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                <span>Текст и спецификации</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid grid-rows-[auto_auto_1fr_auto] h-full p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800/80 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xl font-mono">
                2
              </div>
              <h3 className="text-lg font-bold min-h-[3.5rem] flex items-center text-zinc-900 dark:text-white">
                Точные КП от поставщиков
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Проверенные фабрики и дистрибьюторы Кыргызстана выставляют коммерческие предложения: цена за единицу, MOQ, срок и логистика.
              </p>
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                <span>Без скрытых наценок</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid grid-rows-[auto_auto_1fr_auto] h-full p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800/80 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xl font-mono">
                3
              </div>
              <h3 className="text-lg font-bold min-h-[3.5rem] flex items-center text-zinc-900 dark:text-white">
                AI-сравнение и заказ в&nbsp;1&nbsp;клик
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Алгоритм рассчитывает полную формулу стоимости с учетом доставки и выделяет лучшее предложение. Принимайте и переходите в прямой чат по заказу.
              </p>
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>Фиксация сделки</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Real RFQ Benchmark Section */}
      <section className="py-16 md:py-20 border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40 text-xs font-bold uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" />
                <span>Биржа коммерческих запросов</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Актуальные оптовые тендеры бизнеса
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Реальные потребности заведений и фабрик Кыргызстана с точными спецификациями
              </p>
            </div>

            <Button asChild variant="outline" className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-semibold gap-2 shadow-sm">
              <Link href="/requests">
                <span>Все запросы на бирже</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {requestsList.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Открытых заявок пока нет</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                  Опубликуйте первый запрос котировок (RFQ), чтобы поставщики и производства предложили лучшие оптовые цены.
                </p>
              </div>
              <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 font-bold text-xs">
                <Link href="/requests/create">Создать первый RFQ-запрос</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
              {requestsList.map((req: any) => {
                const cat = BAZAAR_B2B_CATEGORIES.find(c => c.id === req.category_tag)
                const totalBudget = req.total_budget
                const unitPrice = req.max_price

                return (
                  <div
                    key={req.id}
                    className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] p-6 hover:border-emerald-500/40 hover:shadow-md shadow-sm transition-all flex flex-col justify-between h-full"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40 uppercase tracking-wider truncate">
                          {cat?.label || req.category_tag || "Закупка"}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 shrink-0 ml-2 font-mono">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                          <span>{req.city || "Бишкек"}</span>
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-zinc-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {req.title}
                      </h3>

                      {req.specs && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {req.specs}
                        </p>
                      )}
                    </div>

                    {/* Bottom section (Quantity / Deadline / Budget / Action) */}
                    <div className="mt-auto pt-5 space-y-4">
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="flex items-center gap-1 text-zinc-800 dark:text-zinc-200 font-mono">
                          <Boxes className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                          <span>{req.quantity ? req.quantity.toLocaleString("ru-RU") : "1"} {req.unit || "шт"}</span>
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-mono">
                          <Clock className="w-4 h-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
                          <span>до {req.deadline_days || 7} дн.</span>
                        </span>
                      </div>

                      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] text-zinc-500 font-mono">Бюджет партии:</div>
                          {totalBudget ? (
                            <div className="text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono">
                              {totalBudget.toLocaleString("ru-RU")} сом
                            </div>
                          ) : unitPrice ? (
                            <div className="text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono">
                              до {unitPrice} сом/{req.unit || "шт"}
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">По предложению</div>
                          )}
                        </div>

                        <Button asChild size="sm" className="rounded-xl text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 cursor-pointer">
                          <Link href={`/requests/${req.id}`}>
                            <span>Предложить КП</span>
                            <ArrowRight className="w-3.5 h-3.5" />
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
      </section>

      {/* 4. Popular B2B Wholesale Categories */}
      <section className="py-16 md:py-20 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-[#0C0E14]">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Ключевые B2B-направления закупок
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm max-w-xl mx-auto">
              Прямой доступ к производителям упаковки, поставщикам сырья и расходников для заведений Кыргызстана
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/requests?category=packaging"
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] hover:border-emerald-500/40 hover:shadow-md shadow-sm transition-all text-center space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-zinc-900 dark:text-white">
                Упаковка и гофротара
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Коробки, крафт-пакеты, стрейч, скотч
              </p>
            </Link>

            <Link
              href="/requests?category=cups"
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] hover:border-emerald-500/40 hover:shadow-md shadow-sm transition-all text-center space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Coffee className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-zinc-900 dark:text-white">
                Посуда для кофеен
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Стаканы, крышки, трубочки, салфетки
              </p>
            </Link>

            <Link
              href="/requests?category=syrups"
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] hover:border-emerald-500/40 hover:shadow-md shadow-sm transition-all text-center space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <CupSoda className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-zinc-900 dark:text-white">
                Сиропы и топпинги
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Оптовые партии для баров и ресторанов
              </p>
            </Link>

            <Link
              href="/requests?category=food"
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] hover:border-emerald-500/40 hover:shadow-md shadow-sm transition-all text-center space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Utensils className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-zinc-900 dark:text-white">
                Продукты и ингредиенты
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Кофе в зернах, чай, молоко, сыры
              </p>
            </Link>

            <Link
              href="/requests?category=cleaning"
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] hover:border-emerald-500/40 hover:shadow-md shadow-sm transition-all text-center space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Sparkle className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-zinc-900 dark:text-white">
                Бытовая химия и клининг
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Профессиональная химия, перчатки, инвентарь
              </p>
            </Link>

            <Link
              href="/requests?category=textiles"
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] hover:border-emerald-500/40 hover:shadow-md shadow-sm transition-all text-center space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Shirt className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-zinc-900 dark:text-white">
                Текстиль и униформа
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Фартуки, белье, халаты, полотенца
              </p>
            </Link>

            <Link
              href="/requests?category=printing"
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] hover:border-emerald-500/40 hover:shadow-md shadow-sm transition-all text-center space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Printer className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-zinc-900 dark:text-white">
                Полиграфия и брендинг
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Печать на упаковке, стикеры, бирки
              </p>
            </Link>

            <Link
              href="/requests?category=equipment"
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] hover:border-emerald-500/40 hover:shadow-md shadow-sm transition-all text-center space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-zinc-900 dark:text-white">
                Оборудование
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Кофемашины, печи, запайщики, весы
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Supplier CTA Banner */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-emerald-50/50 via-zinc-50 to-white dark:from-zinc-900 dark:via-zinc-900/80 dark:to-zinc-950 p-8 md:p-12 shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" />
                <span>Для поставщиков и фабрик</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
                Поставляете товары для бизнеса в Кыргызстане?
              </h2>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm sm:text-base leading-relaxed">
                Подключайтесь к BazaarOS и получайте готовые оптовые заказы от кофеен, ресторанов, производств и магазинов без затрат на холодные продажи.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 font-bold px-7 shadow-md cursor-pointer"
                >
                  <Link href="/b2b/become-supplier">
                    Стать поставщиком BazaarOS
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 dark:border-zinc-800 dark:bg-[#090A0F] dark:hover:bg-zinc-800 dark:text-zinc-300 dark:hover:text-white font-semibold"
                >
                  <Link href="/b2b">
                    Кабинет и реестр прайс-листов
                  </Link>
                </Button>
              </div>
            </div>

            {/* Decorative background icon */}
            <BazaarIcon className="absolute right-[-20px] bottom-[-20px] w-72 h-72 text-emerald-500/10 dark:text-emerald-500/5 pointer-events-none -z-0" />
          </div>
        </div>
      </section>
    </main>
  )
}
