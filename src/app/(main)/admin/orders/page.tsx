import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { ShoppingCart, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export const metadata = {
  title: "Заказы | BazarGo Admin",
}

export default async function AdminOrdersPage(
  props: {
    searchParams?: Promise<{ q?: string }>
  }
) {
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""

  // Reuse the 'LISTINGS_MODERATE' or 'REPORTS_RESOLVE' or general admin access
  const authRes = await verifyAdminAccess()
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">Нет доступа к данному разделу.</div>

  const adminClient = createAdminClient()

  let dbQuery = adminClient
    .from('orders')
    .select(`
      id,
      status,
      total_amount,
      created_at,
      buyer:profiles!buyer_id ( id, full_name ),
      store:stores!store_id ( id, name )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (query) {
    dbQuery = dbQuery.eq('id', query) // Usually search by order ID
  }

  const { data: orders, error } = await dbQuery

  if (error) {
    return <div className="text-destructive p-4">Ошибка загрузки заказов: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-purple-500" />
          Заказы (Только чтение)
        </h1>
        
        <form className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            name="q" 
            defaultValue={query} 
            placeholder="Поиск по ID..." 
            className="pl-8"
          />
        </form>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">ID Заказа</th>
                <th className="px-4 py-3">Магазин</th>
                <th className="px-4 py-3">Покупатель</th>
                <th className="px-4 py-3">Сумма</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Дата</th>
              </tr>
            </thead>
            <tbody>
              {orders?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Заказы не найдены
                  </td>
                </tr>
              )}
              {orders?.map((order: any) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">
                    {order.id.split('-')[0]}...
                  </td>
                  <td className="px-4 py-3 truncate max-w-[150px]">
                    {order.store?.name || "Неизвестен"}
                  </td>
                  <td className="px-4 py-3 truncate max-w-[150px]">
                    {order.buyer?.full_name || "Неизвестен"}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {order.total_amount} сом
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium uppercase bg-secondary text-secondary-foreground">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(order.created_at).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
