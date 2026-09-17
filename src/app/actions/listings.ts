"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateListingStatus(listingId: string, newStatus: string) {
  const supabase = await createClient()
  const { data: { session }, error: authError } = await supabase.auth.getSession()

  if (authError || !session) return { success: false, error: "Не авторизован" }

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
