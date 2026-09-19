import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ChatShell } from "./chat-shell"
import Link from "next/link"
import { MessageSquare, ArrowRight } from "lucide-react"

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/messages")
  }

  const { data: chats, error } = await supabase
    .from("chats")
    .select(`
      id,
      updated_at,
      buyer_id,
      seller_id,
      buyer:buyer_id(id, full_name, avatar_url),
      seller:seller_id(id, full_name, avatar_url),
      listings(title, listing_images(url)),
      messages(content, created_at, sender_id, is_read)
    `)
    .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
    .order("updated_at", { ascending: false })

  if (error) console.error("Error fetching chats:", error)

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold tracking-tight">Сообщения</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!chats || chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h2 className="font-semibold mb-1">Нет сообщений</h2>
            <p className="text-sm text-muted-foreground">Здесь будут ваши диалоги</p>
          </div>
        ) : (
          <div className="divide-y">
            {chats.map((chat: any) => {
              const isBuyer = chat.buyer_id === session.user.id
              const otherUser = isBuyer ? chat.seller : chat.buyer
              
              const sortedMessages = chat.messages ? [...chat.messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []
              const lastMessage = sortedMessages[0]
              
              const listingTitle = chat.listings?.title || "Товар удален"
              const listingImage = chat.listings?.listing_images?.[0]?.url || "/placeholder.png"

              return (
                <Link 
                  key={chat.id} 
                  href={`/messages/${chat.id}`}
                  className="flex gap-3 p-4 hover:bg-muted/50 transition-colors focus:bg-muted/50 outline-none"
                >
                  <div className="flex-shrink-0 relative">
                    <img src={listingImage} alt={listingTitle} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden text-[9px] font-bold text-muted-foreground">
                      {otherUser?.avatar_url ? (
                        <img src={otherUser.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        otherUser?.full_name?.charAt(0) || "U"
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className="font-semibold text-sm truncate">{otherUser?.full_name}</h3>
                      {lastMessage && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(lastMessage.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs font-medium text-foreground/80 truncate mb-1">{listingTitle}</p>
                    
                    {lastMessage ? (
                      <p className="text-xs text-muted-foreground truncate">
                        {lastMessage.sender_id === session.user.id && <span className="text-primary mr-1">Вы:</span>}
                        {lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Нет сообщений</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="container mx-auto px-0 md:px-4">
      <ChatShell sidebar={sidebar}>
        {children}
      </ChatShell>
    </div>
  )
}
