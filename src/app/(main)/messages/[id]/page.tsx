import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
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
    <div className="container mx-auto px-4 py-8 max-w-3xl min-h-[70vh] flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/messages" className="p-2 hover:bg-muted rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} className="w-full h-full rounded-full object-cover" />
            ) : (
              otherUser?.full_name?.charAt(0) || "U"
            )}
          </div>
          <div>
            <h1 className="font-bold">{otherUser?.full_name}</h1>
            <p className="text-xs text-muted-foreground">{isBuyer ? "Продавец" : "Покупатель"}</p>
          </div>
        </div>
      </div>

      <div className="bg-muted/30 border rounded-2xl p-4 flex items-center gap-4 mb-6">
        {listing?.listing_images?.[0]?.url && (
          <img src={listing.listing_images[0].url} className="w-16 h-16 rounded-lg object-cover" />
        )}
        <div>
          <p className="font-semibold">{listing?.title}</p>
          <p className="text-primary font-bold">{listing?.price?.toLocaleString("ru-RU")} сом</p>
        </div>
      </div>

      <ChatRoom 
        chatId={id} 
        currentUserId={session.user.id} 
        initialMessages={messages || []} 
      />
    </div>
  )
}
