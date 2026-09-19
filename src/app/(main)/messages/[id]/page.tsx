import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Store } from "lucide-react"
import { ChatRoom } from "@/features/chat/components/chat-room"

export default async function ChatPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch chat
  const { data: chat, error } = await supabase
    .from("chats")
    .select(`
      *,
      listings(title, price, listing_images(url)),
      buyer:buyer_id(id, full_name, avatar_url),
      seller:seller_id(id, full_name, avatar_url)
    `)
    .eq("id", id)
    .single()

  if (error || !chat) {
    notFound()
  }

  // Verify access
  if (chat.buyer_id !== session.user.id && chat.seller_id !== session.user.id) {
    notFound()
  }

  // Fetch initial messages (last 50)
  const { data: rawMessages } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", id)
    .order("created_at", { ascending: false })
    .limit(50)

  // Reverse them so they are in chronological order for the UI
  const messages = rawMessages ? [...rawMessages].reverse() : []

  const isBuyer = session.user.id === chat.buyer_id
  const otherUser = isBuyer ? chat.seller : chat.buyer
  const listing = chat.listings

  return (
    <div className="flex flex-col flex-1 bg-background relative w-full min-w-0 overflow-hidden">
      {/* Messenger Header */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2.5 sm:py-3 border-b bg-background/95 backdrop-blur z-20 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/messages" className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-full active:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-muted/50 rounded-full flex items-center justify-center text-muted-foreground font-bold overflow-hidden shrink-0 border shadow-sm">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} className="w-full h-full object-cover" />
            ) : (
              otherUser?.full_name?.charAt(0) || "U"
            )}
          </div>
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-[15px] sm:text-base leading-tight truncate">{otherUser?.full_name}</h1>
              <span className="hidden sm:inline-block w-1 h-1 bg-muted-foreground/30 rounded-full" />
              <span className="hidden sm:inline-block text-[13px] text-muted-foreground">{isBuyer ? "Продавец" : "Покупатель"}</span>
            </div>
            <Link href={`/product/${listing.id}`} className="text-[12px] sm:text-[13px] font-medium text-primary hover:underline truncate mt-0.5">
              {listing.title} <span className="text-muted-foreground font-normal ml-1">· {listing.price?.toLocaleString("ru-RU")} сом</span>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Link href={`/product/${listing.id}`} className="hidden sm:flex items-center justify-center h-9 px-3 rounded-lg hover:bg-muted text-sm font-medium transition-colors">
            К объявлению
          </Link>
          {/* Action Menu (can be a real dropdown later) */}
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
            <Store className="w-5 h-5" />
          </button>
        </div>
      </div>

      <ChatRoom 
        chatId={id} 
        currentUserId={session.user.id} 
        initialMessages={messages || []}
        listing={listing}
      />
    </div>
  )
}
