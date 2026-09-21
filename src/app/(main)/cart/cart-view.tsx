"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, Minus, Plus, ShoppingBag, Store, AlertCircle } from "lucide-react"
import { updateCartQuantity, removeFromCart, checkoutCart } from "@/app/actions/cart"
import { toast } from "sonner"
import { formatPrice } from "@/lib/utils"

export function CartView({ initialItems }: { initialItems: Record<string, any>[] }) {
  const [items, setItems] = useState(initialItems)
  const [isPending, startTransition] = useTransition()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const router = useRouter()

  const groupedItems = useMemo(() => {
    const groups: Record<string, { sellerName: string, items: typeof items }> = {}
    items.forEach(item => {
      const sellerId = item.listings?.seller_id || "unknown"
      const sellerName = item.listings?.profiles?.full_name || "Неизвестный продавец"
      if (!groups[sellerId]) {
        groups[sellerId] = { sellerName, items: [] }
      }
      groups[sellerId].items.push(item)
    })
    return groups
  }, [items])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-4 border border-dashed rounded-3xl bg-muted/10">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Ваша корзина пуста</h2>
        <p className="text-muted-foreground mb-8 max-w-sm text-lg">
          Добавьте товары из каталога, чтобы начать покупки и оформить заказ.
        </p>
        <Button size="lg" asChild className="rounded-xl px-8">
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

  const total = items.reduce((acc, item) => {
    if (item.listings?.status !== "ACTIVE") return acc
    return acc + (parseFloat(item.listings.price) * item.quantity)
  }, 0)

  const hasUnavailableItems = items.some(i => i.listings?.status !== "ACTIVE" || i.quantity > (i.listings?.listing_type === "INVENTORY" ? i.listings.quantity : 1))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        {Object.entries(groupedItems).map(([sellerId, group]) => (
          <div key={sellerId} className="space-y-4">
            {/* Seller Header */}
            <div className="flex items-center gap-2 px-1">
              <Store className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold text-lg">{group.sellerName}</h2>
            </div>
            
            <div className="space-y-4">
              {group.items.map((item) => {
                const listing = item.listings
                if (!listing) return null
                
                const isSingle = listing.listing_type === "SINGLE"
                const stock = isSingle ? 1 : listing.quantity
                const maxAmount = stock
                
                const isUnavailable = listing.status !== "ACTIVE"
                const isOverStock = item.quantity > maxAmount
                const hasError = isUnavailable || isOverStock

                const images = (listing.listing_images || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                const imageUrl = images.length > 0 ? images[0].url : "https://placehold.co/400x400?text=No+Image"
                
                return (
                  <div key={item.id} className={`flex gap-3 sm:gap-4 p-4 border rounded-2xl bg-card transition-colors ${hasError ? "border-destructive/50 bg-destructive/5" : ""}`}>
                    <Link href={`/product/${listing.id}`} className="shrink-0">
                      <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-muted">
                        <Image src={imageUrl} alt={listing.title} fill className="object-cover" />
                        {isUnavailable && (
                          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-bold px-2 py-1 rounded">
                              {listing.status === "SOLD" ? "ПРОДАНО" : "НЕДОСТУПНО"}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                    
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <Link href={`/product/${listing.id}`} className={`font-medium sm:font-semibold hover:underline line-clamp-2 ${isUnavailable ? "text-muted-foreground" : ""}`}>
                            {listing.title}
                          </Link>
                          <div className="font-bold whitespace-nowrap text-right">
                            {formatPrice(listing.price)}
                            {item.quantity > 1 && !hasError && (
                              <div className="text-xs text-muted-foreground font-normal mt-0.5">
                                {formatPrice(parseFloat(listing.price) * item.quantity)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {hasError && (
                          <div className="flex items-center gap-1.5 mt-2 text-sm text-destructive">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>
                              {isUnavailable 
                                ? "Товар больше недоступен для заказа" 
                                : `Доступно только ${stock} шт.`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        {!isUnavailable ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center border rounded-full overflow-hidden bg-background">
                              <button 
                                disabled={isPending}
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, maxAmount, listing.listing_type)}
                                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-muted disabled:opacity-50 transition-colors"
                                aria-label={item.quantity === 1 ? "Удалить товар" : "Уменьшить количество"}
                              >
                                {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-destructive" /> : <Minus className="w-3 h-3" />}
                              </button>
                              <span className="w-8 sm:w-10 text-center text-sm font-medium">{item.quantity}</span>
                              <button 
                                disabled={isPending || item.quantity >= maxAmount || isSingle}
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, maxAmount, listing.listing_type)}
                                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-muted disabled:opacity-50 transition-colors"
                                aria-label="Увеличить количество"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            {!isSingle && !isOverStock && (
                              <span className="text-xs text-muted-foreground">В наличии: {stock}</span>
                            )}
                          </div>
                        ) : (
                          <div /> // Spacer for flex-between
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemove(item.id)}
                          disabled={isPending}
                          aria-label="Удалить из корзины"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary Sidebar */}
      <div>
        <div className="bg-muted/10 border p-5 sm:p-6 rounded-3xl sticky top-24">
          <h3 className="font-bold text-xl mb-6">Ваш заказ</h3>
          
          <div className="space-y-4 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Товары ({items.filter(i => i.listings?.status === "ACTIVE").reduce((acc, i) => acc + i.quantity, 0)})
              </span>
              <span className="font-medium">{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Доставка</span>
              <span className="text-right">Рассчитывается<br/>отдельно продавцом</span>
            </div>
          </div>
          
          <div className="border-t pt-5 mb-6">
            <div className="flex justify-between items-end">
              <span className="font-bold text-lg">Итого</span>
              <span className="font-bold text-2xl">{formatPrice(total)}</span>
            </div>
          </div>
          
          <Button 
            className="w-full h-14 text-lg rounded-xl font-semibold shadow-sm" 
            onClick={handleCheckout}
            disabled={isCheckingOut || isPending || hasUnavailableItems || total === 0}
          >
            {isCheckingOut ? "Оформление..." : "Оформить заказ"}
          </Button>

          {hasUnavailableItems && (
            <p className="text-sm text-destructive mt-4 text-center font-medium bg-destructive/10 p-3 rounded-lg">
              Удалите недоступные товары или исправьте количество, чтобы продолжить оформление.
            </p>
          )}
          
          {!hasUnavailableItems && (
            <p className="text-xs text-muted-foreground text-center mt-4 px-2 leading-relaxed">
              Нажимая «Оформить заказ», вы отправляете заявку продавцам. 
              Они свяжутся с вами для подтверждения доставки и оплаты.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
