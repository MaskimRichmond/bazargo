"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { guessRegionByCity } from "@/lib/regions"
import { sendTelegramNotification } from "@/lib/telegram"

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

export async function createRequest(dataOrFormData: FormData | {
  title: string
  quantity?: number
  unit?: string
  specs?: string
  maxPrice?: number | null
  totalBudget?: number | null
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
      totalBudget: dataOrFormData.get("totalBudget") ? parseFloat(dataOrFormData.get("totalBudget") as string) : null,
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
      maxPrice: dataOrFormData.maxPrice ?? dataOrFormData.budgetMax ?? null,
      totalBudget: dataOrFormData.totalBudget ?? null
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
    totalBudget: z.number().min(0).max(1000000000).optional().nullable(),
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

  const days = parsed.data.deadlineDays
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + days)

  const city = parsed.data.city || "Бишкек"
  const region = parsed.data.region || guessRegionByCity(city) || "Бишкек"

  const quantity = parsed.data.quantity
  let totalBudgetVal = parsed.data.totalBudget ?? null
  let maxPriceVal = parsed.data.maxPrice ?? null

  if (totalBudgetVal && !maxPriceVal && quantity > 0) {
    maxPriceVal = Math.round((totalBudgetVal / quantity) * 100) / 100
  } else if (maxPriceVal && !totalBudgetVal) {
    totalBudgetVal = Math.round(maxPriceVal * quantity * 100) / 100
  }

  const fullPayload: any = {
    buyer_id: session.user.id,
    user_id: session.user.id,
    title: parsed.data.title,
    category_id: parsed.data.categoryId || null,
    category_tag: parsed.data.categoryTag || "packaging",
    specs: parsed.data.specs || null,
    quantity,
    unit: parsed.data.unit,
    max_price: maxPriceVal,
    total_budget: totalBudgetVal,
    budget: totalBudgetVal,
    budget_max: totalBudgetVal,
    description: parsed.data.description || null,
    condition: parsed.data.condition === "ANY" ? null : (parsed.data.condition || null),
    region,
    city,
    deadline_days: days,
    raw_ai_prompt: parsed.data.rawAiPrompt || null,
    expires_at: expiresAt.toISOString(),
    status: 'OPEN'
  }

  let insertResult = await supabase
    .from("requests")
    .insert(fullPayload)
    .select("id")
    .single()

  // If anti-spam trigger error or general validation error (not column cache error), return error immediately
  if (insertResult.error && !isSchemaColumnError(insertResult.error)) {
    console.error("Create request rejected by database rules/anti-spam:", insertResult.error.message)
    return { error: insertResult.error.message }
  }

  // Fallback 1: If total_budget, max_price or new columns are missing in PostgREST schema cache
  if (insertResult.error && isSchemaColumnError(insertResult.error)) {
    console.warn("Primary createRequest insert had schema cache error, trying resilient fallback:", insertResult.error)

    const packedDescription = [
      parsed.data.description?.trim() || "",
      "\n--- [BazaarOS B2B RFQ Спецификация] ---",
      `Категория: ${parsed.data.categoryTag || "packaging"}`,
      `Количество: ${quantity} ${parsed.data.unit || "шт"}`,
      parsed.data.specs ? `Характеристики: ${parsed.data.specs}` : "",
      totalBudgetVal ? `Общий бюджет: ${totalBudgetVal} сом` : "",
      maxPriceVal ? `Желаемая цена: ${maxPriceVal} сом/${parsed.data.unit || "шт"}` : "",
      `Срок доставки: до ${days} дн.`
    ].filter(Boolean).join("\n").trim()

    const fallbackPayload: any = {
      buyer_id: session.user.id,
      user_id: session.user.id,
      title: parsed.data.title,
      description: packedDescription,
      city,
      region,
      status: 'OPEN',
      expires_at: expiresAt.toISOString()
    }
    if (parsed.data.categoryId) fallbackPayload.category_id = parsed.data.categoryId
    if (totalBudgetVal) fallbackPayload.budget = totalBudgetVal
    if (maxPriceVal) fallbackPayload.max_price = maxPriceVal

    insertResult = await supabase
      .from("requests")
      .insert(fallbackPayload)
      .select("id")
      .single()
  }

  if (insertResult.error) {
    console.error("Create request final error:", insertResult.error)
    return { error: insertResult.error.message }
  }

  const newRequest = insertResult.data

  // Broadcast new RFQ to Telegram channel (strictly no emojis)
  try {
    const budgetStr = totalBudgetVal 
      ? `до ${Math.round(totalBudgetVal).toLocaleString("ru-RU")} сом${maxPriceVal ? ` (до ${maxPriceVal} сом / ед.)` : ''}`
      : (maxPriceVal ? `до ${maxPriceVal} сом / ед.` : 'По согласованию')

    const tgMessage =
      `НОВЫЙ B2B-ЗАПРОС НА ЗАКУПКУ\n\n` +
      `• Товар: ${parsed.data.title}\n` +
      `• Партия: ${quantity.toLocaleString("ru-RU")} ${parsed.data.unit}\n` +
      `• Бюджет закупки: ${budgetStr}\n` +
      `• Город: ${city}\n` +
      `• Срок поставки: до ${days} дней`

    await sendTelegramNotification(tgMessage)
  } catch (telegramError) {
    console.error("[Telegram Action Error]:", telegramError)
  }

  revalidatePath("/requests")
  revalidatePath("/my-requests")
  return { success: true, id: newRequest.id }
}

export async function submitRequestOffer(params: {
  requestId: string
  unitPrice: number
  offeredQuantity?: number
  moq?: number
  leadTimeDays?: number
  deliveryCost?: number
  message?: string | null
  isTestMode?: boolean
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
    message: z.string().max(2000, "Слишком длинный комментарий").optional().nullable(),
    isTestMode: z.boolean().optional().default(false)
  })

  const parsed = schema.safeParse(params)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { data: request, error: reqError } = await supabase
    .from("requests")
    .select("id, status, expires_at, buyer_id, title")
    .eq("id", parsed.data.requestId)
    .single()

  if (reqError || !request) {
    return { error: "Запрос не найден" }
  }

  const isOwner = (request.buyer_id === session.user.id) || ((request as any).user_id === session.user.id)
  if (isOwner) {
    return { error: "Вы не можете отправить предложение на собственный запрос" }
  }

  if (request.status !== "OPEN") {
    return { error: "Запрос больше не принимает предложения" }
  }

  if (new Date(request.expires_at) < new Date()) {
    return { error: "Срок действия запроса истёк" }
  }

  const totalCost = (parsed.data.unitPrice * parsed.data.offeredQuantity) + parsed.data.deliveryCost

  const insertPayload = {
    request_id: parsed.data.requestId,
    seller_id: session.user.id,
    supplier_id: session.user.id,
    unit_price: parsed.data.unitPrice,
    offered_quantity: parsed.data.offeredQuantity,
    moq: parsed.data.moq,
    lead_time_days: parsed.data.leadTimeDays,
    delivery_cost: parsed.data.deliveryCost,
    total_cost: totalCost,
    message: parsed.data.message || null,
    status: 'PENDING'
  }

  let offerResult = await supabase
    .from("request_offers")
    .insert(insertPayload)
    .select("id")
    .single()

  if (offerResult.error && isSchemaColumnError(offerResult.error)) {
    console.warn("Primary submitRequestOffer failed with schema error, attempting fallback:", offerResult.error)

    const fallbackPayload: any = {
      request_id: parsed.data.requestId,
      seller_id: session.user.id,
      unit_price: parsed.data.unitPrice,
      offered_quantity: parsed.data.offeredQuantity,
      message: parsed.data.message || null,
      status: 'PENDING'
    }

    offerResult = await supabase
      .from("request_offers")
      .insert(fallbackPayload)
      .select("id")
      .single()
  }

  if (offerResult.error) {
    console.error("Submit offer final error:", offerResult.error)
    return { error: offerResult.error.message }
  }

  const offer = offerResult.data

  try {
    await supabase.from("notifications").insert({
      user_id: request.buyer_id,
      type: "NEW_REQUEST_OFFER",
      message: `Новое коммерческое предложение по вашей заявке: "${request.title}"`,
      link: `/requests/${request.id}`
    })
  } catch (notifErr) {
    console.warn("Failed to create offer notification:", notifErr)
  }

  revalidatePath(`/requests/${parsed.data.requestId}`)
  return { success: true, id: offer.id }
}

export async function acceptRequestOffer(offerId: string): Promise<{ success: boolean; chatId?: string | null; error?: string }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: "Необходима авторизация" }
  }

  // 1. Primary: Call database RPC accept_b2b_offer(p_offer_id UUID)
  try {
    const { data: chatId, error: rpcErr } = await supabase.rpc("accept_b2b_offer", {
      p_offer_id: offerId
    })

    if (!rpcErr && chatId) {
      revalidatePath("/requests")
      revalidatePath("/my-requests")
      return { success: true, chatId }
    }
    if (rpcErr) {
      console.warn("accept_b2b_offer RPC returned error, using resilient fallback:", rpcErr)
    }
  } catch (rpcEx) {
    console.warn("accept_b2b_offer RPC exception:", rpcEx)
  }

  // 2. Resilient Fallback: update offer, update request, create chat
  const { data: offer, error: offerError } = await supabase
    .from("request_offers")
    .select(`
      id,
      seller_id,
      supplier_id,
      request_id,
      unit_price,
      offered_quantity,
      delivery_cost,
      total_cost,
      status,
      requests (
        id,
        buyer_id,
        user_id,
        title,
        unit
      )
    `)
    .eq("id", offerId)
    .single()

  if (offerError || !offer) {
    return { success: false, error: "Предложение не найдено" }
  }

  const request: any = offer.requests
  const supplierId = offer.seller_id || (offer as any).supplier_id
  const buyerId = request?.buyer_id || request?.user_id

  if (buyerId !== session.user.id) {
    return { success: false, error: "Только создатель заявки может утвердить предложение" }
  }

  // Update offer status to ACCEPTED
  await supabase
    .from("request_offers")
    .update({ status: 'ACCEPTED' })
    .eq("id", offerId)

  // Close request
  await supabase
    .from("requests")
    .update({ status: 'CLOSED' })
    .eq("id", offer.request_id)

  // Create chat
  let chatId: string | null = null
  try {
    const { data: existingChat } = await supabase
      .from("chats")
      .select("id")
      .or(`and(buyer_id.eq.${session.user.id},seller_id.eq.${supplierId}),and(buyer_id.eq.${supplierId},seller_id.eq.${session.user.id})`)
      .maybeSingle()

    if (existingChat) {
      chatId = existingChat.id
    } else {
      const { data: newChat } = await supabase
        .from("chats")
        .insert({
          buyer_id: session.user.id,
          seller_id: supplierId,
          listing_id: null
        })
        .select("id")
        .single()
      if (newChat) chatId = newChat.id
    }

    if (chatId) {
      const calcTotal = offer.total_cost || ((offer.unit_price || 0) * (offer.offered_quantity || 1) + (offer.delivery_cost || 0))
      const autoMsg = `Здравствуйте! Мы приняли ваше коммерческое предложение по закупке «${request?.title || 'Товар'}» на общую сумму ${calcTotal.toLocaleString("ru-RU")} сом. Давайте согласуем доставку и оплату.`

      await supabase.from("messages").insert({
        chat_id: chatId,
        sender_id: session.user.id,
        content: autoMsg
      })
    }
  } catch (chatErr) {
    console.warn("Chat creation on fallback had non-fatal error:", chatErr)
  }

  revalidatePath(`/requests/${offer.request_id}`)
  revalidatePath("/requests")
  revalidatePath("/my-requests")
  return { success: true, chatId }
}

export async function contactSupplierDirect(params: {
  supplierId: string
  requestId?: string | null
  message?: string | null
}): Promise<{ success: boolean; chatId?: string | null; error?: string }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: "Необходима авторизация для связи с поставщиком" }
  }

  const { supplierId, requestId, message } = params
  const initialMessage = message || "Здравствуйте! Хочу заказать партию по вашему оптовому прайсу в BazaarOS."

  // 1. Call database RPC start_b2b_chat(p_partner_id UUID, p_request_id UUID, p_initial_message TEXT)
  try {
    const { data: chatId, error: rpcErr } = await supabase.rpc("start_b2b_chat", {
      p_partner_id: supplierId,
      p_request_id: requestId ?? null,
      p_initial_message: initialMessage
    })

    if (!rpcErr && chatId) {
      revalidatePath(`/messages/${chatId}`)
      return { success: true, chatId }
    }
    if (rpcErr) {
      console.warn("start_b2b_chat RPC error, falling back:", rpcErr)
    }
  } catch (rpcEx) {
    console.warn("start_b2b_chat RPC exception:", rpcEx)
  }

  // 2. Resilient fallback
  try {
    const { data: existingChat } = await supabase
      .from("chats")
      .select("id")
      .or(`and(buyer_id.eq.${session.user.id},seller_id.eq.${supplierId}),and(buyer_id.eq.${supplierId},seller_id.eq.${session.user.id})`)
      .maybeSingle()

    let finalChatId = existingChat?.id

    if (!finalChatId) {
      const { data: newChat, error: newChatErr } = await supabase
        .from("chats")
        .insert({
          buyer_id: session.user.id,
          seller_id: supplierId,
          listing_id: null
        })
        .select("id")
        .single()

      if (newChatErr) throw newChatErr
      finalChatId = newChat.id
    }

    if (finalChatId) {
      await supabase.from("messages").insert({
        chat_id: finalChatId,
        sender_id: session.user.id,
        content: initialMessage
      })
      revalidatePath(`/messages/${finalChatId}`)
      return { success: true, chatId: finalChatId }
    }
  } catch (fallbackErr: any) {
    console.error("contactSupplierDirect fallback error:", fallbackErr)
    return { success: false, error: fallbackErr.message || "Не удалось открыть диалог с поставщиком" }
  }

  return { success: false, error: "Не удалось создать чат" }
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
    .or(`buyer_id.eq.${session.user.id},user_id.eq.${session.user.id}`)

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

export async function deleteRequest(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: "Необходима авторизация" }
  }

  // 1. Primary: Call database RPC delete_own_request(p_request_id UUID)
  try {
    const { error: rpcError } = await supabase.rpc("delete_own_request", {
      p_request_id: id
    })

    if (!rpcError) {
      revalidatePath("/requests")
      revalidatePath("/my-requests")
      revalidatePath(`/requests/${id}`)
      return { success: true }
    }

    console.warn("delete_own_request RPC had error, falling back to admin client:", rpcError)
  } catch (rpcEx) {
    console.warn("delete_own_request RPC exception:", rpcEx)
  }

  // 2. Resilient fallback: verify ownership and delete
  const userId = session.user.id
  try {
    const admin = createAdminClient()
    const { data: req } = await admin
      .from("requests")
      .select("id, buyer_id, user_id")
      .eq("id", id)
      .maybeSingle()

    if (!req) {
      return { success: false, error: "Запрос не найден" }
    }
    if (req.buyer_id !== userId && req.user_id !== userId) {
      return { success: false, error: "У вас нет прав на удаление этого запроса" }
    }

    await admin.from("request_offers").delete().eq("request_id", id)
    const { error: delErr } = await admin.from("requests").delete().eq("id", id)

    if (delErr) throw delErr

    revalidatePath("/requests")
    revalidatePath("/my-requests")
    revalidatePath(`/requests/${id}`)
    return { success: true }
  } catch (err: any) {
    console.error("Delete request fallback error:", err)
    return { success: false, error: err.message || "Ошибка при удалении заявки" }
  }
}

export interface SupplierSearchResult {
  id: string
  name: string
  city: string
  category: string
  description?: string
  phone?: string
  telegram_username?: string
  isVerified: boolean
  source: "supplier_product" | "b2b_partner"
  productId?: string
  supplierId?: string
  title?: string
  specs?: string
  unit?: string
  unitPrice?: number
  moq?: number
  deliveryCost?: number
  leadTimeDays?: number
  totalCost?: number
  fitsMoq?: boolean
}

export async function searchSuppliers(params: {
  categoryTag?: string
  text?: string
  city?: string
  quantity?: number
}): Promise<{ suppliers: SupplierSearchResult[] }> {
  const results: SupplierSearchResult[] = []
  const cat = params.categoryTag || "packaging"
  const city = params.city || "Бишкек"
  const searchKeyword = (params.text || "").toLowerCase().trim()
  const reqQty = Number(params.quantity) || 1

  // 1. Search in REAL supplier_products table
  try {
    const supabase = await createClient()
    let prodQuery = supabase
      .from("supplier_products")
      .select("*")
      .eq("in_stock", true)

    if (cat && cat !== "other") {
      prodQuery = prodQuery.eq("category_tag", cat)
    }

    const { data: products } = await prodQuery.limit(10)

    if (products && products.length > 0) {
      for (const prod of products) {
        const titleStr = (prod.title || "").toLowerCase()
        const specsStr = (prod.specs || "").toLowerCase()
        const compStr = (prod.company_name || "").toLowerCase()

        const matchesKeyword = !searchKeyword ||
          titleStr.includes(searchKeyword) ||
          specsStr.includes(searchKeyword) ||
          compStr.includes(searchKeyword)

        if (matchesKeyword) {
          const unitPrice = Number(prod.unit_price) || 0
          const deliveryCost = Number(prod.delivery_cost) || 0
          const moq = Number(prod.moq) || 1
          const totalCost = (unitPrice * reqQty) + deliveryCost
          const fitsMoq = reqQty >= moq

          results.push({
            id: prod.id,
            productId: prod.id,
            supplierId: prod.supplier_id,
            name: prod.company_name || "Поставщик",
            title: prod.title,
            specs: prod.specs || undefined,
            unit: prod.unit || "шт",
            city: prod.city || city,
            category: prod.category_tag || cat,
            unitPrice,
            moq,
            deliveryCost,
            leadTimeDays: prod.lead_time_days || 3,
            totalCost,
            fitsMoq,
            phone: prod.phone || undefined,
            telegram_username: prod.telegram_username || undefined,
            isVerified: true,
            source: "supplier_product"
          })
        }
      }
    }
  } catch (prodErr) {
    console.warn("supplier_products search non-fatal error:", prodErr)
  }

  // 2. Search in REAL b2b_applications table
  try {
    const admin = createAdminClient()
    const { data: apps } = await admin
      .from("b2b_applications")
      .select("id, user_id, company_name, city, categories, description, phone, telegram_username, status")
      .in("status", ["APPROVED", "PENDING"])
      .limit(10)

    if (apps && apps.length > 0) {
      for (const app of apps) {
        const catStr = (app.categories || "").toLowerCase()
        const descStr = (app.description || "").toLowerCase()
        const compStr = (app.company_name || "").toLowerCase()

        const matchesCategory =
          (cat === "packaging" && (catStr.includes("упаков") || catStr.includes("короб") || descStr.includes("короб"))) ||
          (cat === "cups" && (catStr.includes("стакан") || catStr.includes("посуд") || descStr.includes("стакан"))) ||
          (cat === "syrups" && (catStr.includes("сироп") || catStr.includes("кофе") || catStr.includes("horeca"))) ||
          (cat === "food" && (catStr.includes("продукт") || catStr.includes("сырь") || catStr.includes("horeca"))) ||
          (cat === "cleaning" && (catStr.includes("хоз") || catStr.includes("хим") || catStr.includes("моюще"))) ||
          (cat === "textiles" && (catStr.includes("текстил") || catStr.includes("форм") || catStr.includes("спецодежд"))) ||
          (cat === "printing" && (catStr.includes("полиграф") || catStr.includes("печат") || catStr.includes("лого"))) ||
          (cat === "equipment" && (catStr.includes("оборудован") || catStr.includes("кофемашин") || catStr.includes("печ")))

        const matchesKeyword = searchKeyword && (
          compStr.includes(searchKeyword) ||
          catStr.includes(searchKeyword) ||
          descStr.includes(searchKeyword)
        )

        if (matchesCategory || matchesKeyword) {
          // Avoid duplicate supplier if already in results from supplier_products
          const alreadyAdded = results.some(r => r.supplierId === app.user_id || r.name === app.company_name)
          if (!alreadyAdded) {
            results.push({
              id: app.id,
              supplierId: app.user_id,
              name: app.company_name,
              city: app.city || city,
              category: app.categories || "Верифицированный B2B поставщик",
              description: app.description || undefined,
              phone: app.phone || undefined,
              telegram_username: app.telegram_username || undefined,
              isVerified: app.status === "APPROVED",
              source: "b2b_partner"
            })
          }
        }
      }
    }
  } catch (appErr) {
    console.warn("b2b_applications search non-fatal error:", appErr)
  }

  // STRICTLY NO FAKE/CURATED FALLBACKS!
  return { suppliers: results }
}

export async function offerListing(requestId: string, listingId: string, message?: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: "Необходима авторизация" }

  const { data: listing } = await supabase
    .from("listings")
    .select("price")
    .eq("id", listingId)
    .single()

  const unitPrice = Number(listing?.price) || 1

  return submitRequestOffer({
    requestId,
    unitPrice,
    offeredQuantity: 1,
    moq: 1,
    deliveryCost: 0,
    leadTimeDays: 3,
    message: message || undefined
  })
}

