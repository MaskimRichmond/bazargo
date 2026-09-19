import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft } from "lucide-react"
import { OrderActions } from "../order-actions"

export const metadata = {
  title: "Детали заказа | BazarGo",
}

const STATUS_MAP: Record<string, { label: string, color: string, description: string }> = {
  PENDING: { label: "Ожидает подтверждения", color: "text-yellow-600 bg-yellow-50", description: "Продавец проверяет наличие и подтвердит заказ в ближайшее время." },
  CONFIRMED: { label: "Подтверждён", color: "text-blue-600 bg-blue-50", description: "Продавец подтвердил заказ. Свяжитесь для передачи товара." },
  COMPLETED: { label: "Сделка завершена", color: "text-green-600 bg-green-50", description: "Товар успешно передан покупателю." },
  REJECTED: { label: "Отклонен", color: "text-red-600 bg-red-50", description: "Продавец не смог выполнить этот заказ." },
  CANCELLED: { label: "Отменён", color: "text-gray-600 bg-gray-50", description: "Заказ был отменен." },
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect("/login?next=/orders/" + params.id)

  const { data: order } = await supabase
    .from("orders")
    .select(`
      *,
      profiles!seller_id (id, full_name, phone, avatar_url),
      order_items (*)
    `)
    .eq("id", params.id)
    .eq("buyer_id", session.user.id)
    .single()

  if (!order) notFound()

  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "bg-muted text-muted-foreground", description: "" }
  const seller = order.profiles

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="w-4 h-4 mr-1" /> Вернуться к списку
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Заказ #{order.id.split('-')[0]}</h1>
          <p className="text-muted-foreground text-sm mt-1">{new Date(order.created_at).toLocaleString('ru-RU')}</p>
        </div>
        <div className={`px-4 py-2 rounded-xl text-sm font-semibold inline-flex w-fit ${statusInfo.color}`}>
          {statusInfo.label}
        </div>
      </div>

      <div className="bg-card border rounded-3xl p-6 mb-6">
        <p className="text-sm mb-6 pb-6 border-b">{statusInfo.description}</p>
        
        <h3 className="font-bold mb-4">Состав заказа</h3>
        <div className="space-y-4 mb-6">
          {order.order_items.map((item: any) => (
            <div key={item.id} className="flex gap-4">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                {item.image_url_snapshot && <Image src={item.image_url_snapshot} alt={item.title_snapshot} fill className="object-cover" />}
              </div>
              <div className="flex-1">
                <Link href={`/product/${item.listing_id}`} className="font-medium hover:underline line-clamp-1">{item.title_snapshot}</Link>
                <div className="flex justify-between mt-1 text-sm text-muted-foreground">
                  <span>{item.quantity} шт. × {item.unit_price} ₸</span>
                  <span className="font-medium text-foreground">{item.quantity * item.unit_price} ₸</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 flex justify-between font-bold text-lg">
          <span>Итого</span>
          <span>{order.total_amount} ₸</span>
        </div>
      </div>

      <div className="bg-card border rounded-3xl p-6">
        <h3 className="font-bold mb-4">Информация о продавце</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted overflow-hidden">
            {seller.avatar_url && <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div>
            <p className="font-medium">{seller.full_name || "Неизвестно"}</p>
            {order.status === "CONFIRMED" && seller.phone ? (
              <a href={`tel:${seller.phone}`} className="text-sm text-primary hover:underline">{seller.phone}</a>
            ) : (
              <p className="text-xs text-muted-foreground">Телефон доступен после подтверждения</p>
            )}
          </div>
        </div>

        <OrderActions orderId={order.id} status={order.status} isSeller={false} />
      </div>
    </div>
  )
}
