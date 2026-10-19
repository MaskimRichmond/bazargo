import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, User, Package, AlertTriangle, ShoppingCart } from "lucide-react"
import { UserActions } from "@/features/admin/components/user-actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getTranslations } from "next-intl/server"

export const metadata = {
  title: "Детали пользователя | BazarGo Admin",
}

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const t = await getTranslations();
  const authRes = await verifyAdminAccess('USERS_BAN')
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">{t("net_dostupa_k_dannomu_1")}</div>;

  const adminClient = createAdminClient()

  const { data: user, error } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !user) {
    notFound()
  }

  // Fetch user related data
  const [
    { data: listings },
    { data: reports },
    { data: orders }
  ] = await Promise.all([
    adminClient.from('listings').select('id, title, status, price, created_at').eq('seller_id', user.id).order('created_at', { ascending: false }).limit(20),
    adminClient.from('reports').select('id, reason, status, created_at, reporter:reporter_id(full_name)').eq('target_user_id', user.id).order('created_at', { ascending: false }).limit(20),
    adminClient.from('orders').select('id, status, total_amount, created_at').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(20)
  ])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link href="/admin/users" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4 mr-1" /> К списку пользователей
      </Link>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.full_name || "Без имени"}</h1>
            <div className="text-sm text-muted-foreground font-mono mt-1">{user.id}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                {user.role}
              </span>
              {user.is_banned ? (
                <span className="text-red-500 font-medium text-xs px-2 py-0.5 bg-red-50 rounded">Заблокирован</span>
              ) : (
                <span className="text-green-500 font-medium text-xs px-2 py-0.5 bg-green-50 rounded">Активен</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 min-w-40">
          <UserActions user={user} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Контакты и данные</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Телефон:</span>
            <span className="font-medium">{user.phone || "—"}</span>
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium">{user.email || "—"}</span>
            <span className="text-muted-foreground">Регистрация:</span>
            <span className="font-medium">{new Date(user.created_at).toLocaleString('ru-RU')}</span>
          </div>
        </div>
        {user.is_banned && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-lg text-red-700 border-b border-red-200 pb-2">Статус блокировки</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-red-600/70">Причина:</span>
              <span className="font-medium text-red-900">{user.ban_reason || "Не указана"}</span>
              <span className="text-red-600/70">Дата блокировки:</span>
              <span className="font-medium text-red-900">{user.banned_at ? new Date(user.banned_at).toLocaleString('ru-RU') : "—"}</span>
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 border overflow-x-auto flex-nowrap">
          <TabsTrigger value="listings" className="flex items-center gap-2 py-2">
            <Package className="w-4 h-4" /> Объявления ({listings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 py-2">
            <AlertTriangle className="w-4 h-4" /> Жалобы на пользователя ({reports?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2 py-2">
            <ShoppingCart className="w-4 h-4" /> Заказы ({orders?.length || 0})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="listings" className="border rounded-xl mt-4 bg-card overflow-hidden">
          {listings && listings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3">Название</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3">Цена</th>
                    <th className="px-4 py-3">Создано</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-primary">
                        <Link href={`/admin/listings/${l.id}`}>{l.title}</Link>
                      </td>
                      <td className="px-4 py-3">{l.status}</td>
                      <td className="px-4 py-3">{l.price} сом</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(l.created_at).toLocaleDateString('ru-RU')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">Нет объявлений</div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="border rounded-xl mt-4 bg-card overflow-hidden">
          {reports && reports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3">Причина</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3">От кого</th>
                    <th className="px-4 py-3">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-primary">
                        <Link href={`/admin/reports/${r.id}`}>{r.reason}</Link>
                      </td>
                      <td className="px-4 py-3">{r.status}</td>
                      <td className="px-4 py-3">{(r.reporter as any)?.full_name || "Неизвестно"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString('ru-RU')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">Жалоб не найдено</div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="border rounded-xl mt-4 bg-card overflow-hidden">
          {orders && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3">Сумма</th>
                    <th className="px-4 py-3">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-primary">
                        <Link href={`/orders/${o.id}`}>{o.id.split('-')[0]}</Link>
                      </td>
                      <td className="px-4 py-3">{o.status}</td>
                      <td className="px-4 py-3">{o.total_amount} сом</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString('ru-RU')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">Заказов не найдено</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
