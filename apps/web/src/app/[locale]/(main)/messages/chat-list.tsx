"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, Search, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useTranslations } from "next-intl";

export function ChatList({ chats: initialChats, currentUserId }: { chats: any[], currentUserId: string }) {
    const t = useTranslations();
  const [search, setSearch] = useState("")
  const [chats, setChats] = useState(initialChats)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialChats.length === 50)
  const pathname = usePathname()
  const supabase = createClient()

  const loadMore = async () => {
    if (loading || !hasMore) return
    setLoading(true)
    const nextOffset = page * 50
    const { data } = await supabase.rpc("get_chats_with_unread", { p_limit: 50, p_offset: nextOffset })
    if (data && data.length > 0) {
      setChats(prev => [...prev, ...data])
      setPage(p => p + 1)
      if (data.length < 50) setHasMore(false)
    } else {
      setHasMore(false)
    }
    setLoading(false)
  }

  const filtered = chats.filter((chat) => {
    if (!search) return true
    const isBuyer = chat.buyer_id === currentUserId
    const otherUserName = isBuyer ? chat.seller_name : chat.buyer_name
    const listingTitle = chat.listing_title || ""
    const lastMsg = chat.last_message_content || ""
    
    const q = search.toLowerCase()
    return (otherUserName?.toLowerCase().includes(q) || 
            listingTitle.toLowerCase().includes(q) || 
            lastMsg.toLowerCase().includes(q))
  })

  return (
    <div className="flex flex-col h-full bg-background border-r">
      <div className="p-4 border-b bg-background sticky top-0 z-10 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight mb-4">{t("soobscheniya")}</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("poisk_po_chatam")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted/50 focus:bg-background border rounded-xl text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pb-16">
        {!chats || chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">{t("u_vas_poka_net_1")}</p>
            <Link href="/catalog" className="text-sm text-primary font-medium mt-2 hover:underline">
              {t("nayti_tovar")}</Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {t("nichego_ne_naydeno")}</div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((chat) => {
              const isBuyer = chat.buyer_id === currentUserId
              const otherUserName = isBuyer ? chat.seller_name : chat.buyer_name
              const otherUserAvatar = isBuyer ? chat.seller_avatar : chat.buyer_avatar
              
              const listingTitle = chat.listing_title || "Товар удален"
              const listingImage = chat.listing_image || "/placeholder.png"
              
              const isActive = pathname === `/messages/${chat.id}`

              return (
                <Link 
                  key={chat.id} 
                  href={`/messages/${chat.id}`}
                  className={`flex gap-3.5 p-4 transition-colors outline-none relative group ${
                    isActive ? 'bg-primary/5' : 'hover:bg-muted/50 focus:bg-muted/50'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                  )}

                  <div className="shrink-0 relative">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shadow-sm">
                      <img src={listingImage} alt={listingTitle} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border-[2.5px] border-background bg-muted flex items-center justify-center overflow-hidden text-[10px] font-bold text-muted-foreground shadow-sm">
                      {otherUserAvatar ? (
                        <img src={otherUserAvatar} className="w-full h-full object-cover" />
                      ) : (
                        otherUserName?.charAt(0) || "U"
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col py-0.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-[15px] truncate text-foreground">{otherUserName}</h3>
                      {chat.last_message_created_at && (
                        <span className={`text-[11px] whitespace-nowrap ${chat.unread_count > 0 ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                          {new Date(chat.last_message_created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[13px] font-medium text-foreground/80 truncate mb-1.5">{listingTitle}</p>
                    
                    <div className="flex items-center justify-between gap-3">
                      {chat.last_message_content ? (
                        <p className={`text-[13px] truncate ${chat.unread_count > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {chat.last_message_sender_id === currentUserId && <span className="text-primary mr-1">{t("vy")}</span>}
                          {chat.last_message_content}
                        </p>
                      ) : (
                        <p className="text-[13px] text-muted-foreground/70 italic">{t("net_soobscheniy")}</p>
                      )}

                      {chat.unread_count > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[1.25rem] text-center shadow-sm">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}

            {hasMore && !search && (
              <div className="p-4 flex justify-center">
                <button 
                  onClick={loadMore} 
                  disabled={loading}
                  className="text-sm text-primary hover:underline flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t("zagruzit_esche")}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
