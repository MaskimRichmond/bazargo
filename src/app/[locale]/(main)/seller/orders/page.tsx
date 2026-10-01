import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Store, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Заказы клиентов | BazarGo",
}

const STATUS_MAP: Record<string, { label: string, color: string }> = {
  PENDING: { label: "Новый", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20" },
  CONFIRMED: { label: "В процессе", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  COMPLETED: { label: "Сделка завершена", color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
  REJECTED: { label: "Отклонен", color: "text-red-600 bg-red-50 dark:bg-red-900/20" },
  CANCELLED: { label: "Отменен покупателем", color: "text-gray-600 bg-gray-100 dark:bg-gray-800" },
  EXPIRED: { label: "Истёк", color: "text-gray-600 bg-gray-100 dark:bg-gray-800" },
}

export default async function SellerOrdersPage() {
    const t = await getTranslations();
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect("/login?next=/seller/orders")

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, status, total_amount, created_at,
      profiles!buyer_id (full_name),
      order_items (id, title_snapshot, quantity, image_url_snapshot)
    `)
    .eq("seller_id", session.user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">{t("zakazy_klientov")}</h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-16 bg-muted/20 rounded-3xl border border-dashed">
          <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">{t("u_vas_esche_net_1")}</h2>
          <p className="text-muted-foreground mb-6">{t("zdes_budut_poyavlyatsya_zakazy")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "bg-muted text-muted-foreground" }
            const buyerName = order.profiles?.full_name || "Неизвестный покупатель"
            const itemCount = order.order_items.length
            
            return (
              <Link 
                key={order.id} 
                href={`/seller/orders/${order.id}`}
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
                    <p className="text-sm">{t("pokupatel_1")}<span className="font-medium">{buyerName}</span></p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-lg">{order.total_amount} {t("som")}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-dashed">
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <span className="truncate max-w-[200px] sm:max-w-md text-muted-foreground">
                      {order.order_items.map((i: any) => i.title_snapshot).join(', ')}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
