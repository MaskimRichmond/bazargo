"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return { error: "Необходима авторизация" }

  let error = null
  let data = null

  if (newStatus === "CONFIRMED") {
    const res = await supabase.rpc("confirm_order", { order_id_param: orderId })
    error = res.error
    data = res.data
  } else if (newStatus === "REJECTED") {
    const res = await supabase.rpc("reject_order", { order_id_param: orderId })
    error = res.error
    data = res.data
  } else if (newStatus === "CANCELLED") {
    const res = await supabase.rpc("cancel_order", { order_id_param: orderId })
    error = res.error
    data = res.data
  } else {
    return { error: "Недопустимый статус" }
  }

  if (error) {
    console.error("RPC error:", error)
    return { error: error.message || "Ошибка при обновлении статуса" }
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
      order_id_param: orderId
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
