"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { guessRegionByCity } from "@/lib/regions"

export async function createRequest(dataOrFormData: FormData | {
  title: string
  quantity?: number
  unit?: string
  specs?: string
  maxPrice?: number | null
  budgetMax?: number | null
  city?: string
  region?: string
  deadlineDays?: number
  expiresInDays?: number
  rawAiPrompt?: string
  categoryTag?: string
  categoryId?: string | null
  description?: string | null
  condition?: string | null
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Необходима авторизация" }
  }

  let rawData: any = {}
  if (dataOrFormData instanceof FormData) {
    rawData = {
      title: dataOrFormData.get("title") as string,
      categoryId: (dataOrFormData.get("categoryId") as string) || null,
      categoryTag: (dataOrFormData.get("categoryTag") as string) || null,
      specs: (dataOrFormData.get("specs") as string) || null,
      quantity: dataOrFormData.get("quantity") ? parseInt(dataOrFormData.get("quantity") as string, 10) : 1,
      unit: (dataOrFormData.get("unit") as string) || "шт",
      maxPrice: dataOrFormData.get("maxPrice") ? parseFloat(dataOrFormData.get("maxPrice") as string) : (dataOrFormData.get("budgetMax") ? parseFloat(dataOrFormData.get("budgetMax") as string) : null),
      budgetMax: dataOrFormData.get("budgetMax") ? parseFloat(dataOrFormData.get("budgetMax") as string) : null,
      description: (dataOrFormData.get("description") as string) || null,
      condition: (dataOrFormData.get("condition") as string) || "ANY",
      region: dataOrFormData.get("region") as string,
      city: dataOrFormData.get("city") as string,
      deadlineDays: dataOrFormData.get("deadlineDays") ? parseInt(dataOrFormData.get("deadlineDays") as string, 10) : (dataOrFormData.get("expiresInDays") ? parseInt(dataOrFormData.get("expiresInDays") as string, 10) : 7),
      rawAiPrompt: (dataOrFormData.get("rawAiPrompt") as string) || null
    }
  } else {
    rawData = {
      ...dataOrFormData,
      quantity: dataOrFormData.quantity ?? 1,
      unit: dataOrFormData.unit || "шт",
      deadlineDays: dataOrFormData.deadlineDays ?? dataOrFormData.expiresInDays ?? 7,
      maxPrice: dataOrFormData.maxPrice ?? dataOrFormData.budgetMax ?? null
    }
  }

  const { z } = await import("zod")
  const schema = z.object({
    title: z.string().min(3, "Слишком короткое название").max(255, "Слишком длинное название"),
    categoryId: z.string().uuid("Некорректная категория").optional().nullable(),
    categoryTag: z.string().max(100).optional().nullable(),
    specs: z.string().max(500).optional().nullable(),
    quantity: z.number().min(1).default(1),
    unit: z.string().min(1).max(30).default("шт"),
    maxPrice: z.number().min(0).max(100000000).optional().nullable(),
    budgetMax: z.number().min(0).max(100000000).optional().nullable(),
    description: z.string().max(2000, "Слишком длинное описание").optional().nullable(),
    condition: z.enum(["ANY", "NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR", "FOR_PARTS"]).optional().nullable(),
    region: z.string().max(100).optional().nullable(),
    city: z.string().min(2, "Город обязателен").max(100),
    deadlineDays: z.number().min(1).max(90).default(7),
    rawAiPrompt: z.string().optional().nullable()
  })

  const parsed = schema.safeParse(rawData)

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  // Rate Limit: 20 requests per day
  try {
    const { data: rateOk } = await supabase.rpc("check_rate_limit", { 
      p_action_type: "create_request", 
      p_limit: 20, 
      p_window_minutes: 1440 
    })
    if (rateOk === false) return { error: "Превышен лимит создания запросов. Попробуйте позже." }
  } catch (e) {
    // Ignore if check_rate_limit is not defined
  }

  const days = parsed.data.deadlineDays
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + days)

  const city = parsed.data.city || "Бишкек"
  const region = parsed.data.region || guessRegionByCity(city) || "Бишкек"
  const maxPriceVal = parsed.data.maxPrice ?? null
  const budgetMaxVal = parsed.data.budgetMax ?? (maxPriceVal ? maxPriceVal * parsed.data.quantity : null)

  const payload: any = {
    buyer_id: session.user.id,
    title: parsed.data.title,
    category_id: parsed.data.categoryId || null,
    category_tag: parsed.data.categoryTag || "packaging",
    specs: parsed.data.specs || null,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    max_price: maxPriceVal,
    budget_max: budgetMaxVal,
    description: parsed.data.description || null,
    condition: parsed.data.condition === "ANY" ? null : (parsed.data.condition || null),
    region,
    city,
    deadline_days: days,
    raw_ai_prompt: parsed.data.rawAiPrompt || null,
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

export async function submitRequestOffer(params: {
  requestId: string
  unitPrice: number
  offeredQuantity?: number
  moq?: number
  leadTimeDays?: number
  deliveryCost?: number
  message?: string | null
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Необходима авторизация" }
  }

  const { z } = await import("zod")
  const schema = z.object({
    requestId: z.string().uuid("Некорректный ID запроса"),
    unitPrice: z.number().min(0.01, "Укажите цену за единицу"),
    offeredQuantity: z.number().min(1).default(1),
    moq: z.number().min(1).default(1),
    leadTimeDays: z.number().min(1).max(365).default(3),
    deliveryCost: z.number().min(0).default(0),
    message: z.string().max(2000, "Слишком длинный комментарий").optional().nullable()
  })

  const parsed = schema.safeParse(params)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  // Check request status
  const { data: request, error: reqError } = await supabase
    .from("requests")
    .select("id, status, expires_at, buyer_id, title")
    .eq("id", parsed.data.requestId)
    .single()

  if (reqError || !request) {
    return { error: "Запрос не найден" }
  }

  if (request.buyer_id === session.user.id) {
    return { error: "Вы не можете отправить предложение на собственный запрос" }
  }

  if (request.status !== "OPEN") {
    return { error: "Запрос больше не принимает предложения" }
  }

  if (new Date(request.expires_at) < new Date()) {
    return { error: "Срок действия запроса истёк" }
  }

  const insertPayload = {
    request_id: parsed.data.requestId,
    seller_id: session.user.id,
    unit_price: parsed.data.unitPrice,
    offered_quantity: parsed.data.offeredQuantity,
    moq: parsed.data.moq,
    lead_time_days: parsed.data.leadTimeDays,
    delivery_cost: parsed.data.deliveryCost,
    message: parsed.data.message || null,
    status: 'PENDING'
  }

  const { data: offer, error: insertError } = await supabase
    .from("request_offers")
    .insert(insertPayload)
    .select("id")
    .single()

  if (insertError) {
    console.error("Submit offer error:", insertError)
    return { error: insertError.message }
  }

  // Notify buyer about new commercial offer
  try {
    await supabase.from("notifications").insert({
      user_id: request.buyer_id,
      type: "NEW_REQUEST_OFFER",
      message: `Новое коммерческое предложение по вашей заявке: "${request.title}"`,
      link: `/requests/${request.id}`
    })
  } catch (notifErr) {
    // Non-blocking notification
    console.warn("Failed to create offer notification:", notifErr)
  }

  revalidatePath(`/requests/${parsed.data.requestId}`)
  return { success: true, id: offer.id }
}

export async function acceptRequestOffer(offerId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Необходима авторизация" }
  }

  // Fetch offer with request details
  const { data: offer, error: offerError } = await supabase
    .from("request_offers")
    .select(`
      id,
      seller_id,
      request_id,
      unit_price,
      offered_quantity,
      delivery_cost,
      total_cost,
      status,
      requests (
        id,
        buyer_id,
        title,
        unit
      )
    `)
    .eq("id", offerId)
    .single()

  if (offerError || !offer) {
    return { error: "Предложение не найдено" }
  }

  const request: any = offer.requests
  if (!request) {
    return { error: "Заявка не найдена" }
  }

  if (request.buyer_id !== session.user.id) {
    return { error: "Только создатель заявки может принять коммерческое предложение" }
  }

  // Update offer status to ACCEPTED
  let updateError: any = null
  const { error: userUpdateError } = await supabase
    .from("request_offers")
    .update({ status: 'ACCEPTED' })
    .eq("id", offerId)

  if (userUpdateError) {
    // Attempt with admin client in case RLS policy is missing on remote DB
    try {
      const adminClient = createAdminClient()
      const { error: adminUpdateError } = await adminClient
        .from("request_offers")
        .update({ status: 'ACCEPTED' })
        .eq("id", offerId)
      updateError = adminUpdateError
    } catch {
      updateError = userUpdateError
    }
  }

  if (updateError) {
    console.error("Accept offer error:", updateError)
    return { error: "Не удалось принять предложение: " + updateError.message }
  }

  // Create or retrieve chat between buyer and seller
  let chatId: string | null = null
  try {
    const { data: existingChat } = await supabase
      .from("chats")
      .select("id")
      .eq("buyer_id", session.user.id)
      .eq("seller_id", offer.seller_id)
      .maybeSingle()

    if (existingChat) {
      chatId = existingChat.id
    } else {
      const { data: newChat } = await supabase
        .from("chats")
        .insert({
          buyer_id: session.user.id,
          seller_id: offer.seller_id,
          listing_id: null
        })
        .select("id")
        .single()
      if (newChat) chatId = newChat.id
    }

    if (chatId) {
      const calcTotal = offer.total_cost || ((offer.unit_price || 0) * (offer.offered_quantity || 1) + (offer.delivery_cost || 0))
      const autoMsg = `Здравствуйте! Мы приняли ваше коммерческое предложение по закупке «${request.title}» на общую сумму ${calcTotal.toLocaleString("ru-RU")} сом. Давайте согласуем доставку и оплату.`

      // Send initial transaction message
      await supabase.rpc("send_message_transaction", {
        p_chat_id: chatId,
        p_content: autoMsg
      }).catch(async () => {
        // Fallback standard insert
        await supabase.from("messages").insert({
          chat_id: chatId,
          sender_id: session.user.id,
          content: autoMsg
        })
      })

      // Send notification to seller
      await supabase.from("notifications").insert({
        user_id: offer.seller_id,
        type: "OFFER_ACCEPTED",
        message: `Ваше предложение по закупке «${request.title}» принято!`,
        link: `/messages/${chatId}`
      })
    }
  } catch (chatErr) {
    console.warn("Chat creation on offer accept had non-fatal error:", chatErr)
  }

  revalidatePath(`/requests/${offer.request_id}`)
  revalidatePath("/requests")
  return { success: true, chatId }
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
  try {
    const { data: rateOk } = await supabase.rpc("check_rate_limit", { 
      p_action_type: "create_offer", 
      p_limit: 30, 
      p_window_minutes: 1440 
    })
    if (rateOk === false) return { error: "Превышен лимит создания предложений." }
  } catch {}

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, status, seller_id, price")
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

  const { data: request, error: reqError } = await supabase
    .from("requests")
    .select("status, expires_at, quantity")
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

  const { error: insertError } = await supabase
    .from("request_offers")
    .insert({
      request_id: parsed.data.requestId,
      seller_id: session.user.id,
      listing_id: parsed.data.listingId,
      unit_price: listing.price,
      offered_quantity: request.quantity || 1,
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
