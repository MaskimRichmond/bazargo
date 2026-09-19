"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react"
import { updateCartQuantity, removeFromCart, checkoutCart } from "@/app/actions/cart"
import { toast } from "sonner"
import { formatPrice } from "@/lib/utils"

export function CartView({ initialItems }: { initialItems: Record<string, any>[] }) {
  const [items, setItems] = useState(initialItems)
  const [isPending, startTransition] = useTransition()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-muted/20 rounded-3xl border border-dashed">
        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Ваша корзина пуста</h2>
        <p className="text-muted-foreground mb-6">Добавьте товары из каталога, чтобы оформить заказ.</p>
        <Button asChild>
          <Link href="/catalog">Перейти в каталог</Link>
        </Button>
      </div>
    )
  }

  const handleUpdateQuantity = (cartItemId: string, newQuantity: number, maxAmount: number, type: string) => {
    if (type === "SINGLE" && newQuantity > 1) return
    if (newQuantity <= 0) {
      handleRemove(cartItemId)
      return
    }
    if (newQuantity > maxAmount) {
      toast.error(`Доступно только ${maxAmount} шт.`)
      return
    }
    
    // Optimistic update
    setItems(items.map(i => i.id === cartItemId ? { ...i, quantity: newQuantity } : i))
    
    startTransition(async () => {
      const res = await updateCartQuantity(cartItemId, newQuantity)
      if (res.error) {
        toast.error(res.error)
        router.refresh()
      }
    })
  }

  const handleRemove = (cartItemId: string) => {
    setItems(items.filter(i => i.id !== cartItemId))
    startTransition(async () => {
      const res = await removeFromCart(cartItemId)
      if (res.error) {
        toast.error(res.error)
        router.refresh()
      }
    })
  }

  const handleCheckout = async () => {
    setIsCheckingOut(true)
    const res = await checkoutCart()
    if (res.error) {
      toast.error(res.error)
      setIsCheckingOut(false)
    } else {
      toast.success("Заказ успешно оформлен!")
      router.push("/orders")
    }
  }

  const total = items.reduce((acc, item) => acc + (parseFloat(item.listings.price) * item.quantity), 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => {
          const listing = item.listings
          if (!listing) return null
          
          const maxAmount = listing.listing_type === "INVENTORY" ? listing.quantity : 1
          const images = listing.listing_images || []
          const imageUrl = images.length > 0 ? images[0].url : "https://placehold.co/400x400?text=No+Image"
          const sellerName = listing.profiles?.full_name || "Неизвестный продавец"
          
          return (
            <div key={item.id} className="flex gap-4 p-4 border rounded-2xl bg-card">
              <Link href={`/product/${listing.id}`} className="shrink-0">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted">
                  <Image src={imageUrl} alt={listing.title} fill className="object-cover" />
                </div>
              </Link>
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between gap-2">
                  <div>
                    <Link href={`/product/${listing.id}`} className="font-bold hover:underline line-clamp-2">
                      {listing.title}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">Продавец: {sellerName}</p>
                  </div>
                  <div className="font-bold whitespace-nowrap">
                    {formatPrice(listing.price)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  {listing.status === "ACTIVE" ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border rounded-full overflow-hidden">
                        <button 
                          disabled={isPending || item.quantity <= 1}
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, maxAmount, listing.listing_type)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-muted disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button 
                          disabled={isPending || item.quantity >= maxAmount || listing.listing_type === "SINGLE"}
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, maxAmount, listing.listing_type)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-muted disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      {listing.listing_type === "INVENTORY" && (
                        <span className="text-xs text-muted-foreground">В наличии: {listing.quantity}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-destructive">
                      {listing.status === "SOLD" ? "Продано" : "Нет в наличии"}
                    </span>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(item.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      <div>
        <div className="bg-muted/30 p-6 rounded-2xl sticky top-24">
          <h3 className="font-bold text-xl mb-4">Детали заказа</h3>
          
          <div className="space-y-3 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Товары ({items.length})</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Оплата</span>
              <span>Напрямую продавцу</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Доставка</span>
              <span>По договоренности</span>
            </div>
          </div>
          
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between font-bold text-lg">
              <span>Итого</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          
          <Button 
            className="w-full h-12 text-lg rounded-xl" 
            onClick={handleCheckout}
            disabled={isCheckingOut || isPending || items.some(i => i.listings?.status !== "ACTIVE")}
          >
            {isCheckingOut ? "Оформление..." : "Оформить заказ"}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center mt-4">
            Нажимая «Оформить заказ», вы отправляете заявку продавцам. 
            Они свяжутся с вами для подтверждения.
          </p>
        </div>
      </div>
    </div>
  )
}
