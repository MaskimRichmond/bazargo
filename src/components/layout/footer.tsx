"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag } from "lucide-react"

const APP_SCREENS = [
  "/messages", "/cart", "/orders", "/profile", 
  "/settings", "/sell", "/my-listings", "/favorites", "/seller"
]

export function Footer() {
  const pathname = usePathname()
  
  if (APP_SCREENS.some(path => pathname?.startsWith(path))) {
    return null
  }

  return (
    <footer className="bg-background border-t pt-8 pb-20 md:pb-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">BazarGo</span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground font-medium">
            <Link href="/about" className="hover:text-foreground transition-colors">О нас</Link>
            <Link href="/help" className="hover:text-foreground transition-colors">Помощь</Link>
            <Link href="/safety" className="hover:text-foreground transition-colors">Безопасность</Link>
            <Link href="/b2b" className="hover:text-foreground transition-colors">Для бизнеса</Link>
          </div>

          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Конфиденциальность</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Условия</Link>
            <span>© {new Date().getFullYear()}</span>
          </div>
          
        </div>
      </div>
    </footer>
  )
}
