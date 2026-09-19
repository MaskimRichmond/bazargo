import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Package, ChevronRight } from "lucide-react"

export const metadata = {
  title: "Мои покупки | BazarGo",
}

const STATUS_MAP: Record<string, { label: string, color: string }> = {
  PENDING: { label: "Ожидает подтверждения", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20" },
  CONFIRMED: { label: "Подтверждён", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  COMPLETED: { label: "Сделка завершена", color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
  REJECTED: { label: "Отклонён", color: "text-red-600 bg-red-50 dark:bg-red-900/20" },
  CANCELLED: { label: "Отменён", color: "text-gray-600 bg-gray-50 dark:bg-gray-900/20" },
}

export default async function BuyerOrdersPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?next=/orders")
  }

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, status, total_amount, created_at,
      profiles!seller_id (full_name),
      order_items (id, title_snapshot, quantity, image_url_snapshot)
    `)
    .eq("buyer_id", session.user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Мои покупки</h1>
      
      {!orders || orders.length === 0 ? (
        <div className="text-center py-16 bg-muted/20 rounded-3xl border border-dashed">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">У вас еще нет заказов</h2>
          <p className="text-muted-foreground mb-6">Здесь будут отображаться ваши покупки.</p>
          <Button asChild>
            <Link href="/catalog">Перейти в каталог</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "bg-muted text-muted-foreground" }
            const sellerName = order.profiles?.full_name || "Неизвестный продавец"
            const itemCount = order.order_items.length
            
            return (
              <Link 
                key={order.id} 
                href={`/orders/${order.id}`}
                className="block p-5 border rounded-2xl bg-card hover:border-primary/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm text-muted-foreground">#{order.id.split('-')[0]}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-sm">Продавец: <span className="font-medium">{sellerName}</span></p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-lg">{order.total_amount} сом</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-dashed">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {order.order_items.slice(0, 3).map((item: any, i: number) => (
                        <div key={item.id} className="w-8 h-8 rounded-full border-2 border-background bg-muted overflow-hidden">
                          {item.image_url_snapshot ? (
                            <img src={item.image_url_snapshot} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted-foreground/20" />
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {itemCount} {itemCount === 1 ? "товар" : itemCount > 4 ? "товаров" : "товара"}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
