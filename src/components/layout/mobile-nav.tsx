"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Plus, MessageCircle, User, Store, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function MobileBottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", icon: Home, label: "Главная" },
    { href: "/catalog", icon: Search, label: "Каталог" },
    { action: "plus", icon: Plus, label: "Создать", isPrimary: true },
    { href: "/messages", icon: MessageCircle, label: "Чаты" },
    { href: "/profile", icon: User, label: "Профиль" },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-safe pt-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
      <nav className="flex items-end justify-around px-2 h-14 relative">
        {navItems.map((item, idx) => {
          const isActive = item.href ? (pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))) : false
          
          if (item.isPrimary) {
            return (
              <DropdownMenu key="plus-menu">
                <DropdownMenuTrigger asChild>
                  <button 
                    className="flex flex-col items-center justify-center -mt-6 relative z-10 w-[20%] outline-none"
                    aria-label={item.label}
                  >
                    <div className="bg-primary text-primary-foreground p-3.5 rounded-full shadow-lg shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center">
                      <item.icon className="w-6 h-6" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 mb-2 rounded-2xl p-2" sideOffset={12}>
                  <DropdownMenuItem asChild className="p-3 text-base">
                    <Link href="/sell" className="flex items-center w-full">
                      <Plus className="w-5 h-5 mr-3 text-primary" /> Продать товар
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-3 text-base">
                    <Link href="/my-store" className="flex items-center w-full">
                      <Store className="w-5 h-5 mr-3 text-primary" /> Мой магазин
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-3 text-base">
                    <Link href="/requests" className="flex items-center w-full">
                      <ClipboardList className="w-5 h-5 mr-3 text-primary" /> Нужен товар
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }

          if (item.href) {
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className="flex flex-col items-center justify-center w-[20%] h-full pb-1 pt-2 transition-colors"
                aria-label={item.label}
              >
                <div className={cn(
                  "p-1 rounded-full transition-all duration-200", 
                  isActive ? "bg-primary/10 text-primary scale-110" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>
                  <item.icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "stroke-[2.5px]")} />
                </div>
                <span className={cn(
                  "text-[10px] mt-1 font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </Link>
            )
          }
          return null;
        })}
      </nav>
    </div>
  )
}
