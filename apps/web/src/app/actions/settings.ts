"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfileSettings(data: { full_name: string, city: string }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return { error: "Необходима авторизация" }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.full_name,
      city: data.city,
      updated_at: new Date().toISOString()
    })
    .eq("id", session.user.id)

  if (error) {
    console.error(error)
    return { error: "Ошибка при сохранении настроек" }
  }

  revalidatePath("/settings")
  revalidatePath("/profile")
  return { success: true }
}
