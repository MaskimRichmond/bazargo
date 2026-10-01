"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function submitReviewAction(orderId: string, rating: number, comment: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return { error: "Необходима авторизация" }
  if (rating < 1 || rating > 5) return { error: "Некорректная оценка" }

  const { data, error } = await supabase.rpc("submit_review", {
    p_order_id: orderId,
    p_rating: rating,
    p_comment: comment
  })

  if (error) {
    console.error("Submit review error:", error)
    if (error.message.includes("duplicate key value violates unique constraint")) {
      return { error: "Вы уже оставили отзыв к этому заказу." }
    }
    return { error: error.message || "Ошибка при сохранении отзыва" }
  }

  revalidatePath(`/orders/${orderId}`)
  revalidatePath(`/seller/orders/${orderId}`)
  return { success: true }
}
