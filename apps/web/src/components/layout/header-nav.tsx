"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sparkles, Layers, Building2, Store } from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/requests/create",
    label: "Создать закупку (AI)",
    icon: Sparkles
  },
  {
    href: "/requests",
    label: "Биржа заказов (RFQ)",
    icon: Layers,
    exact: true
  },
  {
    href: "/suppliers",
    label: "Поставщики",
    icon: Store
  },
  {
    href: "/b2b",
    label: "Кабинет поставщика",
    icon: Building2
  }
]

export function HeaderNav() {
  const pathname = usePathname() || ""

  const checkActive = (item: NavItem) => {
    if (item.exact) {
      return pathname.endsWith("/requests") || pathname === "/requests"
    }
    return pathname.includes(item.href)
  }

  return (
    <nav className="hidden lg:flex items-center gap-1.5 text-sm">
      {NAV_ITEMS.map((item) => {
        const active = checkActive(item)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all select-none text-sm font-medium",
              active
                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-semibold"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/40 border-transparent"
            )}
          >
            <Icon className={cn("w-4 h-4 transition-colors", active ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400")} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
