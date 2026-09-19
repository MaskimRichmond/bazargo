"use client"

import { useState, useEffect, useRef } from "react"
import { Send, AlertCircle, ShoppingBag } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { sendMessage } from "@/app/actions/chats"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface ChatRoomProps {
  chatId: string
  currentUserId: string
  initialMessages: Message[]
  listing?: any
}

export function ChatRoom({ chatId, currentUserId, initialMessages, listing }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [content, setContent] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = useRef(createClient()).current

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
    
    // Mark unread messages as read
    const unreadMessages = messages.filter(m => !m.is_read && m.sender_id !== currentUserId)
    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map(m => m.id)
      supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then()
      
      // Update local state to avoid re-triggering
      setMessages(prev => prev.map(m => 
        unreadIds.includes(m.id) ? { ...m, is_read: true } : m
      ))
    }
  }, [messages, currentUserId, supabase])

  // Subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`chat_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload: any) => {
          const newMessage = payload.new as Message
          // Duplicate protection
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
      )
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, supabase])

  const handleSend = async () => {
    const trimmed = content.trim()
    if (!trimmed || isSending) return

    setIsSending(true)
    setError(null)

    const result = await sendMessage(chatId, trimmed)
    
    if (!result.success) {
      setError(result.error || "Ошибка отправки")
    } else if (result.message) {
      setContent("")
      setMessages(prev => {
        if (prev.some(m => m.id === result.message.id)) return prev
        return [...prev, result.message as Message]
      })
    }
    
    setIsSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-background relative overflow-hidden">
      {!isConnected && (
        <div className="bg-destructive/10 text-destructive px-3 py-1.5 text-xs flex items-center justify-center gap-1 shrink-0">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Соединение потеряно</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {listing && (
          <div className="flex justify-center mb-6 mt-2">
            <div className="bg-muted/40 border border-border/50 rounded-xl p-2.5 flex items-center gap-3 w-[85%] max-w-sm shadow-sm">
              {listing.listing_images?.[0]?.url ? (
                <img src={listing.listing_images[0].url} className="w-12 h-12 rounded-md object-cover" alt="Product" />
              ) : (
                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate text-foreground/90">{listing.title}</p>
                <p className="text-xs font-semibold text-primary mt-0.5">{listing.price?.toLocaleString("ru-RU")} сом</p>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground text-sm py-10">
            <p>Начните переписку</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUserId
            const time = new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
            
            // grouping logic can be added later if needed
            return (
              <div key={msg.id} className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <div 
                  className={`px-3.5 py-2 text-[15px] leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                    isMe 
                      ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm' 
                      : 'bg-muted/80 text-foreground rounded-2xl rounded-bl-sm border border-border/30'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">{time}</span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-background border-t">
        {error && <p className="text-destructive text-xs mb-2 px-2">{error}</p>}
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            className="flex-1 max-h-32 min-h-[44px] h-[44px] py-2.5 px-4 rounded-full border bg-muted/30 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none text-[15px] leading-relaxed transition-colors no-scrollbar"
            rows={1}
            disabled={isSending}
          />
          <Button 
            onClick={handleSend} 
            disabled={isSending || !content.trim()} 
            className="h-[44px] w-[44px] shrink-0 rounded-full p-0 flex items-center justify-center shadow-md transition-transform active:scale-95"
            size="icon"
          >
            <Send className="w-5 h-5 -ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

