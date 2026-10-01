import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ShieldCheck, Users, AlertTriangle, Package, Activity, ShoppingCart, Store, Handshake, ScrollText, Trash2, FolderTree } from "lucide-react"
import { getTranslations } from "next-intl/server"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?redirect_to=/admin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["ADMIN", "SUPER_ADMIN", "MODERATOR", "SUPPORT"].includes(profile.role)) {
    redirect("/")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-muted/30 rounded-2xl p-4 sticky top-24">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
              {t("panel_upravleniya") || "Admin Panel"}
            </h2>
            <nav className="space-y-1">
              <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium transition-colors">
                <Activity className="w-4 h-4 text-primary" /> {t("obzor") || "Dashboard"}
              </Link>
              <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium transition-colors">
                <Users className="w-4 h-4 text-blue-500" /> {t("polzovateli") || "Users"}
              </Link>
              <Link href="/admin/listings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium transition-colors">
                <Package className="w-4 h-4 text-green-500" /> {t("obyavleniya_1") || "Listings"}
              </Link>
              <Link href="/admin/categories" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium transition-colors">
                <FolderTree className="w-4 h-4 text-purple-500" /> {t("kategorii") || "Categories"}
              </Link>
              <Link href="/admin/reports" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium transition-colors">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> {t("zhaloby") || "Reports"}
              </Link>
              <Link href="/admin/orders" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium transition-colors">
                <ShoppingCart className="w-4 h-4 text-indigo-500" /> Заказы
              </Link>
              <Link href="/admin/stores" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium transition-colors">
                <Store className="w-4 h-4 text-pink-500" /> {t("magaziny") || "Stores"}
              </Link>
              <Link href="/admin/requests" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium transition-colors">
                <Handshake className="w-4 h-4 text-teal-500" /> B2B
              </Link>
              
              {["ADMIN", "SUPER_ADMIN"].includes(profile.role) && (
                <>
                  <div className="h-px bg-border my-2 mx-2" />
                  <Link href="/admin/audit-logs" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium transition-colors">
                    <ScrollText className="w-4 h-4 text-slate-500" /> Аудит
                  </Link>
                  <Link href="/admin/account-deletions" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium transition-colors">
                    <Trash2 className="w-4 h-4 text-red-500" /> Удаление аккаунтов
                  </Link>
                </>
              )}
            </nav>
            <div className="mt-8 px-2">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Роль: {profile.role}
              </div>
            </div>
          </div>
        </aside>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
