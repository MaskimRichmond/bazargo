"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitRequestOffer } from "@/app/actions/requests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Calculator, CheckCircle2, AlertCircle, Clock, Truck, Layers, Coins } from "lucide-react"

interface SupplierQuoteFormProps {
  requestId: string
  requestQuantity: number
  requestUnit: string
  suggestedMaxPrice?: number | null
}

export function SupplierQuoteForm({
  requestId,
  requestQuantity = 1,
  requestUnit = "шт",
  suggestedMaxPrice
}: SupplierQuoteFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 4 required numeric fields + optional message
  const [unitPrice, setUnitPrice] = useState<string>(suggestedMaxPrice ? String(suggestedMaxPrice) : "")
  const [moq, setMoq] = useState<number>(1)
  const [leadTimeDays, setLeadTimeDays] = useState<number>(3)
  const [deliveryCost, setDeliveryCost] = useState<string>("0")
  const [message, setMessage] = useState<string>("")

  // Live Auto-calculation: (unit_price * quantity) + delivery_cost
  const numUnitPrice = parseFloat(unitPrice) || 0
  const numDeliveryCost = parseFloat(deliveryCost) || 0
  const calculatedTotal = (numUnitPrice * requestQuantity) + numDeliveryCost

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!numUnitPrice || numUnitPrice <= 0) {
      setError("Укажите корректную цену за единицу товара")
      return
    }
    if (moq <= 0) {
      setError("Минимальная партия (MOQ) должна быть от 1 шт.")
      return
    }
    if (leadTimeDays <= 0) {
      setError("Укажите срок поставки в днях")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await submitRequestOffer({
        requestId,
        unitPrice: numUnitPrice,
        offeredQuantity: requestQuantity,
        moq,
        leadTimeDays,
        deliveryCost: numDeliveryCost,
        message: message.trim() || null
      })

      if (result.error) {
        setError(result.error)
        setIsSubmitting(false)
      } else {
        setSuccess(true)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || "Ошибка отправки предложения")
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="p-6 md:p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Коммерческое предложение отправлено!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Заказчик получил уведомление с вашим расчетом. Когда заказчик примет предложение, откроется прямой чат для согласования доставки.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Unit Price */}
        <div className="space-y-2">
          <Label htmlFor="unitPrice" className="text-sm font-semibold flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-primary" />
            Цена за 1 {requestUnit} (сом) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0.00"
              className="h-11 rounded-xl bg-background pr-12 font-semibold text-base"
            />
            <span className="absolute right-3.5 top-3 text-xs text-muted-foreground font-medium pointer-events-none">
              сом
            </span>
          </div>
        </div>

        {/* 2. MOQ */}
        <div className="space-y-2">
          <Label htmlFor="moq" className="text-sm font-semibold flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-primary" />
            Мин. партия (MOQ, {requestUnit}) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="moq"
            type="number"
            min="1"
            required
            value={moq}
            onChange={(e) => setMoq(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-11 rounded-xl bg-background font-semibold"
          />
        </div>

        {/* 3. Lead Time (Days) */}
        <div className="space-y-2">
          <Label htmlFor="leadTimeDays" className="text-sm font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" />
            Срок поставки (дней) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="leadTimeDays"
            type="number"
            min="1"
            max="365"
            required
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-11 rounded-xl bg-background font-semibold"
          />
        </div>

        {/* 4. Delivery Cost */}
        <div className="space-y-2">
          <Label htmlFor="deliveryCost" className="text-sm font-semibold flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-primary" />
            Стоимость доставки (сом) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="deliveryCost"
              type="number"
              step="0.01"
              min="0"
              required
              value={deliveryCost}
              onChange={(e) => setDeliveryCost(e.target.value)}
              placeholder="0"
              className="h-11 rounded-xl bg-background pr-12 font-semibold"
            />
            <span className="absolute right-3.5 top-3 text-xs text-muted-foreground font-medium pointer-events-none">
              сом
            </span>
          </div>
        </div>
      </div>

      {/* 5. Optional message */}
      <div className="space-y-2">
        <Label htmlFor="message" className="text-sm font-semibold">
          Комментарий к предложению (необязательно)
        </Label>
        <Textarea
          id="message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Укажите условия оплаты (наличный/безналичный расчет, с НДС), условия самовывоза или характеристики товара..."
          className="rounded-xl bg-background resize-none text-sm"
        />
      </div>

      {/* Live Total Auto-calculation Banner */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Calculator className="w-3.5 h-3.5" />
          Авторасчет полной стоимости для покупателя:
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground font-mono">
            {numUnitPrice > 0 ? (
              <span>
                {numUnitPrice.toLocaleString("ru-RU")} сом × {requestQuantity.toLocaleString("ru-RU")} {requestUnit} + доставка {numDeliveryCost.toLocaleString("ru-RU")} сом
              </span>
            ) : (
              <span>Введите цену за единицу для расчета</span>
            )}
          </div>
          <div className="text-lg font-extrabold text-foreground">
            {numUnitPrice > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                = {calculatedTotal.toLocaleString("ru-RU")} сом
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || numUnitPrice <= 0}
        className="w-full h-12 rounded-xl text-base font-semibold shadow-md gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Отправка коммерческого предложения...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Отправить коммерческое предложение
          </>
        )}
      </Button>
    </form>
  )
}
