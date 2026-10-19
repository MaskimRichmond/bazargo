"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Bell, Check, Trash } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useTranslations } from "next-intl";

export function NotificationsDropdown() {
    const t = useTranslations();
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (data) {
      setNotifications(data)
      const { data: countData } = await supabase.rpc("get_unread_notifications_count")
      setUnreadCount(countData || 0)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Realtime subscription specifically for this user's notifications
    let isMounted = true
    let subscription: any = null

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (!isMounted || !session) return

      // Append random string to channel name to prevent "already subscribed" errors 
      // during React StrictMode or HMR rapid mount/unmount cycles.
      const channelName = `notifications_${session.user.id}_${Math.random().toString(36).substring(7)}`

      subscription = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${session.user.id}`,
          },
          () => {
            fetchNotifications()
          }
        )
        .subscribe()
    })

    return () => {
      isMounted = false
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [])

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false)
      
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }
    setIsOpen(false)
    if (notification.link) {
      router.push(notification.link)
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("uvedomleniya")}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-background">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-popover rounded-xl shadow-lg border p-1 z-50 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-3 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold">{t("uvedomleniya")}</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> {t("prochitat_vse")}</button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 p-1">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t("net_novyh_uvedomleniy")}</div>
              ) : (
                <div className="space-y-1">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors text-sm ${
                        notification.is_read
                          ? "hover:bg-muted opacity-70"
                          : "bg-primary/5 hover:bg-primary/10 border border-primary/10"
                      }`}
                    >
                      <div className="flex justify-between gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          {notification.type === "NEW_MESSAGE" ? "Новое сообщение" :
                           notification.type === "NEW_OFFER" ? "Новое предложение" :
                           notification.type === "NEW_ORDER" ? "Новый заказ" :
                           notification.type === "ORDER_STATUS" ? "Статус заказа" : "Уведомление"}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {notification.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
