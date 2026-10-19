"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sparkles, Layers, Building2 } from "lucide-react"

export function HeaderNav() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname.startsWith(path)
  }

  return (
    <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold">
      <Link 
        href="/requests/create" 
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors", 
          isActive("/requests/create") ? "text-primary font-bold" : "text-muted-foreground hover:text-primary"
        )}
      >
        <Sparkles className="w-4 h-4 text-primary" />
        <span>Создать закупку (AI)</span>
      </Link>
      <Link 
        href="/requests" 
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors", 
          isActive("/requests") && !isActive("/requests/create") ? "text-primary font-bold" : "text-muted-foreground hover:text-primary"
        )}
      >
        <Layers className="w-4 h-4" />
        <span>Биржа запросов B2B</span>
      </Link>
      <Link 
        href="/b2b/become-supplier" 
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors", 
          isActive("/b2b/become-supplier") ? "text-primary font-bold" : "text-muted-foreground hover:text-primary"
        )}
      >
        <Building2 className="w-4 h-4" />
        <span>Стать поставщиком</span>
      </Link>
    </nav>
  )
}
