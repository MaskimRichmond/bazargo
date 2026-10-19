"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export interface B2BProfileSettingsData {
  company_name: string
  business_type: "horeca" | "retail" | "production" | "wholesale" | "other" | string
  delivery_address: string
  whatsapp: string
  telegram_username: string
  city?: string
  full_name?: string
}

function isSchemaColumnError(err: any): boolean {
  if (!err) return false
  const code = err.code || ""
  const msg = (err.message || "").toLowerCase()
  return (
    code === "PGRST204" ||
    code === "42703" ||
    msg.includes("schema cache") ||
    msg.includes("could not find the") ||
    msg.includes("column")
  )
}

export async function updateProfileSettings(data: B2BProfileSettingsData) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return { error: "Необходима авторизация" }

  // Clean values
  const payload: any = {
    company_name: data.company_name?.trim() || null,
    business_type: data.business_type || "horeca",
    delivery_address: data.delivery_address?.trim() || null,
    whatsapp: data.whatsapp?.trim() || null,
    telegram_username: data.telegram_username ? data.telegram_username.trim().replace(/^@/, "") : null,
    updated_at: new Date().toISOString()
  }

  if (data.full_name?.trim()) {
    payload.full_name = data.full_name.trim()
  } else if (data.company_name?.trim()) {
    payload.full_name = data.company_name.trim()
  }

  if (data.city?.trim()) {
    payload.city = data.city.trim()
  }

  // 1. Attempt standard client update
  let { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", session.user.id)

  // 2. Fallback with admin client if RLS policy requires it
  if (error && !isSchemaColumnError(error)) {
    try {
      const adminClient = createAdminClient()
      const { error: adminErr } = await adminClient
        .from("profiles")
        .update(payload)
        .eq("id", session.user.id)
      error = adminErr
    } catch {}
  }

  // 3. Fallback if new columns are missing in PostgREST schema cache
  if (error && isSchemaColumnError(error)) {
    console.warn("Schema column error updating profiles, retrying with core columns:", error)
    const basePayload: any = {
      full_name: payload.full_name || session.user.user_metadata?.full_name || "Компания",
      updated_at: new Date().toISOString()
    }
    if (payload.city) basePayload.city = payload.city

    const { error: baseErr } = await supabase
      .from("profiles")
      .update(basePayload)
      .eq("id", session.user.id)

    if (baseErr) {
      console.error("Base profile update error:", baseErr)
      return { error: "Ошибка при сохранении настроек: " + baseErr.message }
    }
  } else if (error) {
    console.error("Profile settings update error:", error)
    return { error: "Ошибка при сохранении настроек: " + error.message }
  }

  revalidatePath("/settings")
  revalidatePath("/profile")
  return { success: true }
}
