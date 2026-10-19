"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Sun, Moon, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { HeaderAuth } from "@/components/layout/header-auth"
import { HeaderLocationSelector } from "@/components/layout/header-location-selector"
import { HeaderNav } from "@/components/layout/header-nav"
import { LanguageSwitcher } from "@/components/language-switcher"
import { BazaarLogo } from "@/components/shared/bazaar-logo"
import { useTranslations } from "next-intl"

export function Header() {
  const t = useTranslations()
  const { setTheme, theme } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between gap-4">
        {/* Left: Strict Geometric BazaarOS Logo & Location */}
        <div className="flex items-center gap-4 md:gap-6">
          <BazaarLogo size="header" />
          
          <Suspense fallback={<div className="hidden lg:flex w-24 h-8 bg-muted rounded-md animate-pulse" />}>
            <HeaderLocationSelector />
          </Suspense>
        </div>

        {/* Desktop B2B Navigation */}
        <HeaderNav />

        {/* Right Actions: Theme, Lang, Auth, and Primary B2B Action */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg"
            aria-label={t("theme_switch")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <div className="hidden sm:block w-px h-5 bg-border mx-1" />

          <LanguageSwitcher />
          <HeaderAuth />
          
          <Button 
            className="hidden sm:inline-flex bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 font-bold shadow-sm gap-1.5 text-xs md:text-sm"
            asChild
          >
            <Link href="/requests/create">
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>Создать закупку</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
