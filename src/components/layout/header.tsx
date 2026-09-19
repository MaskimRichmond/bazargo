"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Search, Plus, MapPin, Heart, Menu, Sun, Moon, ShoppingBag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { HeaderAuth } from "@/components/layout/header-auth"
import { GlobalSearch } from "@/components/shared/global-search"
import { HeaderLocationSelector } from "@/components/layout/header-location-selector"
import { HeaderNav } from "@/components/layout/header-nav"

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
          
          <Suspense fallback={<div className="hidden lg:flex w-24 h-8 bg-muted rounded-md animate-pulse" />}>
            <HeaderLocationSelector />
          </Suspense>
        </div>

        {/* Desktop Navigation */}
        <HeaderNav />

        {/* Search Bar (Tablet/Desktop) */}
        <div className="hidden md:flex flex-1 max-w-md">
          <GlobalSearch 
            inputClassName="bg-muted/40 border-border/50 hover:bg-muted/60 focus:bg-background rounded-full"
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

          <Button variant="ghost" size="icon" className="hidden lg:flex h-9 w-9 text-muted-foreground hover:text-foreground" asChild>
            <Link href="/cart" aria-label="Корзина">
              <ShoppingBag className="w-5 h-5" />
            </Link>
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
        <GlobalSearch 
          placeholder="Я ищу..."
          inputClassName="bg-muted border-none rounded-xl shadow-inner text-base"
        />
      </div>
    </header>
  )
}
