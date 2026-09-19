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

  // Fetch initial messages
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", id)
    .order("created_at", { ascending: true })

  const isBuyer = session.user.id === chat.buyer_id
  const otherUser = isBuyer ? chat.seller : chat.buyer
  const listing = chat.listings

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex items-center gap-3 p-3 border-b bg-background z-10 sticky top-0 shrink-0">
        <Link href="/messages" className="md:hidden p-2 -ml-2 hover:bg-muted rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold overflow-hidden">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} className="w-full h-full object-cover" />
            ) : (
              otherUser?.full_name?.charAt(0) || "U"
            )}
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight">{otherUser?.full_name}</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">{isBuyer ? "Продавец" : "Покупатель"}</p>
          </div>
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
