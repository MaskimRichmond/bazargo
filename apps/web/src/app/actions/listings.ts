"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateListingStatus(listingId: string, newStatus: string) {
  const supabase = await createClient()
  const { data: { session }, error: authError } = await supabase.auth.getSession()

  if (authError || !session) return { success: false, error: "Не авторизован" }

  const { data: current, error: fetchError } = await supabase
    .from("listings")
    .select("status")
    .eq("id", listingId)
    .eq("seller_id", session.user.id)
    .single();

  if (fetchError || !current) return { success: false, error: "Объявление не найдено" }
  if (current.status === "BLOCKED") return { success: false, error: "Объявление заблокировано администрацией" }

  const validStatuses = ["ACTIVE", "DEACTIVATED", "SOLD", "ARCHIVED", "OUT_OF_STOCK"]
  if (!validStatuses.includes(newStatus)) return { success: false, error: "Недопустимый статус" }

  const { error } = await supabase
    .from("listings")
    .update({ status: newStatus })
    .eq("id", listingId)
    .eq("seller_id", session.user.id) // Security check

  if (error) {
    console.error("Error updating listing:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/my-listings")
  revalidatePath("/profile")
  revalidatePath("/catalog")
  return { success: true }
}
