"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { User, LogOut, Package, Store, Heart, MessageCircle, Settings, ClipboardList, ShoppingBag, Layers, Briefcase } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { NotificationsDropdown } from "@/features/notifications/components/notifications-dropdown"
import { useTranslations } from "next-intl";

export function HeaderAuth() {
    const t = useTranslations();
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  
  const router = useRouter()
  
  const supabase = React.useMemo(() => {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? createClient() : null
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", session.user.id)
          .single()
        
        if (data) setProfile(data)
      }
      
      setLoading(false)
    }

    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          const { data } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", session.user.id)
            .single()
          if (data) setProfile(data)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setIsOpen(false)
    router.push("/")
    router.refresh()
  }

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
  }

  if (!user) {
    return (
      <Button 
        className="hidden sm:flex rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 px-4 h-9 text-xs sm:text-sm" 
        asChild
      >
        <Link href="/login">{t("voyti")}</Link>
      </Button>
    );
  }

  const displayName = profile?.full_name || user.phone || user.email || "Пользователь"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-2">
      <NotificationsDropdown />

      <div className="relative">
        <Button 
          variant="ghost" 
          className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1.5 h-auto rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <span className="text-sm font-medium truncate max-w-[100px] text-zinc-900 dark:text-white">{displayName}</span>
        </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-1 z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 mb-1">
              <p className="text-sm font-semibold truncate text-zinc-900 dark:text-white">{displayName}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.phone || user.email}</p>
            </div>
            
            <Link href="/my-requests" onClick={() => setIsOpen(false)} className="group flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium">
              <ClipboardList className="w-4 h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              <span>Мои закупки (RFQ)</span>
            </Link>

            <Link href="/requests" onClick={() => setIsOpen(false)} className="group flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <Layers className="w-4 h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              <span>Биржа заказов (Для поставщиков)</span>
            </Link>

            <Link href="/messages" onClick={() => setIsOpen(false)} className="group flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <MessageCircle className="w-4 h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              <span>Сообщения по сделкам</span>
            </Link>

            <Link href="/b2b" onClick={() => setIsOpen(false)} className="group flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <Briefcase className="w-4 h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              <span>Кабинет поставщика</span>
            </Link>

            <Link href="/settings" onClick={() => setIsOpen(false)} className="group flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <Settings className="w-4 h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              <span>Настройки аккаунта</span>
            </Link>
            
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" /> {t("vyyti")}</button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
