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
  const budgetMax = formData.get("budgetMax") ? parseFloat(formData.get("budgetMax") as string) : null
  const condition = formData.get("condition") as string
  const region = formData.get("region") as string
  const city = formData.get("city") as string
  const expiresInDays = parseInt(formData.get("expiresInDays") as string) || 7

  if (!title || !categoryId || !region || !city) {
    return { error: "Заполните обязательные поля" }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  // Condition is "ANY" in frontend, but database might expect NULL if ANY.
  const dbCondition = condition === "ANY" ? null : condition

  const payload = {
    buyer_id: session.user.id,
    title,
    category_id: categoryId,
    description: description || null,
    budget_max: budgetMax,
    condition: dbCondition,
    region,
    city,
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

  // Verify listing belongs to user and is ACTIVE
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, status, seller_id")
    .eq("id", listingId)
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
    .eq("id", requestId)
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
      request_id: requestId,
      seller_id: session.user.id,
      listing_id: listingId,
      message
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
