import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MessageSquare, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Сообщения | BazarGo"
}

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/messages")
  }

  // Fetch chats where user is buyer or seller
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

  if (error) {
    console.error("Error fetching chats:", error)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-[60vh]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Сообщения</h1>
        <p className="text-muted-foreground">Ваши диалоги с продавцами и покупателями</p>
      </div>
      
      {!chats || chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 border rounded-3xl bg-muted/20 px-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">У вас пока нет сообщений</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">
            Откликайтесь на объявления или создавайте свои, чтобы начать переписку.
          </p>
          <Button asChild size="lg" className="rounded-xl font-semibold">
            <Link href="/catalog">Перейти в каталог</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {chats.map((chat: any) => {
            const isBuyer = chat.buyer_id === session.user.id
            const otherUser = isBuyer ? chat.seller : chat.buyer
            
            // Sort messages by created_at DESC (if API didn't sort nested query)
            const sortedMessages = chat.messages ? [...chat.messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []
            const lastMessage = sortedMessages[0]
            
            const listingTitle = chat.listings?.title || "Товар удален"
            const listingImage = chat.listings?.listing_images?.[0]?.url || "/placeholder.png"

            return (
              <Link 
                key={chat.id} 
                href={`/messages/${chat.id}`}
                className="flex flex-col sm:flex-row gap-4 p-4 border rounded-2xl hover:border-primary/50 hover:bg-muted/30 transition-all group outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex-shrink-0 relative">
                  <img src={listingImage} alt={listingTitle} className="w-16 h-16 rounded-xl object-cover" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden text-xs font-bold text-muted-foreground">
                    {otherUser?.avatar_url ? (
                      <img src={otherUser.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      otherUser?.full_name?.charAt(0) || "U"
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold truncate">{otherUser?.full_name} <span className="text-muted-foreground text-sm font-normal">• {isBuyer ? "Продавец" : "Покупатель"}</span></h3>
                    {lastMessage && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(lastMessage.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm font-medium truncate mb-1">{listingTitle}</p>
                  
                  {lastMessage ? (
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                      {lastMessage.sender_id === session.user.id && (
                        <span className="text-primary font-medium shrink-0">Вы:</span>
                      )}
                      <span className="truncate">{lastMessage.content}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Нет сообщений</p>
                  )}
                </div>
                
                <div className="hidden sm:flex items-center text-muted-foreground group-hover:text-primary transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
