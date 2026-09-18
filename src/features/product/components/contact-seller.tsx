"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle, Phone } from "lucide-react"
import { useRouter } from "next/navigation"
import { createChat } from "@/app/actions/chats"

export function ContactSeller({ 
  listingId, 
  sellerId, 
  currentUserId,
  showPhone,
  phone
}: { 
  listingId: string
  sellerId: string
  currentUserId?: string
  showPhone: boolean
  phone?: string | null
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [phoneVisible, setPhoneVisible] = useState(false)
  
  const isOwner = currentUserId === sellerId

  const handleMessage = async () => {
    if (!currentUserId) {
      router.push(`/login?redirect_to=/product/${listingId}`)
      return
    }
    
    setIsLoading(true)
    const result = await createChat(listingId)
    setIsLoading(false)
    
    if (result.success && result.chatId) {
      router.push(`/messages/${result.chatId}`)
    } else {
      alert(result.error || "Ошибка при создании чата")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {isOwner ? (
        <div className="bg-muted p-4 rounded-xl text-center text-sm font-medium text-muted-foreground border">
          Это ваше объявление
        </div>
      ) : (
        <Button 
          onClick={handleMessage} 
          disabled={isLoading}
          className="w-full h-14 text-lg rounded-xl font-semibold gap-2"
        >
          <MessageCircle className="w-5 h-5" /> 
          {isLoading ? "Загрузка..." : "Написать продавцу"}
        </Button>
      )}
      
      {(showPhone || isOwner) && (
        <Button 
          variant={phoneVisible ? "secondary" : "outline"}
          onClick={() => setPhoneVisible(true)}
          className="w-full h-14 text-lg rounded-xl font-semibold gap-2"
        >
          <Phone className="w-5 h-5" />
          {phoneVisible ? (phone || "Номер не указан") : "Показать телефон"}
        </Button>
      )}
    </div>
  )
}
