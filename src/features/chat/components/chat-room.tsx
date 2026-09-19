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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = useRef(createClient()).current

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" })
  }

  useEffect(() => {
    scrollToBottom()
    const unreadMessages = messages.filter(m => !m.is_read && m.sender_id !== currentUserId)
    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map(m => m.id)
      supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then()
      setMessages(prev => prev.map(m => 
        unreadIds.includes(m.id) ? { ...m, is_read: true } : m
      ))
    }
  }, [messages, currentUserId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`chat_${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload: any) => {
          const newMessage = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
      )
      .subscribe((status: any) => {
        setIsConnected(status === 'SUBSCRIBED')
      })
    return () => { supabase.removeChannel(channel) }
  }, [chatId, supabase])

  const handleSend = async () => {
    const trimmed = content.trim()
    if (!trimmed || isSending) return

    setIsSending(true)
    setError(null)
    
    // reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px'
    }

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

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }

  // Group messages
  const grouped: { date: string, messages: (Message & { isFirstInGroup: boolean, isLastInGroup: boolean })[] }[] = []
  
  messages.forEach((msg, idx) => {
    const d = new Date(msg.created_at)
    const dateStr = d.toLocaleDateString("ru-RU", { day: 'numeric', month: 'long' })
    
    let currentGroup = grouped.find(g => g.date === dateStr)
    if (!currentGroup) {
      currentGroup = { date: dateStr, messages: [] }
      grouped.push(currentGroup)
    }
    
    const prevMsg = idx > 0 ? messages[idx - 1] : null
    const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null
    
    const isSameSenderAsPrev = prevMsg && prevMsg.sender_id === msg.sender_id
    const isSameSenderAsNext = nextMsg && nextMsg.sender_id === msg.sender_id
    
    // Time diff in minutes
    const isSameTimeAsPrev = prevMsg && (d.getTime() - new Date(prevMsg.created_at).getTime() < 60000)
    const isSameTimeAsNext = nextMsg && (new Date(nextMsg.created_at).getTime() - d.getTime() < 60000)

    const isFirstInGroup = !(isSameSenderAsPrev && isSameTimeAsPrev)
    const isLastInGroup = !(isSameSenderAsNext && isSameTimeAsNext)

    currentGroup.messages.push({ ...msg, isFirstInGroup, isLastInGroup })
  })

  return (
    <div className="flex flex-col flex-1 bg-background relative overflow-hidden">
      {!isConnected && (
        <div className="bg-destructive/10 text-destructive px-3 py-1.5 text-[11px] font-medium flex items-center justify-center gap-1.5 shrink-0">
          <AlertCircle className="w-3 h-3" />
          <span>Переподключение...</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-6 flex flex-col">
        {listing && (
          <div className="flex justify-center shrink-0">
            <Link href={`/product/${listing.id}`} className="bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50 rounded-2xl p-2 flex items-center gap-3 w-full max-w-[320px] shadow-sm group outline-none">
              <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 relative">
                {listing.listing_images?.[0]?.url ? (
                  <img src={listing.listing_images[0].url} className="w-full h-full object-cover" alt="Product" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ShoppingBag className="w-5 h-5" /></div>
                )}
                {listing.status !== 'ACTIVE' && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <span className="text-[9px] font-bold uppercase">{listing.status === 'SOLD' ? 'Продано' : 'Неактивно'}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-[13px] font-semibold leading-tight truncate text-foreground group-hover:text-primary transition-colors">{listing.title}</p>
                <p className="text-[12px] font-bold text-muted-foreground mt-0.5">{listing.price?.toLocaleString("ru-RU")} сом</p>
              </div>
            </Link>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground text-sm flex-1 opacity-60">
            <p>Диалог начат</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date} className="space-y-1.5 flex flex-col">
              <div className="flex justify-center my-3">
                <span className="bg-muted/40 text-muted-foreground px-3 py-1 rounded-full text-[11px] font-medium shadow-sm">
                  {group.date}
                </span>
              </div>
              
              {group.messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId
                const time = new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
                
                // Smart border radius
                const roundedTL = !isMe && !msg.isFirstInGroup ? 'rounded-tl-sm' : 'rounded-tl-2xl'
                const roundedTR = isMe && !msg.isFirstInGroup ? 'rounded-tr-sm' : 'rounded-tr-2xl'
                const roundedBL = !isMe && !msg.isLastInGroup ? 'rounded-bl-sm' : 'rounded-bl-2xl'
                const roundedBR = isMe && !msg.isLastInGroup ? 'rounded-br-sm' : 'rounded-br-2xl'

                return (
                  <div key={msg.id} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
                    <div 
                      className={`relative max-w-[85%] sm:max-w-[75%] px-3.5 py-2 text-[15px] leading-[1.35] whitespace-pre-wrap break-words shadow-sm transition-all ${
                        isMe 
                          ? `bg-[#0a8657] text-white ${roundedTL} ${roundedTR} ${roundedBL} ${roundedBR}` 
                          : `bg-muted/70 text-foreground border border-border/30 ${roundedTL} ${roundedTR} ${roundedBL} ${roundedBR}`
                      } ${!msg.isLastInGroup ? 'mb-[2px]' : 'mb-0'}`}
                    >
                      {msg.content}
                      {msg.isLastInGroup && (
                        <div className={`flex items-center justify-end gap-1 mt-1 -mb-1 -mr-1 ${isMe ? 'text-white/70' : 'text-muted-foreground/70'}`}>
                          <span className="text-[9px] leading-none">{time}</span>
                          {/* If we want to show read receipts, we could add checkmarks here */}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      <div className="p-2 sm:p-3 bg-background border-t shrink-0 relative z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        {error && <p className="text-destructive text-xs mb-2 px-2 text-center font-medium">{error}</p>}
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 bg-muted/40 rounded-[22px] border border-border/60 focus-within:border-primary focus-within:bg-background transition-colors flex items-end shadow-sm overflow-hidden">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Написать сообщение..."
              className="flex-1 max-h-[120px] min-h-[44px] py-[11px] px-4 bg-transparent outline-none resize-none text-[15px] leading-relaxed no-scrollbar"
              rows={1}
              disabled={isSending}
            />
          </div>
          <Button 
            onClick={handleSend} 
            disabled={isSending || !content.trim()} 
            className="h-[44px] w-[44px] shrink-0 rounded-full p-0 flex items-center justify-center shadow-md transition-transform active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
            size="icon"
          >
            <Send className="w-5 h-5 -ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

