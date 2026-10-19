"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { User, LogOut, Package, Store, Heart, MessageCircle, Settings, ClipboardList, ShoppingBag } from "lucide-react"

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
      <Button variant="default" className="hidden sm:flex rounded-full font-medium" asChild>
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
          className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1.5 h-auto rounded-full border border-transparent hover:border-border"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-xs">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <span className="text-sm font-medium truncate max-w-[100px]">{displayName}</span>
        </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-popover rounded-xl shadow-lg border p-1 z-50 overflow-hidden">
            <div className="px-3 py-2 border-b mb-1">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.phone || user.email}</p>
            </div>
            
            <Link href="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
              <User className="w-4 h-4" /> {t("profil")}</Link>
            <Link href="/my-listings" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
              <Package className="w-4 h-4" /> {t("moi_obyavleniya")}</Link>
            <Link href="/my-store" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors text-primary font-medium">
              <Store className="w-4 h-4" /> {t("moy_magazin")}</Link>
            <Link href="/my-requests" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
              <ClipboardList className="w-4 h-4" /> {t("moi_zaprosy")}</Link>
            <Link href="/cart" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors text-primary">
              <ShoppingBag className="w-4 h-4" /> {t("korzina")}</Link>
            <Link href="/orders" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
              <Package className="w-4 h-4" /> {t("moi_pokupki")}</Link>
            <Link href="/seller/orders" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
              <Store className="w-4 h-4" /> {t("zakazy_klientov")}</Link>
            <Link href="/favorites" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
              <Heart className="w-4 h-4" /> {t("izbrannoe")}</Link>
            <Link href="/messages" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
              <MessageCircle className="w-4 h-4" /> {t("chaty_1")}</Link>
            <Link href="/settings" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
              <Settings className="w-4 h-4" /> {t("nastroyki")}</Link>
            
            <div className="h-px bg-border my-1" />
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" /> {t("vyyti")}</button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
