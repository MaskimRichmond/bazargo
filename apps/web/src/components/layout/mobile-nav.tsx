"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Layers, Sparkles, MessageSquare, User } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileBottomNav() {
  const pathname = usePathname()

  // Hide on active conversation screens to give full space to the chat
  const isInsideChat = pathname?.startsWith("/messages/") && pathname !== "/messages"
  if (isInsideChat) return null

  const navItems = [
    { href: "/", icon: Home, label: "Главная" },
    { href: "/requests", icon: Layers, label: "Биржа RFQ" },
    { href: "/requests/create", icon: Sparkles, label: "Закупка", isPrimary: true },
    { href: "/messages", icon: MessageSquare, label: "Сделки" },
    { href: "/profile", icon: User, label: "Профиль" },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-safe pt-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
      <nav className="flex items-end justify-around px-2 h-14 relative">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
          
          if (item.isPrimary) {
            return (
              <Link 
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 relative z-10 w-[20%] outline-none"
                aria-label={item.label}
              >
                <div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform flex items-center justify-center">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-1 font-bold text-emerald-600 dark:text-emerald-400">
                  {item.label}
                </span>
              </Link>
            )
          }

          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className="flex flex-col items-center justify-center w-[20%] h-full pb-1 pt-2 transition-colors"
              aria-label={item.label}
            >
              <div className={cn(
                "p-1 rounded-xl transition-all duration-200", 
                isActive ? "bg-primary/10 text-primary scale-105" : "text-muted-foreground hover:text-foreground"
              )}>
                <item.icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "stroke-[2.5px]")} />
              </div>
              <span className={cn(
                "text-[10px] mt-0.5 font-medium transition-colors",
                isActive ? "text-primary font-bold" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
