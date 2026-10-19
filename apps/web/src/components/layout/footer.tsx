"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BazaarLogo } from "@/components/shared/bazaar-logo"
import { ShieldCheck, Sparkles, FileText, Building2 } from "lucide-react"

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
    <footer className="bg-zinc-50 dark:bg-[#090A0F] border-t border-zinc-200 dark:border-zinc-800/80 pt-12 pb-24 md:pb-12 mt-auto text-zinc-600 dark:text-zinc-400">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-zinc-200 dark:border-zinc-800/80 pb-8">
          <div className="space-y-3 max-w-sm">
            <BazaarLogo size="footer" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Операционная система B2B-закупок и AI-снабженец для бизнеса
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium">
            <Link 
              href="/requests/create" 
              className="group text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              Создать закупку
            </Link>
            <Link 
              href="/requests" 
              className="group text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              Биржа RFQ-заказов
            </Link>
            <Link 
              href="/suppliers" 
              className="group text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              Реестр поставщиков
            </Link>
            <Link 
              href="/b2b" 
              className="group text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              Кабинет поставщика
            </Link>
            <Link 
              href="/safety" 
              className="group text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              Правила и безопасность сделок
            </Link>
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 text-xs text-zinc-500">
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">Конфиденциальность</Link>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">Условия использования</Link>
          </div>
          <div className="font-mono text-[11px] text-zinc-400 dark:text-zinc-600">
            © {new Date().getFullYear()} BazaarOS. Все права защищены.
          </div>
        </div>
      </div>
    </footer>
  )
}
