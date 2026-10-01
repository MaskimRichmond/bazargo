"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, Edit2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function B2BOfferCard({ offer, currentUserId }: { offer: any, currentUserId: string }) {
  const isBuyer = currentUserId === offer.buyer_id
  const isSeller = currentUserId === offer.seller_id
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCounter, setShowCounter] = useState(false)
  const [counterQty, setCounterQty] = useState(offer.requested_quantity)
  const [counterPrice, setCounterPrice] = useState(offer.requested_price)
  const [counterMessage, setCounterMessage] = useState("")

  const handleAction = async (status: 'ACCEPTED' | 'REJECTED' | 'COUNTER_OFFER') => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc("respond_b2b_offer", {
        p_offer_id: offer.id,
        p_status: status,
        p_quantity: status === 'COUNTER_OFFER' ? counterQty : null,
        p_price: status === 'COUNTER_OFFER' ? counterPrice : null,
        p_message: status === 'COUNTER_OFFER' ? counterMessage : null
      })
      if (rpcError) throw rpcError;
      // Ideally we would trigger a refresh here, but realtime or next refresh will pick it up
      window.location.reload()
    } catch (e: any) {
      setError(e.message || "Ошибка")
    } finally {
      setLoading(false)
    }
  }

  const isPending = offer.status === 'PENDING'
  const isCounter = offer.status === 'COUNTER_OFFER'
  const isAccepted = offer.status === 'ACCEPTED'
  const isRejected = offer.status === 'REJECTED'

  return (
    <div className="w-full max-w-sm bg-card border rounded-2xl shadow-sm overflow-hidden my-2 text-[15px]">
      <div className={`px-4 py-2 text-white font-medium text-sm flex justify-between items-center ${isAccepted ? 'bg-green-600' : isRejected ? 'bg-red-600' : 'bg-teal-600'}`}>
        <span>B2B Запрос</span>
        <span className="text-xs uppercase bg-black/20 px-2 py-0.5 rounded-full">{offer.status}</span>
      </div>
      
      <div className="p-4 space-y-3">
        {error && <div className="text-xs text-destructive">{error}</div>}
        
        <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3">
          <div>
            <div className="text-muted-foreground text-xs">Запрошено кол-во:</div>
            <div className="font-semibold">{offer.requested_quantity} шт.</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Желаемая цена:</div>
            <div className="font-semibold">{offer.requested_price} som</div>
          </div>
          {offer.buyer_message && (
            <div className="col-span-2 mt-1">
              <div className="text-muted-foreground text-xs">Комментарий покупателя:</div>
              <div className="italic text-muted-foreground">{offer.buyer_message}</div>
            </div>
          )}
        </div>

        {isCounter && (
          <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-2 rounded-xl">
            <div className="col-span-2 font-medium text-teal-700">Встречное предложение продавца:</div>
            <div>
              <div className="text-muted-foreground text-xs">Кол-во:</div>
              <div className="font-semibold">{offer.offered_quantity} шт.</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Цена:</div>
              <div className="font-semibold">{offer.offered_price} som</div>
            </div>
            {offer.seller_message && (
              <div className="col-span-2 mt-1">
                <div className="text-muted-foreground text-xs">Комментарий продавца:</div>
                <div className="italic text-muted-foreground">{offer.seller_message}</div>
              </div>
            )}
          </div>
        )}

        {/* Seller Actions on PENDING */}
        {isSeller && isPending && !showCounter && (
          <div className="flex flex-col gap-2 pt-2">
            <Button size="sm" onClick={() => handleAction('ACCEPTED')} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white">Принять условия</Button>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCounter(true)} disabled={loading} className="flex-1">Встречное</Button>
              <Button size="sm" variant="outline" onClick={() => handleAction('REJECTED')} disabled={loading} className="flex-1 text-destructive hover:bg-destructive/10">Отклонить</Button>
            </div>
          </div>
        )}

        {/* Seller Counter Form */}
        {isSeller && showCounter && (
          <div className="pt-2 space-y-3 border-t">
            <div className="text-sm font-semibold">Ваше встречное предложение:</div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Кол-во" value={counterQty} onChange={e => setCounterQty(Number(e.target.value))} />
              <Input type="number" placeholder="Цена" value={counterPrice} onChange={e => setCounterPrice(Number(e.target.value))} />
            </div>
            <Textarea placeholder="Комментарий (опционально)" value={counterMessage} onChange={e => setCounterMessage(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleAction('COUNTER_OFFER')} disabled={loading} className="flex-1">Отправить</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCounter(false)}>Отмена</Button>
            </div>
          </div>
        )}

        {/* Buyer Actions on COUNTER_OFFER */}
        {isBuyer && isCounter && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => handleAction('ACCEPTED')} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white">Согласиться</Button>
            <Button size="sm" variant="outline" onClick={() => handleAction('REJECTED')} disabled={loading} className="flex-1 text-destructive hover:bg-destructive/10">Отклонить</Button>
          </div>
        )}
      </div>
    </div>
  )
}
