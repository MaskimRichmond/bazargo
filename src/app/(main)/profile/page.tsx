import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  User, 
  Settings, 
  Heart, 
  Package, 
  Store, 
  MessageCircle, 
  ChevronRight, 
  LogOut, 
  Briefcase,
  ShieldCheck,
  ShoppingBag,
  HelpCircle
} from "lucide-react"

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single()

  const displayName = profile?.full_name || session.user.phone || session.user.email || "Пользователь"

  const NavItem = ({ href, icon: Icon, title, subtitle, isPrimary = false }: any) => (
    <Link 
      href={href} 
      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors active:bg-muted"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPrimary ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-semibold text-[15px] ${isPrimary ? 'text-primary' : 'text-foreground'}`}>{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0" />
    </Link>
  )

  return (
    <div className="container mx-auto px-0 sm:px-4 py-4 sm:py-8 max-w-2xl pb-24">
      <div className="px-4 sm:px-0 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Профиль</h1>
      </div>

      <div className="px-4 sm:px-0 mb-8">
        <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center text-primary text-xl font-bold shrink-0 shadow-sm overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold">{displayName}</h2>
                <p className="text-sm text-muted-foreground">{session.user.phone || session.user.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-background text-muted-foreground">
                    ID: {session.user.id.substring(0, 6)}
                  </span>
                  {profile?.is_verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                      <ShieldCheck className="w-3 h-3" /> Верифицирован
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        
        <div className="bg-background sm:border sm:rounded-2xl overflow-hidden shadow-sm divide-y">
          <NavItem href="/my-listings" icon={Package} title="Мои объявления" subtitle="Активные, проданные, архив" />
          <NavItem href="/favorites" icon={Heart} title="Избранное" subtitle="Сохраненные товары" />
          <NavItem href="/orders" icon={ShoppingBag} title="Мои заказы" subtitle="Покупки и статус доставки" />
          <NavItem href="/messages" icon={MessageCircle} title="Чаты" subtitle="Переписка с продавцами и покупателями" />
        </div>

        <div className="px-4 sm:px-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6">
          Бизнес и продажи
        </div>
        <div className="bg-background sm:border sm:rounded-2xl overflow-hidden shadow-sm divide-y">
          <NavItem href="/seller/orders" icon={Package} title="Заказы клиентов" subtitle="Управление заказами на ваши товары" />
          <NavItem href="/my-store" icon={Store} title="Мой магазин" subtitle="Управление витриной и товарами" />
          <NavItem href="/my-requests" icon={HelpCircle} title="Мои запросы (Нужен товар)" subtitle="Поиск редких товаров" />
          <NavItem href="/b2b" icon={Briefcase} title="Для бизнеса (B2B)" subtitle="Оптовые закупки и заявки" isPrimary={true} />
        </div>

        <div className="px-4 sm:px-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6">
          Аккаунт
        </div>
        <div className="bg-background sm:border sm:rounded-2xl overflow-hidden shadow-sm divide-y">
          <NavItem href="/settings" icon={Settings} title="Настройки" subtitle="Пароль, уведомления, данные" />
          <NavItem href="/safety" icon={ShieldCheck} title="Безопасность и правила" />
        </div>

        <div className="px-4 sm:px-0 pt-4">
          <form action="/auth/signout" method="post">
            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-12">
              <LogOut className="w-5 h-5 mr-3" />
              Выйти из аккаунта
            </Button>
          </form>
        </div>

      </div>
    </div>
  )
}
