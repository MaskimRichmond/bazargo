"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl";

export function HeaderNav() {
    const t = useTranslations();
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname.startsWith(path)
  }

  return (
    <nav className="hidden xl:flex items-center gap-6 text-sm font-medium">
      <Link 
        href="/catalog" 
        className={cn("transition-colors", isActive("/catalog") || isActive("/product") ? "text-primary font-bold" : "text-muted-foreground hover:text-primary")}
      >
        {t("katalog")}</Link>
      <Link 
        href="/stores" 
        className={cn("transition-colors", isActive("/stores") || isActive("/store") ? "text-primary font-bold" : "text-muted-foreground hover:text-primary")}
      >
        {t("magaziny")}</Link>
      <Link 
        href="/requests" 
        className={cn("transition-colors", isActive("/requests") ? "text-primary font-bold" : "text-muted-foreground hover:text-primary")}
      >
        {t("nav_requests")}</Link>
      <Link 
        href="/b2b" 
        className={cn("transition-colors", isActive("/b2b") ? "text-primary font-bold" : "text-muted-foreground hover:text-primary")}
      >
        B2B
      </Link>
    </nav>
  );
}
