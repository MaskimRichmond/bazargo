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

  const { data: chats, error } = await supabase.rpc("get_chats_with_unread")

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
              const otherUserName = isBuyer ? chat.seller_name : chat.buyer_name
              const otherUserAvatar = isBuyer ? chat.seller_avatar : chat.buyer_avatar
              
              const listingTitle = chat.listing_title || "Товар удален"
              const listingImage = chat.listing_image || "/placeholder.png"

              return (
                <Link 
                  key={chat.id} 
                  href={`/messages/${chat.id}`}
                  className="flex gap-3 p-4 hover:bg-muted/50 transition-colors focus:bg-muted/50 outline-none relative"
                >
                  <div className="flex-shrink-0 relative">
                    <img src={listingImage} alt={listingTitle} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden text-[9px] font-bold text-muted-foreground">
                      {otherUserAvatar ? (
                        <img src={otherUserAvatar} className="w-full h-full object-cover" />
                      ) : (
                        otherUserName?.charAt(0) || "U"
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className="font-semibold text-sm truncate">{otherUserName}</h3>
                      {chat.last_message_created_at && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(chat.last_message_created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs font-medium text-foreground/80 truncate mb-1">{listingTitle}</p>
                    
                    <div className="flex items-center justify-between gap-2">
                      {chat.last_message_content ? (
                        <p className={`text-xs truncate ${chat.unread_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                          {chat.last_message_sender_id === session.user.id && <span className="text-primary mr-1 font-normal">Вы:</span>}
                          {chat.last_message_content}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Нет сообщений</p>
                      )}

                      {chat.unread_count > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[1.25rem] text-center">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
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
