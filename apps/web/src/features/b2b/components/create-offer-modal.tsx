"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Handshake } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface CreateOfferProps {
  listingId: string;
  minOrderQuantity: number;
  suggestedPrice: number;
  sellerId: string;
  currentUserId?: string;
}

export function CreateB2BOfferModal({ listingId, minOrderQuantity, suggestedPrice, sellerId, currentUserId }: CreateOfferProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [quantity, setQuantity] = useState(minOrderQuantity)
  const [price, setPrice] = useState(suggestedPrice)
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) {
      router.push(`/login?next=/product/${listingId}`)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const { data, error: rpcError } = await supabase.rpc("create_b2b_offer", {
        p_listing_id: listingId,
        p_quantity: quantity,
        p_price: price,
        p_message: message
      })
      
      if (rpcError) throw rpcError;
      
      setOpen(false)
      // Redirect to the chat page where the negotiation happens
      // Wait, we don't have the chat ID from the RPC directly (it returns offer_id).
      // We can redirect to /messages which will show the new chat.
      router.push("/messages")
    } catch (e: any) {
      setError(e.message || "Ошибка при создании запроса")
    } finally {
      setLoading(false)
    }
  }

  if (currentUserId === sellerId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full font-bold h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg">
          <Handshake className="w-5 h-5 mr-2" /> Оптовый запрос
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Запрос на оптовую закупку</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && <div className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-lg">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Количество (шт)</Label>
              <Input 
                id="quantity" 
                type="number" 
                min={minOrderQuantity}
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                required 
              />
              <p className="text-xs text-muted-foreground">Мин. партия: {minOrderQuantity}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Желаемая цена (som)</Label>
              <Input 
                id="price" 
                type="number" 
                min={0}
                value={price}
                onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Комментарий для продавца</Label>
            <Textarea 
              id="message" 
              placeholder="Здравствуйте, хочу закупить партию..." 
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <Button type="submit" className="w-full h-12 text-lg" disabled={loading || quantity < minOrderQuantity}>
            {loading ? "Отправка..." : "Отправить запрос"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
