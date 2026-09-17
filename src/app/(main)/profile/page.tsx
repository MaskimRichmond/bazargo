import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Phone, Mail, Calendar, Edit, Package, CheckCircle, Ban, Heart, MessageCircle, Settings } from "lucide-react"

export default async function ProfilePage() {
  const supabase = await createClient()
  
  if (!supabase) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Ошибка конфигурации</h1>
        <p className="text-muted-foreground">Не заданы ключи Supabase. Профиль недоступен.</p>
      </div>
    )
  }

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/profile")
  }

  // Fetch real profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single()

  // Fetch counts
  const { count: activeCount } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", session.user.id)
    .eq("status", "ACTIVE")

  const { count: soldCount } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", session.user.id)
    .eq("status", "SOLD")

  const { count: deactivatedCount } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", session.user.id)
    .eq("status", "DEACTIVATED")

  const { count: archivedCount } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", session.user.id)
    .eq("status", "ARCHIVED")

  const displayName = profile?.full_name || session.user.phone || session.user.email || "Пользователь"
  const createdAt = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("ru-RU", {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : "Неизвестно"

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Мой профиль</h1>
        <Button variant="outline" className="hidden sm:flex gap-2">
          <Edit className="w-4 h-4" />
          Редактировать
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* User Info Card */}
        <Card className="md:col-span-2 shadow-sm rounded-2xl border-border/50">
          <CardHeader className="pb-4">
            <CardTitle>Личные данные</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary text-2xl font-bold shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{displayName}</h2>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-medium mt-2 text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  Роль: {profile?.role || "BUYER"}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> Телефон</span>
                <p className="font-medium">{session.user.phone || "Не указан"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> Email</span>
                <p className="font-medium text-foreground">{session.user.email || "Не указан"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Дата регистрации</span>
                <p className="font-medium">{createdAt}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="shadow-sm rounded-2xl border-border/50">
          <CardHeader className="pb-4">
            <CardTitle>Статистика</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Package className="w-4 h-4"/></div>
                <span className="font-medium">Активные</span>
              </div>
              <span className="font-bold text-lg">{activeCount || 0}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><CheckCircle className="w-4 h-4"/></div>
                <span className="font-medium">Проданные</span>
              </div>
              <span className="font-bold text-lg">{soldCount || 0}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-500/10 text-zinc-500 rounded-lg"><Ban className="w-4 h-4"/></div>
                <span className="font-medium">Деактивированные</span>
              </div>
              <span className="font-bold text-lg">{deactivatedCount || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-500/10 text-slate-500 rounded-lg"><User className="w-4 h-4"/></div>
                <span className="font-medium">Архив</span>
              </div>
              <span className="font-bold text-lg">{archivedCount || 0}</span>
            </div>

            <Button asChild className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
              <a href="/my-listings">Перейти в Мои объявления</a>
            </Button>
          </CardContent>
        </Card>

        {/* Navigation Card */}
        <Card className="md:col-span-3 shadow-sm rounded-2xl border-border/50">
          <CardContent className="p-2 sm:p-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button asChild variant="ghost" className="h-auto py-4 flex-col gap-2 rounded-xl">
              <a href="/favorites">
                <Heart className="w-6 h-6 text-primary" />
                <span>Избранное</span>
              </a>
            </Button>
            <Button asChild variant="ghost" className="h-auto py-4 flex-col gap-2 rounded-xl">
              <a href="/requests">
                <Package className="w-6 h-6 text-primary" />
                <span>Мои запросы</span>
              </a>
            </Button>
            <Button asChild variant="ghost" className="h-auto py-4 flex-col gap-2 rounded-xl">
              <a href="/messages">
                <MessageCircle className="w-6 h-6 text-primary" />
                <span>Чаты</span>
              </a>
            </Button>
            <Button asChild variant="ghost" className="h-auto py-4 flex-col gap-2 rounded-xl">
              <a href="/settings">
                <Settings className="w-6 h-6 text-primary" />
                <span>Настройки</span>
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Mobile edit button */}
      <Button variant="outline" className="w-full mt-6 sm:hidden">
        Редактировать профиль
      </Button>
    </div>
  )
}
