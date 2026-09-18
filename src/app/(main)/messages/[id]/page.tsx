import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Send } from "lucide-react"

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

  const isBuyer = session.user.id === chat.buyer_id
  const otherUser = isBuyer ? chat.seller : chat.buyer
  const listing = chat.listings

  // Simple static chat UI for MVP
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

      <div className="flex-1 bg-background border rounded-2xl p-6 mb-4 flex flex-col items-center justify-center text-muted-foreground">
        <p>Чат создан.</p>
        <p className="text-sm">В MVP версии история сообщений не сохраняется в реальном времени.</p>
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="Написать сообщение..." 
          className="flex-1 h-12 px-4 rounded-xl border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button className="h-12 px-6 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors">
          <Send className="w-4 h-4" />
          <span>Отправить</span>
        </button>
      </div>
    </div>
  )
}
