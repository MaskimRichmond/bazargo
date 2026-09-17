"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { MapPin, Moon, Sun, Heart, MessageCircle, Menu, ShoppingBag, Search, Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HeaderAuth } from "@/components/layout/header-auth"

export function Header() {
  const { setTheme, theme } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between gap-3 md:gap-4">
        
        {/* Left: Logo & Mobile Location */}
        <div className="flex items-center gap-3 md:gap-6">
          <Link href="/" className="flex items-center gap-2 outline-none group">
            <div className="bg-primary text-primary-foreground p-1.5 md:p-2 rounded-xl shadow-sm group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5 md:w-5 md:h-5" />
            </div>
            <span className="font-bold text-lg md:text-xl tracking-tight">BazarGo</span>
          </Link>
          
          <div className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-medium">Бишкек</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-6 text-sm font-medium">
          <Link href="/catalog" className="text-muted-foreground hover:text-primary transition-colors">Каталог</Link>
          <Link href="/stores" className="text-muted-foreground hover:text-primary transition-colors">Магазины</Link>
          <Link href="/requests" className="text-muted-foreground hover:text-primary transition-colors">Запросы</Link>
          <Link href="/b2b" className="text-muted-foreground hover:text-primary transition-colors">B2B</Link>
        </nav>

        {/* Search Bar (Tablet/Desktop) */}
        <div className="hidden md:flex flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Поиск по миллионам товаров..." 
            className="w-full pl-9 h-10 bg-muted/40 border-border/50 hover:bg-muted/60 focus:bg-background focus-visible:ring-1 transition-colors rounded-full" 
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="hidden sm:flex h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label="Сменить тему"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <Button variant="ghost" size="icon" className="hidden lg:flex h-9 w-9 text-muted-foreground hover:text-foreground" asChild>
            <Link href="/favorites" aria-label="Избранное">
              <Heart className="w-5 h-5" />
            </Link>
          </Button>

          {/* Mobile Notifications (Visible on mobile instead of full nav) */}
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground">
            <Bell className="w-5 h-5" />
          </Button>

          <div className="hidden sm:block w-px h-6 bg-border mx-1" />

          <HeaderAuth />
          
          <Button className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 shadow-sm font-medium" asChild>
            <Link href="/sell">Разместить</Link>
          </Button>
        </div>
      </div>

      {/* Mobile Smart Search (Below Header) */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Я ищу..." 
            className="w-full pl-9 h-10 bg-muted border-none focus-visible:ring-1 rounded-xl shadow-inner text-base" 
          />
        </div>
      </div>
    </header>
  )
}
