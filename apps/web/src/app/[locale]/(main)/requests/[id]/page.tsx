import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { 
  MapPin, 
  Clock, 
  Tag, 
  User, 
  PackageSearch, 
  ArrowLeft, 
  Boxes, 
  Coins, 
  Sparkles,
  Building2,
  FileText
} from "lucide-react"
import { BazaarIcon } from "@/components/shared/bazaar-logo"
import { AiComparisonEngine, OfferItem } from "@/features/requests/components/ai-comparison-engine"
import { SupplierQuoteForm } from "@/features/requests/components/supplier-quote-form"

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const { data: request } = await supabase
    .from("requests")
    .select("title")
    .eq("id", params.id)
    .maybeSingle()

  return {
    title: request ? `${request.title} | BazaarOS RFQ` : "Заявка на закупку | BazaarOS"
  }
}

export default async function RequestDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const requestId = params.id
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: request } = await supabase
    .from("requests")
    .select("*, categories(name), profiles(full_name, phone)")
    .eq("id", requestId)
    .maybeSingle()

  if (!request) {
    notFound()
  }

  // Check expiration status
  const isExpired = new Date(request.expires_at) < new Date()
  const effectiveStatus = isExpired && request.status === "OPEN" ? "EXPIRED" : request.status
  const isOwner = session?.user.id === request.buyer_id

  // Fetch offers with supplier profile
  let offers: OfferItem[] = []
  if (session) {
    let query = supabase
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
        profiles (
          id,
          full_name,
          avatar_url,
          phone,
          is_verified
        )
      `)
      .eq("request_id", requestId)

    if (!isOwner) {
      // Suppliers only see their own submitted quote
      query = query.eq("seller_id", session.user.id)
    }

    const { data: offersData } = await query
    if (offersData) {
      offers = offersData as unknown as OfferItem[]
    }
  }

  const categoryLabelMap: Record<string, string> = {
    packaging: "Упаковка и тара",
    cups: "Стаканы и посуда",
    syrups: "Сиропы и топпинги",
    coffee: "Кофе и чай",
    other: "Товары для бизнеса"
  }

  const categoryName = request.category_tag 
    ? (categoryLabelMap[request.category_tag] || request.category_tag)
    : (request.categories?.name || "B2B Закупка")

  const quantity = request.quantity || 1
  const unit = request.unit || "шт"
  const maxPrice = request.max_price ?? request.budget_max
  const totalBudget = maxPrice ? (request.max_price ? maxPrice * quantity : request.budget_max) : null

  // Check if current supplier has already quoted
  const myOffer = !isOwner && session ? offers.find(o => o.seller_id === session.user.id) : null

  return (
    <div className="container max-w-4xl mx-auto py-8 md:py-12 px-4 space-y-8">
      {/* Back Link */}
      <Link
        href="/requests"
        className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        К бирже B2B-запросов
      </Link>

      {/* Main Request Specification Card */}
      <div className="rounded-3xl border bg-card p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-wider">
                {categoryName}
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  effectiveStatus === "OPEN"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : effectiveStatus === "EXPIRED"
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-muted text-muted-foreground"
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

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              {request.title}
            </h1>

            {/* Meta details */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-4 h-4 text-primary" /> {request.city}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-primary" /> Срок: {request.deadline_days || 7} дн. (до {new Date(request.expires_at).toLocaleDateString("ru-RU")})
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <User className="w-4 h-4 text-primary" /> {request.profiles?.full_name || "Заказчик"}
              </span>
            </div>
          </div>

          {/* Target Price / Volume Box */}
          <div className="rounded-2xl bg-muted/40 border p-5 min-w-[220px] text-center shrink-0 space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Объем партии
            </div>
            <div className="text-2xl font-black text-foreground flex items-center justify-center gap-1.5">
              <Boxes className="w-5 h-5 text-primary" />
              <span>{quantity.toLocaleString("ru-RU")}</span>
              <span className="text-sm font-bold text-muted-foreground">{unit}</span>
            </div>

            {maxPrice ? (
              <div className="pt-2 border-t text-xs">
                <div className="text-muted-foreground">Желаемая цена:</div>
                <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  до {maxPrice.toLocaleString("ru-RU")} сом/{unit}
                </div>
                {totalBudget && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    (бюджет: ~{totalBudget.toLocaleString("ru-RU")} сом)
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-2 border-t text-xs text-muted-foreground">
                Цена договорная
              </div>
            )}
          </div>
        </div>

        {/* Specs and details */}
        {(request.specs || request.description || request.raw_ai_prompt) && (
          <div className="pt-6 border-t space-y-4">
            {request.specs && (
              <div className="flex items-start gap-2.5">
                <Tag className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Характеристики и размеры
                  </div>
                  <div className="text-sm font-medium text-foreground mt-0.5">
                    {request.specs}
                  </div>
                </div>
              </div>
            )}

            {request.description && (
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Дополнительные требования
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed mt-0.5">
                    {request.description}
                  </p>
                </div>
              </div>
            )}

            {request.raw_ai_prompt && (
              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
                <span className="font-semibold text-primary">Исходный AI-запрос заказчика: </span>
                «{request.raw_ai_prompt}»
              </div>
            )}
          </div>
        )}
      </div>

      {/* BLOCK 1: AI Comparison Engine (For Buyer) */}
      {isOwner && (
        <div className="space-y-6">
          {offers.length === 0 ? (
            <div className="text-center py-16 px-4 border rounded-3xl bg-muted/20 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <BazaarIcon className="w-7 h-7 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Ожидаем предложения от поставщиков</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Ваш запрос опубликован на бирже BazaarOS. Как только поставщики сделают расчеты, AI сравнит их по цене и срокам.
                </p>
              </div>
            </div>
          ) : (
            <AiComparisonEngine
              offers={offers}
              isOwner={isOwner}
              currentUserId={session?.user.id}
              requestTitle={request.title}
              requestQuantity={quantity}
              requestUnit={unit}
            />
          )}
        </div>
      )}

      {/* BLOCK 2: Supplier Quote Form & History (For Supplier) */}
      {!isOwner && (
        <div className="space-y-6">
          {myOffer ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Ваше коммерческое предложение</h2>
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
            <div className="rounded-3xl border bg-card p-6 md:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">Отправить коммерческое предложение</h2>
                  <p className="text-xs text-muted-foreground">
                    Укажите вашу оптовую цену, срок и стоимость логистики для заказчика
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
                <div className="p-8 rounded-2xl bg-muted/30 border text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Для отправки коммерческого предложения авторизуйтесь как поставщик
                  </p>
                  <Button asChild className="rounded-xl px-6">
                    <Link href={`/login?redirect_to=/requests/${request.id}`}>
                      Войти и предложить цену
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-muted/30 border text-center text-sm text-muted-foreground">
              Заявка закрыта или истекла, новые предложения не принимаются.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
