"use client"

import { useState, useEffect, useRef } from "react"
import { Send, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { sendMessage } from "@/app/actions/chats"
import { Button } from "@/components/ui/button"

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
}

export function ChatRoom({ chatId, currentUserId, initialMessages }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [content, setContent] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

    // Optional: Optimistic update could go here, but let's rely on server action return or realtime
    // The server action returns the message, so we can add it to state immediately 
    // and rely on duplicate protection to handle the realtime event
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
    <div className="flex flex-col h-[600px] max-h-[70vh] bg-background border rounded-2xl overflow-hidden relative">
      {!isConnected && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Соединение с чатом временно потеряно</span>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
            <p>Начните переписку</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            const time = new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <div 
                  className={`px-4 py-2 rounded-2xl whitespace-pre-wrap break-words ${
                    isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
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

      <div className="p-4 border-t bg-muted/10">
        {error && <p className="text-destructive text-sm mb-2">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение..."
            className="flex-1 max-h-32 min-h-[44px] h-[44px] py-3 px-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={1}
            disabled={isSending}
          />
          <Button 
            onClick={handleSend} 
            disabled={isSending || !content.trim()} 
            className="h-[44px] px-6 rounded-xl font-semibold gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Отправить</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
