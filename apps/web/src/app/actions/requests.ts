"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Необходима авторизация" }
  }

  const title = formData.get("title") as string
  const categoryId = formData.get("categoryId") as string
  const description = formData.get("description") as string
  const budgetMax = formData.get("budgetMax") as string
  const condition = formData.get("condition") as string
  const region = formData.get("region") as string
  const city = formData.get("city") as string
  const expiresInDaysStr = formData.get("expiresInDays") as string

  const { z } = await import("zod")
  const schema = z.object({
    title: z.string().min(5, "Слишком короткое название").max(200, "Слишком длинное название"),
    categoryId: z.string().uuid("Некорректная категория"),
    description: z.string().max(2000, "Слишком длинное описание").optional().nullable(),
    budgetMax: z.number().min(0).max(100000000).optional().nullable(),
    condition: z.enum(["ANY", "NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR", "FOR_PARTS"]).optional().nullable(),
    region: z.string().min(2, "Регион обязателен").max(100),
    city: z.string().min(2, "Город обязателен").max(100),
    expiresInDays: z.number().min(1).max(30).default(7)
  })

  const parsed = schema.safeParse({
    title,
    categoryId,
    description: description || null,
    budgetMax: budgetMax ? parseFloat(budgetMax) : null,
    condition: condition || "ANY",
    region,
    city,
    expiresInDays: parseInt(expiresInDaysStr) || 7
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  // Rate Limit: 10 requests per day
  const { data: rateOk } = await supabase.rpc("check_rate_limit", { 
    p_action_type: "create_request", 
    p_limit: 10, 
    p_window_minutes: 1440 
  })
  if (rateOk === false) return { error: "Превышен лимит создания запросов. Попробуйте завтра." }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays)

  const dbCondition = parsed.data.condition === "ANY" ? null : parsed.data.condition

  const payload = {
    buyer_id: session.user.id,
    title: parsed.data.title,
    category_id: parsed.data.categoryId,
    description: parsed.data.description,
    budget_max: parsed.data.budgetMax,
    condition: dbCondition,
    region: parsed.data.region,
    city: parsed.data.city,
    expires_at: expiresAt.toISOString(),
    status: 'OPEN'
  }

  const { data, error } = await supabase
    .from("requests")
    .insert(payload)
    .select("id")
    .single()

  if (error) {
    console.error("Create request error:", error)
    return { error: error.message }
  }

  revalidatePath("/requests")
  revalidatePath("/my-requests")
  return { success: true, id: data.id }
}

export async function closeRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Необходима авторизация" }
  }

  const { error } = await supabase
    .from("requests")
    .update({ status: 'CLOSED' })
    .eq("id", requestId)
    .eq("buyer_id", session.user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/requests")
  revalidatePath("/my-requests")
  revalidatePath(`/requests/${requestId}`)
  return { success: true }
}

export async function cancelRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Необходима авторизация" }
  }

  const { error } = await supabase
    .from("requests")
    .update({ status: 'CANCELLED' })
    .eq("id", requestId)
    .eq("buyer_id", session.user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/requests")
  revalidatePath("/my-requests")
  revalidatePath(`/requests/${requestId}`)
  return { success: true }
}

export async function offerListing(requestId: string, listingId: string, message: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Необходима авторизация" }
  }

  // Zod validation for message and IDs
  const { z } = await import("zod")
  const schema = z.object({
    requestId: z.string().uuid("Некорректный ID запроса"),
    listingId: z.string().uuid("Некорректный ID объявления"),
    message: z.string().max(2000, "Слишком длинное сообщение").optional()
  })

  const parsed = schema.safeParse({ requestId, listingId, message: message || "" })
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  // Rate Limit: 30 offers per day
  const { data: rateOk } = await supabase.rpc("check_rate_limit", { 
    p_action_type: "create_offer", 
    p_limit: 30, 
    p_window_minutes: 1440 
  })
  if (rateOk === false) return { error: "Превышен лимит создания предложений." }

  // Verify listing belongs to user and is ACTIVE
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, status, seller_id")
    .eq("id", parsed.data.listingId)
    .single()

  if (listingError || !listing) {
    return { error: "Объявление не найдено" }
  }
  if (listing.seller_id !== session.user.id) {
    return { error: "Вы не можете предложить чужой товар" }
  }
  if (listing.status !== "ACTIVE") {
    return { error: "Можно предлагать только активные товары" }
  }

  // Verify request is OPEN
  const { data: request, error: reqError } = await supabase
    .from("requests")
    .select("status, expires_at")
    .eq("id", parsed.data.requestId)
    .single()

  if (reqError || !request) {
    return { error: "Запрос не найден" }
  }
  
  if (request.status !== "OPEN") {
    return { error: "Запрос больше не принимает предложения" }
  }

  if (new Date(request.expires_at) < new Date()) {
    return { error: "Срок запроса истёк" }
  }

  // Create offer
  const { error: insertError } = await supabase
    .from("request_offers")
    .insert({
      request_id: parsed.data.requestId,
      seller_id: session.user.id,
      listing_id: parsed.data.listingId,
      message: parsed.data.message
    })

  if (insertError) {
    console.error("Offer insert error:", insertError)
    if (insertError.code === '23505') {
      return { error: "Вы уже предложили этот товар." }
    }
    return { error: insertError.message }
  }

  revalidatePath(`/requests/${requestId}`)
  return { success: true }
}
