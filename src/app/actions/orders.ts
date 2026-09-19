"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return { error: "Необходима авторизация" }

  const { data: order } = await supabase
    .from("orders")
    .select("status, buyer_id, seller_id")
    .eq("id", orderId)
    .single()

  if (!order) return { error: "Заказ не найден" }

  const isSeller = session.user.id === order.seller_id
  const isBuyer = session.user.id === order.buyer_id

  if (!isSeller && !isBuyer) return { error: "У вас нет доступа к этому заказу" }

  // State machine validations
  if (order.status === "COMPLETED") return { error: "Завершенный заказ нельзя изменить" }
  if (order.status === "CANCELLED") return { error: "Отмененный заказ нельзя изменить" }
  if (order.status === "REJECTED") return { error: "Отклоненный заказ нельзя изменить" }

  let updatePayload: any = { status: newStatus, updated_at: new Date().toISOString() }

  if (newStatus === "CONFIRMED") {
    if (!isSeller) return { error: "Только продавец может подтвердить заказ" }
    if (order.status !== "PENDING") return { error: "Можно подтвердить только новые заказы" }
    updatePayload.confirmed_at = new Date().toISOString()
  } else if (newStatus === "REJECTED") {
    if (!isSeller) return { error: "Только продавец может отклонить заказ" }
    if (order.status !== "PENDING") return { error: "Можно отклонить только новые заказы" }
  } else if (newStatus === "CANCELLED") {
    if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
      return { error: "Заказ уже нельзя отменить" }
    }
    updatePayload.cancelled_at = new Date().toISOString()
  } else {
    return { error: "Недопустимый статус" }
  }

  const { error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId)

  if (error) {
    console.error(error)
    return { error: "Ошибка при обновлении статуса" }
  }

  revalidatePath(`/orders/${orderId}`)
  revalidatePath(`/seller/orders/${orderId}`)
  revalidatePath("/orders")
  revalidatePath("/seller/orders")
  return { success: true }
}

export async function completeOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return { error: "Необходима авторизация" }

  // Call the atomic RPC function
  const { data, error } = await supabase
    .rpc("complete_order", {
      order_id_param: orderId,
      executing_user: session.user.id
    })

  if (error) {
    console.error("RPC complete_order error:", error)
    return { error: error.message || "Ошибка при завершении сделки" }
  }

  revalidatePath(`/orders/${orderId}`)
  revalidatePath(`/seller/orders/${orderId}`)
  revalidatePath("/orders")
  revalidatePath("/seller/orders")
  return { success: true }
}
