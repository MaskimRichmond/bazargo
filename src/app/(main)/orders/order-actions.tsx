"use client"

import { toast } from "sonner"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { updateOrderStatus, completeOrder } from "@/app/actions/orders"

export function OrderActions({ orderId, status, isSeller }: { orderId: string, status: string, isSeller: boolean }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "COMPLETED") {
      if (!confirm("Подтвердите, что сделка действительно состоялась. После завершения остаток товара будет изменён.")) {
        return
      }
      startTransition(async () => {
        const res = await completeOrder(orderId)
        if (res.error) toast.error(res.error)
        else router.refresh()
      })
    } else {
      if (newStatus === "CANCELLED" && !confirm("Вы уверены, что хотите отменить заказ?")) {
        return
      }
      if (newStatus === "REJECTED" && !confirm("Вы уверены, что хотите отклонить заказ?")) {
        return
      }
      
      startTransition(async () => {
        const res = await updateOrderStatus(orderId, newStatus)
        if (res.error) toast.error(res.error)
        else router.refresh()
      })
    }
  }

  if (status === "COMPLETED" || status === "CANCELLED" || status === "REJECTED") {
    return null
  }

  if (isSeller) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t">
        {status === "PENDING" && (
          <>
            <Button onClick={() => handleStatusChange("CONFIRMED")} disabled={isPending} className="flex-1 bg-blue-600 hover:bg-blue-700">
              Подтвердить заказ
            </Button>
            <Button onClick={() => handleStatusChange("REJECTED")} disabled={isPending} variant="destructive" className="flex-1">
              Отклонить
            </Button>
          </>
        )}
        
        {status === "CONFIRMED" && (
          <>
            <Button onClick={() => handleStatusChange("COMPLETED")} disabled={isPending} className="flex-1 bg-green-600 hover:bg-green-700">
              Завершить сделку
            </Button>
            <Button onClick={() => handleStatusChange("CANCELLED")} disabled={isPending} variant="outline" className="flex-1 text-destructive hover:bg-destructive/10 border-destructive/20">
              Отменить сделку
            </Button>
          </>
        )}
      </div>
    )
  }

  // Buyer actions
  return (
    <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t">
      {(status === "PENDING" || status === "CONFIRMED") && (
        <Button onClick={() => handleStatusChange("CANCELLED")} disabled={isPending} variant="outline" className="text-destructive hover:bg-destructive/10 border-destructive/20">
          Отменить заказ
        </Button>
      )}
    </div>
  )
}
