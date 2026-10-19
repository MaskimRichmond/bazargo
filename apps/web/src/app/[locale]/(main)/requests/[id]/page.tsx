import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { 
  MapPin, 
  Clock, 
  Tag, 
  User, 
  ArrowLeft, 
  Boxes, 
  Building2,
  FileText
} from "lucide-react"
import { OfferItem, AiComparisonEngine } from "@/features/requests/components/ai-comparison-engine"
import { SupplierQuoteForm } from "@/features/requests/components/supplier-quote-form"
import { RequestOwnerView } from "@/features/requests/components/request-owner-view"

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const { data: request } = await supabase
    .from("requests")
    .select("title")
    .eq("id", params.id)
    .maybeSingle()

  return {
    title: request?.title ? `${request.title} | BazaarOS RFQ` : "Заявка на закупку | BazaarOS"
  }
}

export default async function RequestDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const requestId = params.id
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // 1. Fetch raw request directly WITHOUT complex joins to prevent 404
  const { data: request, error: reqErr } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle()

  if (!request || reqErr) {
    notFound()
  }

  // 2. Extract packed metadata if fields were stored inside description (fallback resilience)
  const extractFromDescription = (desc: string | null | undefined) => {
    if (!desc) return {}
    const qtyMatch = desc.match(/Количество:\s*(\d+)\s*([^\n\r]+)/i)
    const specsMatch = desc.match(/Характеристики:\s*([^\n\r]+)/i)
    const priceMatch = desc.match(/Желаемая цена:\s*(\d+(?:\.\d+)?)/i)
    const daysMatch = desc.match(/Срок доставки:\s*до\s*(\d+)/i)
    const catMatch = desc.match(/Категория:\s*([^\n\r]+)/i)

    return {
      quantity: qtyMatch ? parseInt(qtyMatch[1], 10) : undefined,
      unit: qtyMatch ? qtyMatch[2].trim() : undefined,
      specs: specsMatch ? specsMatch[1].trim() : undefined,
      maxPrice: priceMatch ? parseFloat(priceMatch[1]) : undefined,
      deadlineDays: daysMatch ? parseInt(daysMatch[1], 10) : undefined,
      categoryTag: catMatch ? catMatch[1].trim() : undefined
    }
  }

  const descMeta = extractFromDescription(request.description)
  const quantity = request.quantity || descMeta.quantity || 1
  const unit = request.unit || descMeta.unit || "шт"
  const specs = request.specs || descMeta.specs || ""
  const deadlineDays = request.deadline_days || descMeta.deadlineDays || 7
  const categoryTag = request.category_tag || descMeta.categoryTag || "packaging"
  const maxPrice = request.max_price ?? descMeta.maxPrice ?? request.budget_max
  const totalBudget = maxPrice ? (request.max_price || descMeta.maxPrice ? maxPrice * quantity : request.budget_max) : null

  // 3. Fetch buyer profile safely without breaking page if not found
  const buyerId = request.buyer_id || (request as any).user_id
  let buyerProfile: { full_name?: string | null; phone?: string | null } | null = null
  if (buyerId) {
    const { data: p } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, phone")
      .eq("id", buyerId)
      .maybeSingle()
    buyerProfile = p
  }

  // 4. Resolve category label
  const categoryLabelMap: Record<string, string> = {
    packaging: "Упаковка и тара",
    cups: "Стаканы и посуда",
    syrups: "Сиропы и топпинги",
    coffee: "Кофе и чай",
    other: "Товары для бизнеса"
  }

  let categoryName = categoryLabelMap[categoryTag] || "B2B Закупка"
  if (!categoryLabelMap[categoryTag] && request.category_id) {
    const { data: cat } = await supabase
      .from("categories")
      .select("name")
      .eq("id", request.category_id)
      .maybeSingle()
    if (cat?.name) categoryName = cat.name
  }

  // Check expiration status
  const isExpired = request.expires_at ? new Date(request.expires_at) < new Date() : false
  const effectiveStatus = isExpired && request.status === "OPEN" ? "EXPIRED" : request.status
  const isOwner = Boolean(session?.user.id && (session.user.id === request.buyer_id || session.user.id === (request as any).user_id || session.user.id === buyerId))

  // 5. Fetch offers safely without join errors
  let offers: OfferItem[] = []
  if (session) {
    try {
      const { data: offersData } = await supabase
        .from("request_offers")
        .select(`
          id,
          request_id,
          seller_id,
          unit_price,
          offered_quantity,
          moq,
          delivery_cost,
          lead_time_days,
          total_cost,
          message,
          status,
          created_at,
          profiles:seller_id (
            id,
            full_name,
            avatar_url,
            phone,
            is_verified
          )
        `)
        .eq("request_id", requestId)

      if (offersData) {
        offers = offersData as unknown as OfferItem[]
      }
    } catch (e) {
      console.warn("Non-fatal offers fetch error, retrying without join:", e)
      const { data: basicOffers } = await supabase
        .from("request_offers")
        .select("*")
        .eq("request_id", requestId)
      if (basicOffers) {
        offers = basicOffers as unknown as OfferItem[]
      }
    }
  }

  // Check if current supplier has already quoted
  const myOffer = !isOwner && session ? offers.find(o => o.seller_id === session.user.id) : null

  return (
    <div className="container max-w-5xl mx-auto py-8 md:py-12 px-4 space-y-8">
      {/* Back Link */}
      <Link
        href="/requests"
        className="inline-flex items-center text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        К бирже B2B-запросов (RFQ)
      </Link>

      {/* Main Request Specification Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40 px-3 py-1 rounded-full uppercase tracking-wider">
                {categoryName}
              </span>
              <span
                className={`text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  effectiveStatus === "OPEN"
                    ? "bg-emerald-100/80 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50"
                    : effectiveStatus === "EXPIRED"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {effectiveStatus === "OPEN"
                  ? "Сбор предложений"
                  : effectiveStatus === "CLOSED"
                  ? "Завершена"
                  : effectiveStatus === "CANCELLED"
                  ? "Отменена"
                  : "Истекла"}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {request.title}
            </h1>

            {/* Meta details */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> {request.city}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> Срок: до {deadlineDays} дн. {request.expires_at ? `(до ${new Date(request.expires_at).toLocaleDateString("ru-RU")})` : ""}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <User className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> {buyerProfile?.full_name || (isOwner ? "Вы (Заказчик)" : "Заказчик")}
              </span>
            </div>
          </div>

          {/* Target Price / Volume Box */}
          <div className="rounded-xl bg-zinc-50 dark:bg-[#090A0F] border border-zinc-200 dark:border-zinc-800 p-5 min-w-[220px] text-center shrink-0 space-y-2">
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold font-mono">
              Объем партии
            </div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white flex items-center justify-center gap-1.5 font-mono">
              <Boxes className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <span>{quantity.toLocaleString("ru-RU")}</span>
              <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 font-sans">{unit}</span>
            </div>

            {maxPrice ? (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                <div className="text-zinc-500 font-mono">Желаемая цена:</div>
                <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                  до {maxPrice.toLocaleString("ru-RU")} сом/{unit}
                </div>
                {totalBudget && (
                  <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    (бюджет: ~{totalBudget.toLocaleString("ru-RU")} сом)
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 font-mono">
                Цена договорная
              </div>
            )}
          </div>
        </div>

        {/* Specs and details */}
        {(specs || request.description || request.raw_ai_prompt) && (
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
            {specs && (
              <div className="flex items-start gap-2.5">
                <Tag className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                    Характеристики и спецификация
                  </div>
                  <div className="text-sm font-medium font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {specs}
                  </div>
                </div>
              </div>
            )}

            {request.description && (
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                    Требования к заказу
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed mt-0.5">
                    {request.description}
                  </p>
                </div>
              </div>
            )}

            {request.raw_ai_prompt && (
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#090A0F] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Исходный AI-запрос: </span>
                «{request.raw_ai_prompt}»
              </div>
            )}
          </div>
        )}
      </div>

      {/* BLOCK 1: Owner View with AI Comparison & Test Mode */}
      {isOwner ? (
        <RequestOwnerView
          requestId={request.id}
          offers={offers}
          currentUserId={session?.user.id}
          requestTitle={request.title}
          requestQuantity={quantity}
          requestUnit={unit}
          suggestedMaxPrice={request.max_price}
          effectiveStatus={effectiveStatus}
        />
      ) : (
        /* BLOCK 2: Supplier Quote Form & History (For Suppliers) */
        <div className="space-y-6">
          {myOffer ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Ваше коммерческое предложение</h2>
              <AiComparisonEngine
                offers={[myOffer]}
                isOwner={false}
                currentUserId={session?.user.id}
                requestTitle={request.title}
                requestQuantity={quantity}
                requestUnit={unit}
              />
            </div>
          ) : effectiveStatus === "OPEN" ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] p-6 md:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Отправить коммерческое предложение (КП)</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Укажите оптовую стоимость партии, мин. тираж (MOQ) и срок доставки для заказчика
                  </p>
                </div>
              </div>

              {session ? (
                <SupplierQuoteForm
                  requestId={request.id}
                  requestQuantity={quantity}
                  requestUnit={unit}
                  suggestedMaxPrice={request.max_price}
                />
              ) : (
                <div className="p-8 rounded-xl bg-zinc-50 dark:bg-[#090A0F] border border-zinc-200 dark:border-zinc-800 text-center space-y-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Для отправки коммерческого предложения авторизуйтесь как поставщик
                  </p>
                  <Button asChild className="rounded-xl px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                    <Link href={`/login?redirect_to=/requests/${request.id}`}>
                      Войти и предложить цену
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-600 dark:text-zinc-400 font-mono">
              Заявка закрыта или истекла, новые предложения не принимаются.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
