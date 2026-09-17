"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { User, LogOut, Settings, Package, Heart, MessageCircle, Store } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function HeaderAuth() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabase = supabaseUrl ? createClient() : null
  const router = useRouter()

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
        <Link href="/login">Войти</Link>
      </Button>
    )
  }

  const displayName = profile?.full_name || user.phone || user.email || "Пользователь"
  const initial = displayName.charAt(0).toUpperCase()

  return (
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
              <User className="w-4 h-4" /> Профиль
            </Link>
            <Link href="/my-listings" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
              <Package className="w-4 h-4" /> Мои объявления
            </Link>
            <Link href="/my-store" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors text-primary font-medium">
              <Store className="w-4 h-4" /> Мой магазин
            </Link>
            <Link href="/favorites" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
              <Heart className="w-4 h-4" /> Избранное
            </Link>
            <Link href="/messages" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
              <MessageCircle className="w-4 h-4" /> Чаты
            </Link>
            <Link href="/settings" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors">
              <Settings className="w-4 h-4" /> Настройки
            </Link>
            
            <div className="h-px bg-border my-1" />
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" /> Выйти
            </button>
          </div>
        </>
      )}
    </div>
  )
}
