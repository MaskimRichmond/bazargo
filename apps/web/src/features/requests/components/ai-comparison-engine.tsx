"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { acceptRequestOffer } from "@/app/actions/requests"
import { Button } from "@/components/ui/button"
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Layers, 
  User, 
  ShieldCheck, 
  MessageSquare, 
  ArrowRight, 
  Loader2,
  TrendingDown
} from "lucide-react"

export interface OfferItem {
  id: string
  request_id: string
  seller_id: string
  unit_price: number | null
  offered_quantity: number | null
  moq: number | null
  delivery_cost: number | null
  lead_time_days: number | null
  total_cost: number | null
  message: string | null
  status: "PENDING" | "ACCEPTED" | "REJECTED" | string
  created_at: string
  profiles?: {
    id?: string
    full_name?: string | null
    avatar_url?: string | null
    phone?: string | null
    is_verified?: boolean
  } | null
}

interface AiComparisonEngineProps {
  offers: OfferItem[]
  isOwner: boolean
  currentUserId?: string | null
  requestTitle: string
  requestQuantity: number
  requestUnit: string
}

export function AiComparisonEngine({
  offers,
  isOwner,
  currentUserId,
  requestTitle,
  requestQuantity,
  requestUnit = "шт"
}: AiComparisonEngineProps) {
  const router = useRouter()
  const [loadingOfferId, setLoadingOfferId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sort offers by total_cost ASC, then lead_time_days ASC
  const sortedOffers = [...offers].sort((a, b) => {
    const costA = Number(a.total_cost ?? ((a.unit_price || 0) * (a.offered_quantity || requestQuantity || 1) + (a.delivery_cost || 0)))
    const costB = Number(b.total_cost ?? ((b.unit_price || 0) * (b.offered_quantity || requestQuantity || 1) + (b.delivery_cost || 0)))
    if (costA !== costB) return costA - costB
    return (a.lead_time_days || 999) - (b.lead_time_days || 999)
  })

  const handleAccept = async (offerId: string) => {
    setLoadingOfferId(offerId)
    setError(null)

    try {
      const res = await acceptRequestOffer(offerId)
      if (res.error) {
        setError(res.error)
        setLoadingOfferId(null)
      } else if (res.chatId) {
        router.push(`/messages/${res.chatId}`)
      } else {
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || "Ошибка при принятии предложения")
      setLoadingOfferId(null)
    }
  }

  const getVariantLabel = (index: number) => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    return `Вариант ${letters[index % letters.length]}`
  }

  if (sortedOffers.length === 0) {
    return null
  }

  const bestOffer = sortedOffers[0]
  const worstOffer = sortedOffers[sortedOffers.length - 1]
  const savings = sortedOffers.length > 1 && worstOffer.total_cost && bestOffer.total_cost 
    ? Math.max(0, worstOffer.total_cost - bestOffer.total_cost)
    : 0

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-background border border-emerald-500/20">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            AI Comparison Engine
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            Сравнение коммерческих предложений ({sortedOffers.length})
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Автоматическое ранжирование предложений по формуле совокупной стоимости и минимальным срокам поставки.
          </p>
        </div>

        {savings > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shrink-0">
            <TrendingDown className="w-4 h-4 shrink-0" />
            <span>Экономия до {savings.toLocaleString("ru-RU")} сом с лучшим предложением</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Offers Cards List */}
      <div className="space-y-4">
        {sortedOffers.map((offer, index) => {
          const isBest = index === 0
          const variantName = getVariantLabel(index)
          const sellerName = offer.profiles?.full_name || "Проверенный поставщик"
          const isVerified = offer.profiles?.is_verified ?? true
          const offeredQty = offer.offered_quantity || requestQuantity || 1
          const unitPrice = offer.unit_price || 0
          const deliveryCost = offer.delivery_cost || 0
          const totalCost = offer.total_cost ?? (unitPrice * offeredQty + deliveryCost)
          const leadTime = offer.lead_time_days || 3
          const moq = offer.moq || 1
          const isMyOffer = currentUserId === offer.seller_id
          const isAccepted = offer.status === "ACCEPTED"

          return (
            <div
              key={offer.id}
              className={`relative overflow-hidden rounded-3xl border transition-all ${
                isAccepted
                  ? "bg-emerald-500/[0.04] border-emerald-500 shadow-md ring-1 ring-emerald-500"
                  : isBest
                  ? "bg-card border-emerald-500/50 shadow-md hover:shadow-lg"
                  : "bg-card hover:border-border/80 hover:shadow-sm"
              } p-6 md:p-7`}
            >
              {/* Variant Header Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="font-extrabold text-lg md:text-xl text-foreground">
                    {variantName}
                  </span>

                  {isBest && !isAccepted && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold tracking-wide shadow-sm animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      Выбор AI — Лучшая цена/срок
                    </span>
                  )}

                  {isAccepted && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Предложение принято
                    </span>
                  )}

                  {isMyOffer && (
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      Ваше предложение
                    </span>
                  )}
                </div>

                {/* Big Total Price */}
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-black text-foreground">
                    {totalCost.toLocaleString("ru-RU")}{" "}
                    <span className="text-base md:text-lg font-bold text-muted-foreground">сом</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">полная стоимость партии</div>
                </div>
              </div>

              {/* Exact Formula Breakdown Box */}
              <div className="p-4 rounded-2xl bg-muted/40 border mb-5 font-mono text-xs md:text-sm text-foreground/90 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-primary">{unitPrice.toLocaleString("ru-RU")} сом</span>
                  <span className="text-muted-foreground">×</span>
                  <span className="font-bold">{offeredQty.toLocaleString("ru-RU")} {requestUnit}</span>
                  <span className="text-muted-foreground">+ доставка</span>
                  <span className="font-bold">{deliveryCost.toLocaleString("ru-RU")} сом</span>
                  <span className="text-muted-foreground">=</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {totalCost.toLocaleString("ru-RU")} сом
                  </span>
                </div>
                <div className="text-xs font-sans text-muted-foreground">
                  (расчет поставщика)
                </div>
              </div>

              {/* Key Commercial Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {/* Lead time */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background border text-xs">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-muted-foreground">Срок поставки:</div>
                    <div className="font-bold text-sm text-foreground">{leadTime} дн.</div>
                  </div>
                </div>

                {/* MOQ */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background border text-xs">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-muted-foreground">Мин. партия (MOQ):</div>
                    <div className="font-bold text-sm text-foreground">{moq} {requestUnit}</div>
                  </div>
                </div>

                {/* Supplier */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background border text-xs">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-muted-foreground">Поставщик:</div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-1 truncate">
                      <span className="truncate">{sellerName}</span>
                      {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Message from supplier */}
              {offer.message && (
                <div className="mb-5 p-3.5 rounded-2xl bg-muted/20 border text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Комментарий поставщика: </span>
                  {offer.message}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  КП получено {new Date(offer.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                </div>

                <div className="flex items-center gap-2">
                  {isAccepted ? (
                    <Button
                      onClick={() => router.push("/messages")}
                      className="rounded-xl px-5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Перейти в чат по заказу
                    </Button>
                  ) : isOwner ? (
                    <Button
                      onClick={() => handleAccept(offer.id)}
                      disabled={loadingOfferId !== null}
                      className={`rounded-xl px-6 py-2.5 font-bold shadow-md gap-2 ${
                        isBest
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {loadingOfferId === offer.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Оформление заказа...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Принять предложение и заказать
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
