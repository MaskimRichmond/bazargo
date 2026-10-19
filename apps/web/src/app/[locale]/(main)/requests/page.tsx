import Link from "next/link"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { 
  PackageSearch, 
  Clock, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  Boxes, 
  CheckCircle2, 
  Send
} from "lucide-react"
import { RequestsFiltersWidget } from "@/features/requests/components/requests-filters-widget"
import { RequestsSortWidget } from "@/features/requests/components/requests-sort-widget"

export const metadata = {
  title: "Биржа оптовых B2B-заказов (RFQ) | BazaarOS",
  description: "Актуальные запросы на снабжение от кофеен, магазинов и предприятий Кыргызстана. Отправляйте коммерческие предложения напрямую закупщикам."
}

const CATEGORY_MAP: Record<string, string> = {
  packaging: "Упаковка и тара",
  cups: "Стаканы и посуда",
  syrups: "Сиропы и бар",
  food: "Продукты HoReCa",
  cleaning: "Хозтовары и химия",
  textiles: "Текстиль и форма",
  printing: "Полиграфия",
  equipment: "Оборудование",
  coffee: "Кофе и чай",
  other: "Оптовые товары"
}

function getRussianPlural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 19) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

async function RequestsList({ 
  searchParams, 
  categories,
  currentUserId 
}: { 
  searchParams: { [key: string]: string | undefined }
  categories: { id: string, name: string, slug: string, parent_id?: string | null }[]
  currentUserId?: string | null
}) {
  const supabase = await createClient()

  let query = supabase
    .from("requests")
    .select("*", { count: "exact" })
    
  // Status Filter
  const status = searchParams.status || "OPEN"
  if (status === "OPEN") {
    query = query.eq("status", "OPEN")
  } else if (status === "CLOSED") {
    query = query.eq("status", "CLOSED")
  }

  // Category Filter
  if (searchParams.category && searchParams.category !== "all") {
    const targetCat = categories.find(c => c.slug === searchParams.category)
    if (targetCat) {
      const children = categories.filter(c => c.parent_id === targetCat.id)
      const targetIds = [targetCat.id, ...children.map(c => c.id)]
      query = query.or(`category_id.in.(${targetIds.join(',')}),category_tag.eq.${searchParams.category}`)
    } else {
      query = query.eq("category_tag", searchParams.category)
    }
  }

  // City Filter
  if (searchParams.city && searchParams.city !== "all") {
    query = query.ilike("city", `%${searchParams.city}%`)
  } else if (searchParams.region && searchParams.region !== "all") {
    query = query.eq("region", searchParams.region)
  }

  // Min Quantity Filter
  if (searchParams.minQty) {
    const minQ = parseInt(searchParams.minQty, 10)
    if (!isNaN(minQ)) {
      query = query.gte("quantity", minQ)
    }
  }

  // Search Query
  if (searchParams.q) {
    const q = searchParams.q.replace(/,/g, ' ').trim()
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,specs.ilike.%${q}%`)
  }

  // Total Budget Filters
  if (searchParams.budgetMin) {
    const minVal = parseFloat(searchParams.budgetMin)
    query = query.or(`total_budget.gte.${minVal},budget.gte.${minVal},max_price.gte.${minVal}`)
  }
  if (searchParams.budgetMax) {
    const maxVal = parseFloat(searchParams.budgetMax)
    query = query.or(`total_budget.lte.${maxVal},budget.lte.${maxVal},max_price.lte.${maxVal}`)
  }

  // Sorting
  const sort = searchParams.sort || "newest"
  if (sort === "newest") query = query.order("created_at", { ascending: false })
  else if (sort === "oldest") query = query.order("created_at", { ascending: true })
  else if (sort === "budget_desc") query = query.order("max_price", { ascending: false, nullsFirst: false })
  else if (sort === "budget_asc") query = query.order("max_price", { ascending: true, nullsFirst: false })

  // Pagination
  const page = parseInt(searchParams.page || "1", 10)
  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data: requests, error, count } = await query

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/20 rounded-2xl">
        Не удалось загрузить заявки<br/>
        <span className="text-xs font-mono text-zinc-500">{error.message}</span>
      </div>
    )
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-[#11131A] px-4 mt-6 space-y-4 shadow-sm">
        <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
          <PackageSearch className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Активных заявок пока не найдено</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
            Попробуйте изменить параметры поиска или создайте первый запрос на оптовую закупку через AI-ассистента.
          </p>
        </div>
        <Button asChild className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 gap-2 mt-2">
          <Link href="/requests/create">
            <Sparkles className="w-4 h-4 text-emerald-100 dark:text-zinc-950" />
            <span>Создать закупку (RFQ)</span>
          </Link>
        </Button>
      </div>
    )
  }

  const totalCount = count || 0
  const pluralWord = getRussianPlural(totalCount, "запрос", "запроса", "запросов")

  return (
    <div className="space-y-6">
      {/* Search Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Найдено: <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">{totalCount}</strong> {pluralWord}
          </p>
        </div>
        <RequestsSortWidget sort={sort} />
      </div>

      {/* Request Cards Grid */}
      <div className="space-y-4">
        {requests.map((req: any) => {
          const reqOwnerId = req.buyer_id || req.user_id
          const isOwner = Boolean(currentUserId && currentUserId === reqOwnerId)
          const categoryTag = req.category_tag || "packaging"
          const categoryName = CATEGORY_MAP[categoryTag] || "Закупка"
          const quantity = req.quantity || 1
          const unit = req.unit || "шт"
          const price = req.max_price ?? req.budget_max

          return (
            <div 
              key={req.id} 
              className={`rounded-2xl border transition-all p-5 sm:p-6 bg-white dark:bg-[#11131A] shadow-sm ${
                isOwner 
                  ? "border-emerald-500/40 ring-1 ring-emerald-500/20" 
                  : "border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40 px-2.5 py-0.5 rounded-md">
                      {categoryName}
                    </span>

                    {isOwner && (
                      <span className="text-xs font-mono font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                        Моя закупка
                      </span>
                    )}

                    {req.status !== 'OPEN' && (
                      <span className="text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md">
                        {req.status === 'CLOSED' ? 'Завершена' : req.status === 'CANCELLED' ? 'Отменена' : req.status}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors line-clamp-2">
                      <Link href={`/requests/${req.id}`}>
                        {req.title}
                      </Link>
                    </h3>

                    {req.specs && (
                      <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">
                        Спецификация: {req.specs}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Boxes className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      Объем: <span className="font-mono text-zinc-900 dark:text-white font-bold">{quantity.toLocaleString("ru-RU")} {unit}</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                      {req.city}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                      до {req.deadline_days || 7} дн.
                    </span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-200 dark:border-zinc-800/80">
                  <div className="text-left md:text-right flex flex-col gap-0.5">
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">Бюджет партии:</div>
                    {req.total_budget || req.budget ? (
                      <>
                        <div className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400">
                          {Math.round(req.total_budget || req.budget).toLocaleString("ru-RU")} сом
                        </div>
                        {price && (
                          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                            до {price.toLocaleString("ru-RU")} сом/{unit}
                          </div>
                        )}
                      </>
                    ) : price ? (
                      <div className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        до {price.toLocaleString("ru-RU")} сом/{unit}
                      </div>
                    ) : (
                      <div className="font-mono text-sm text-zinc-500 dark:text-zinc-400">Договорной</div>
                    )}
                  </div>

                  <Button 
                    asChild 
                    className={`rounded-xl text-xs font-semibold px-4 h-10 shadow-sm transition-all gap-1.5 cursor-pointer ${
                      isOwner 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 font-bold" 
                        : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white"
                    }`}
                  >
                    <Link href={`/requests/${req.id}`}>
                      {isOwner ? (
                        <>
                          <span>Открыть панель предложений</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Отправить КП (Предложить цену)</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                        </>
                      )}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {(count && count > to + 1) ? (
        <div className="mt-8 text-center pt-4">
          <Button variant="outline" asChild className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Link href={`/requests?${new URLSearchParams({...searchParams, page: String(page + 1)}).toString()}`}>
              Загрузить ещё
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default async function RequestsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const currentUserId = session?.user?.id || null

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("name")

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl space-y-8">
      {/* Top B2B Exchange Banner */}
      <div className="bg-white dark:bg-[#11131A] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40 text-xs font-mono font-semibold">
            <span>BazaarOS • RFQ Exchange</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Биржа оптовых B2B-заказов (RFQ)
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base leading-relaxed">
            Актуальные запросы на снабжение от кофеен, магазинов и предприятий Кыргызстана. Отправляйте коммерческие предложения (КП) напрямую закупщикам.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <Button asChild size="lg" className="rounded-xl font-bold h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 gap-2 shadow-lg shadow-emerald-950/20 dark:shadow-emerald-950/40 cursor-pointer">
            <Link href="/requests/create">
              <Sparkles className="w-4 h-4 text-emerald-100 dark:text-zinc-950" />
              <span>Создать закупку</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Grid: Filters (1 col) + List (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <div className="lg:col-span-1 sticky top-24">
          <Suspense fallback={<div className="h-96 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 animate-pulse" />}>
            <RequestsFiltersWidget categories={categories || []} />
          </Suspense>
        </div>
        
        <div className="lg:col-span-3 min-w-0 w-full">
          <Suspense fallback={
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-28 bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 animate-pulse rounded-2xl" />
              ))}
            </div>
          }>
            <RequestsList 
              searchParams={searchParams} 
              categories={categories || []} 
              currentUserId={currentUserId} 
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
