"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function toggleFavorite(listingId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: "AUTH_REQUIRED" }
  }

  // Check if exists
  const { data: existing } = await supabase
    .from("favorites")
    .select("user_id")
    .eq("user_id", session.user.id)
    .eq("listing_id", listingId)
    .maybeSingle()

  if (existing) {
    // Unfavorite
    const { error: deleteError } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", session.user.id)
      .eq("listing_id", listingId)

    if (deleteError) return { success: false, error: "Ошибка удаления из избранного" }
  } else {
    // Favorite
    const { error: insertError } = await supabase
      .from("favorites")
      .insert({
        user_id: session.user.id,
        listing_id: listingId
      })

    if (insertError) {
      if (insertError.code === '23505') {
        // It was already inserted by a racing request, that's fine
      } else {
        return { success: false, error: "Ошибка добавления в избранное" }
      }
    }
  }

  revalidatePath("/favorites")
  revalidatePath("/")
  revalidatePath("/catalog")
  
  return { success: true, isFavorited: !existing }
}
