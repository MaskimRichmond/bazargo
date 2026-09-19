"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addToCart } from "@/app/actions/cart"

export function BuyButtons({ 
  listingId, 
  sellerId, 
  currentUserId, 
  status, 
  quantity, 
  listingType 
}: { 
  listingId: string, 
  sellerId: string, 
  currentUserId?: string, 
  status: string, 
  quantity: number, 
  listingType: string 
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [orderQuantity, setOrderQuantity] = useState(1)

  if (currentUserId === sellerId) return null

  if (status === "SOLD") {
    return <Button variant="secondary" className="w-full h-12" disabled>Продано</Button>
  }
  if (status === "OUT_OF_STOCK") {
    return <Button variant="secondary" className="w-full h-12" disabled>Нет в наличии</Button>
  }
  if (status !== "ACTIVE") {
    return <Button variant="secondary" className="w-full h-12" disabled>Недоступно</Button>
  }

  const handleAddToCart = () => {
    if (!currentUserId) {
      router.push(`/login?next=/product/${listingId}`)
      return
    }

    startTransition(async () => {
      const res = await addToCart(listingId, orderQuantity)
      if (res.error) {
        alert(res.error)
      } else {
        alert("Товар добавлен в корзину!")
      }
    })
  }

  const handleBuyNow = () => {
    if (!currentUserId) {
      router.push(`/login?next=/product/${listingId}`)
      return
    }

    startTransition(async () => {
      const res = await addToCart(listingId, orderQuantity)
      if (res.error) {
        alert(res.error)
      } else {
        router.push("/cart")
      }
    })
  }

  return (
    <div className="space-y-4">
      {listingType === "INVENTORY" && (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Количество:</span>
          <div className="flex items-center border rounded-full overflow-hidden w-fit">
            <button 
              disabled={orderQuantity <= 1 || isPending}
              onClick={() => setOrderQuantity(q => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-muted disabled:opacity-50"
            >
              -
            </button>
            <span className="w-12 text-center font-medium">{orderQuantity}</span>
            <button 
              disabled={orderQuantity >= quantity || isPending}
              onClick={() => setOrderQuantity(q => Math.min(quantity, q + 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-muted disabled:opacity-50"
            >
              +
            </button>
          </div>
          <span className="text-sm text-muted-foreground">В наличии: {quantity}</span>
        </div>
      )}
      
      <div className="flex gap-3">
        <Button 
          onClick={handleBuyNow} 
          disabled={isPending}
          className="flex-1 h-12 text-base rounded-xl"
        >
          Купить сейчас
        </Button>
        <Button 
          variant="secondary"
          onClick={handleAddToCart} 
          disabled={isPending}
          className="flex-none h-12 px-4 rounded-xl"
          title="Добавить в корзину"
        >
          <ShoppingBag className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
