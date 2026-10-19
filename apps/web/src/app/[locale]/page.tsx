import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { BazaarHero } from "@/components/home/bazaar-hero"
import { Button } from "@/components/ui/button"
import { BazaarIcon } from "@/components/shared/bazaar-logo"
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
  Coins
} from "lucide-react"

export const metadata = {
  title: "BazaarOS — AI-снабженец для бизнеса в Кыргызстане | B2B Оптовые закупки",
  description: "AI-платформа B2B-закупок BazaarOS. Автоматический разбор потребностей, быстрые коммерческие предложения от поставщиков и расчет полной стоимости партии."
}

export default async function Home() {
  const supabase = await createClient()

  // Fetch recent open B2B RFQs
  const { data: liveRequests } = await supabase
    .from("requests")
    .select("id, title, specs, quantity, unit, max_price, budget_max, city, deadline_days, category_tag, created_at, status")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(6)

  const requests = liveRequests || []

  return (
    <main className="min-h-screen bg-background">
      {/* 1. Hero Section */}
      <BazaarHero />

      {/* 2. How BazaarOS Works (3 Steps) */}
      <section className="py-16 md:py-20 border-b bg-muted/20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center space-y-3 mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <BazaarIcon className="w-3.5 h-3.5 text-emerald-500" />
              Интеллектуальный процесс
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Как работает AI-снабжение в BazaarOS
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              Мы убрали долгие согласования, прайс-листы в PDF и бесконечные звонки. Закупки работают так же просто, как переписка в чате.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="relative rounded-3xl border bg-card p-6 md:p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl">
                1
              </div>
              <h3 className="text-lg font-bold">Свободный запрос через AI</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Напишите, что нужно вашему кафе, ресторану или производству. Наш AI-парсер мгновенно извлечет размеры, объем партии, бюджет и город.
              </p>
              <div className="pt-2">
                <span className="text-xs font-semibold text-primary">Поддерживает текст и характеристики →</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-3xl border bg-card p-6 md:p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xl">
                2
              </div>
              <h3 className="text-lg font-bold">Точные КП от поставщиков</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Проверенные фабрики и дистрибьюторы Кыргызстана выставляют коммерческие предложения: цена за единицу, MOQ, срок и логистика.
              </p>
              <div className="pt-2">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Без скрытых наценок →</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-3xl border bg-card p-6 md:p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xl">
                3
              </div>
              <h3 className="text-lg font-bold">AI-сравнение и заказ в 1 клик</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Алгоритм рассчитывает полную формулу стоимости с учетом доставки и выделяет лучшее предложение. Принимайте и переходите в чат по заказу.
              </p>
              <div className="pt-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Экономия до 30% бюджета →</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live RFQ Exchange Feed */}
      <section className="py-16 md:py-20 border-b">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" />
                Биржа коммерческих запросов
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Актуальные B2B-запросы бизнеса
              </h2>
              <p className="text-sm text-muted-foreground">
                Поставщики могут предложить оптовую цену прямо сейчас
              </p>
            </div>

            <Button asChild variant="outline" className="rounded-xl font-semibold gap-2">
              <Link href="/requests">
                <span>Все запросы на бирже</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {requests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((req: any) => {
                const maxPrice = req.max_price ?? req.budget_max
                return (
                  <div
                    key={req.id}
                    className="group rounded-3xl border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                          {req.category_tag || "Закупка"}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {req.city}
                        </span>
                      </div>

                      <h3 className="font-bold text-base md:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        <Link href={`/requests/${req.id}`}>{req.title}</Link>
                      </h3>

                      {req.specs && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          Спецификация: {req.specs}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs font-semibold pt-1">
                        <span className="flex items-center gap-1 text-foreground">
                          <Boxes className="w-4 h-4 text-primary" />
                          {req.quantity} {req.unit || "шт"}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          до {req.deadline_days || 7} дн.
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between gap-2">
                      <div>
                        {maxPrice ? (
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            до {maxPrice.toLocaleString("ru-RU")} сом/{req.unit || "шт"}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Цена договорная</div>
                        )}
                      </div>

                      <Button asChild size="sm" className="rounded-xl text-xs font-bold gap-1">
                        <Link href={`/requests/${req.id}`}>
                          <span>Предложить цену</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-3xl border bg-muted/20 space-y-4">
              <Boxes className="w-12 h-12 text-muted-foreground mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Будьте первым, кто создаст закупку</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Создайте запрос через AI, и проверенные поставщики подготовят коммерческие расчеты.
                </p>
              </div>
              <Button asChild className="rounded-xl font-bold">
                <Link href="/requests/create">Создать закупку через AI</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* 4. Popular B2B Categories */}
      <section className="py-16 md:py-20 border-b bg-muted/10">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ключевые B2B-направления закупок
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Прямой доступ к производителям упаковки, поставщикам сырья и расходников для заведений Кыргызстана
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/requests/create?prompt=300%20коробок%2030x20x15%20см%20в%20Бишкек"
              className="p-5 rounded-3xl border bg-card hover:border-primary/40 hover:shadow-md transition-all text-center space-y-2 group"
            >
              <div className="text-3xl mb-1">📦</div>
              <div className="font-bold text-sm sm:text-base group-hover:text-primary transition-colors">
                Упаковка и гофротара
              </div>
              <p className="text-xs text-muted-foreground">
                Коробки, крафт-пакеты, стрейч, скотч
              </p>
            </Link>

            <Link
              href="/requests/create?prompt=2000%20двухслойных%20стаканов%20350%20мл%20с%20крышками"
              className="p-5 rounded-3xl border bg-card hover:border-primary/40 hover:shadow-md transition-all text-center space-y-2 group"
            >
              <div className="text-3xl mb-1">☕</div>
              <div className="font-bold text-sm sm:text-base group-hover:text-primary transition-colors">
                Посуда для кофеен
              </div>
              <p className="text-xs text-muted-foreground">
                Стаканы, крышки, трубочки, салфетки
              </p>
            </Link>

            <Link
              href="/requests/create?prompt=50%20бутылок%20сиропа%20карамель%20и%20ваниль%201л"
              className="p-5 rounded-3xl border bg-card hover:border-primary/40 hover:shadow-md transition-all text-center space-y-2 group"
            >
              <div className="text-3xl mb-1">🥤</div>
              <div className="font-bold text-sm sm:text-base group-hover:text-primary transition-colors">
                Сиропы и топпинги
              </div>
              <p className="text-xs text-muted-foreground">
                Оптовые партии для баров и ресторанов
              </p>
            </Link>

            <Link
              href="/requests/create?prompt=100%20кг%20кофе%20в%20зернах%20арабика"
              className="p-5 rounded-3xl border bg-card hover:border-primary/40 hover:shadow-md transition-all text-center space-y-2 group"
            >
              <div className="text-3xl mb-1">🫘</div>
              <div className="font-bold text-sm sm:text-base group-hover:text-primary transition-colors">
                Кофе свежей обжарки
              </div>
              <p className="text-xs text-muted-foreground">
                Зерно оптом, купажи, арабика и робуста
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Supplier CTA Banner */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/95 to-emerald-700 text-primary-foreground p-8 md:p-12 shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                <Building2 className="w-3.5 h-3.5" />
                Для поставщиков и фабрик
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Поставляете товары для бизнеса в Кыргызстане?
              </h2>
              <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                Подключайтесь к BazaarOS и получайте готовые оптовые заказы от кофеен, ресторанов, производств и магазинов без затрат на холодные продажи.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-2xl bg-white text-primary hover:bg-white/90 font-bold px-7 shadow-md"
                >
                  <Link href="/b2b/become-supplier">
                    Стать поставщиком BazaarOS
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-2xl border-white/30 text-white hover:bg-white/10 font-semibold"
                >
                  <Link href="/requests">
                    Смотреть открытые заявки
                  </Link>
                </Button>
              </div>
            </div>

            {/* Decorative background icon */}
            <BazaarIcon className="absolute right-[-20px] bottom-[-20px] w-72 h-72 text-white/10 pointer-events-none -z-0" />
          </div>
        </div>
      </section>
    </main>
  )
}
