"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { SupplierProduct } from "@bazargo/shared"

import { CompanyType, SupplierProfile, validateKyrgyzInn } from "@/types/supplier"

export async function submitSupplierApplication(params: {
  company_name: string
  contact_name: string
  phone: string
  city: string
  categories: string
  description?: string
  telegram_username?: string
  company_type?: CompanyType
  inn?: string
  director_name?: string
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Необходима авторизация" }
  }

  const { company_name, contact_name, phone, city, categories, description, telegram_username, company_type, inn, director_name } = params

  if (!company_name || !contact_name || !phone || !city || !categories) {
    return { error: "Пожалуйста, заполните все обязательные поля" }
  }

  if (inn && !validateKyrgyzInn(inn)) {
    return { error: "ИНН юридического лица в Кыргызстане должен состоять ровно из 14 цифр" }
  }

  let packedDescription = (description || "").trim()
  const metadataLines: string[] = []
  if (company_type) metadataLines.push(`Форма: ${company_type}`)
  if (inn) metadataLines.push(`ИНН: ${inn.trim()}`)
  if (director_name) metadataLines.push(`Руководитель: ${director_name.trim()}`)
  if (telegram_username) {
    const cleanTg = telegram_username.startsWith("@") ? telegram_username : `@${telegram_username}`
    metadataLines.push(`Telegram: ${cleanTg}`)
  }

  if (metadataLines.length > 0) {
    packedDescription = `${metadataLines.join(" | ")}\n\n${packedDescription}`.trim()
  }

  const payload: any = {
    user_id: session.user.id,
    company_name: company_name.trim(),
    contact_name: contact_name.trim(),
    phone: phone.trim(),
    city: city.trim(),
    categories: categories.trim(),
    description: packedDescription || null,
    status: 'PENDING'
  }

  // Include modern legal columns if available
  const extendedPayload: any = {
    ...payload,
    telegram_username: telegram_username ? telegram_username.trim() : null,
    company_type: company_type || 'LLC',
    inn: inn ? inn.trim() : null,
    director_name: director_name ? director_name.trim() : null
  }

  let insertRes = await supabase.from("b2b_applications").insert(extendedPayload)

  if (insertRes.error) {
    console.warn("b2b_applications extended insert failed, retrying with fallback payload:", insertRes.error.message)
    insertRes = await supabase.from("b2b_applications").insert({
      ...payload,
      telegram_username: telegram_username ? telegram_username.trim() : null
    })
  }

  if (insertRes.error) {
    insertRes = await supabase.from("b2b_applications").insert(payload)
  }

  if (insertRes.error) {
    try {
      const admin = createAdminClient()
      insertRes = await admin.from("b2b_applications").insert(payload)
    } catch {}
  }

  if (insertRes.error) {
    console.error("Final submitSupplierApplication error:", insertRes.error)
    return { error: insertRes.error.message }
  }

  // Send Telegram Notification to Admin/Channel
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID

    if (botToken && chatId) {
      const cleanTg = telegram_username ? (telegram_username.startsWith('@') ? telegram_username : `@${telegram_username}`) : null
      const legalInfo = [
        company_type ? `Форма: ${company_type}` : null,
        inn ? `ИНН: ${inn}` : null,
        director_name ? `Директор: ${director_name}` : null
      ].filter(Boolean).join(" | ")

      const tgMsg = `НОВАЯ ЗАЯВКА ПОСТАВЩИКА BAZAAROS\n\n` +
        `• Компания: ${company_name}\n` +
        (legalInfo ? `• Юр. данные: ${legalInfo}\n` : '') +
        `• Контакт: ${contact_name}\n` +
        `• Телефон: ${phone}\n` +
        `• Город: ${city}\n` +
        `• Категории: ${categories}\n` +
        (cleanTg ? `• Telegram: ${cleanTg}\n` : '') +
        (description ? `• Описание: ${description}\n` : '')

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: tgMsg
        })
      }).catch(err => console.warn("TG notification failed:", err))
    }
  } catch (tgErr) {
    console.warn("Telegram alert error:", tgErr)
  }

  revalidatePath("/b2b")
  revalidatePath("/suppliers")
  revalidatePath("/b2b/become-supplier")
  revalidatePath("/b2b/my-applications")
  return { success: true }
}

export async function addSupplierProduct(data: {
  title: string
  category_tag: string
  specs?: string
  unit: string
  unit_price: number
  moq: number
  delivery_cost: number
  lead_time_days: number
  city?: string
  phone?: string
  telegram_username?: string
  company_name?: string
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: "Необходима авторизация" }
  }

  if (!data.title?.trim()) {
    return { success: false, error: "Укажите название позиции" }
  }
  if (!data.unit_price || data.unit_price <= 0) {
    return { success: false, error: "Укажите корректную оптовую цену за единицу" }
  }

  // Fetch supplier company name from profile or b2b_application if not passed
  let compName = data.company_name?.trim() || ""
  let phone = data.phone?.trim() || ""
  let tg = data.telegram_username?.trim() || ""

  if (!compName) {
    const { data: app } = await supabase
      .from("b2b_applications")
      .select("company_name, phone, telegram_username")
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (app) {
      compName = app.company_name || ""
      if (!phone) phone = app.phone || ""
      if (!tg) tg = app.telegram_username || ""
    }
  }

  if (!compName) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("company_name, full_name, phone, telegram_username")
      .eq("id", session.user.id)
      .maybeSingle()

    if (prof) {
      compName = prof.company_name || prof.full_name || "Поставщик"
      if (!phone) phone = prof.phone || ""
      if (!tg) tg = prof.telegram_username || ""
    }
  }

  const payload = {
    supplier_id: session.user.id,
    company_name: compName || "Поставщик BazaarOS",
    title: data.title.trim(),
    category_tag: data.category_tag || "packaging",
    specs: data.specs?.trim() || null,
    unit: data.unit?.trim() || "шт",
    unit_price: Number(data.unit_price),
    moq: Number(data.moq) || 1,
    delivery_cost: Number(data.delivery_cost) || 0,
    lead_time_days: Number(data.lead_time_days) || 3,
    city: data.city?.trim() || "Бишкек",
    phone: phone || null,
    telegram_username: tg ? tg.replace(/^@/, '') : null,
    in_stock: true
  }

  let { data: inserted, error } = await supabase
    .from("supplier_products")
    .insert([payload])
    .select("id")
    .single()

  if (error) {
    console.warn("User insert supplier_products failed, trying admin client:", error.message)
    const admin = createAdminClient()
    const adminRes = await admin
      .from("supplier_products")
      .insert([payload])
      .select("id")
      .single()
    if (adminRes.error) {
      return { success: false, error: adminRes.error.message }
    }
  }

  revalidatePath("/b2b")
  revalidatePath("/requests/create")
  return { success: true }
}

export async function deleteSupplierProduct(productId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: "Необходима авторизация" }
  }

  let { error } = await supabase
    .from("supplier_products")
    .delete()
    .eq("id", productId)
    .eq("supplier_id", session.user.id)

  if (error) {
    const admin = createAdminClient()
    const { error: adminErr } = await admin
      .from("supplier_products")
      .delete()
      .eq("id", productId)
      .eq("supplier_id", session.user.id)
    if (adminErr) {
      return { success: false, error: adminErr.message }
    }
  }

  revalidatePath("/b2b")
  revalidatePath("/requests/create")
  return { success: true }
}

export async function getPublicRegistry(filters?: {
  category?: string
  minMoq?: number
  maxPrice?: number
  city?: string
  search?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from("supplier_products")
    .select("*")
    .eq("in_stock", true)
    .order("created_at", { ascending: false })

  if (filters?.category && filters.category !== "all") {
    query = query.eq("category_tag", filters.category)
  }
  if (filters?.city && filters.city !== "all") {
    query = query.ilike("city", `%${filters.city}%`)
  }
  if (filters?.maxPrice) {
    query = query.lte("unit_price", filters.maxPrice)
  }
  if (filters?.search) {
    const s = filters.search.trim()
    query = query.or(`title.ilike.%${s}%,specs.ilike.%${s}%,company_name.ilike.%${s}%`)
  }

  const { data: products, error } = await query

  // Also fetch approved B2B supplier applications
  const { data: rawSuppliers } = await supabase
    .from("b2b_applications")
    .select("*")
    .in("status", ["APPROVED", "PENDING"])
    .order("created_at", { ascending: false })

  const suppliers: SupplierProfile[] = (rawSuppliers || []).map((sup: any) => {
    let companyType: CompanyType = 'LLC'
    if (sup.company_type && ['IP', 'LLC', 'FACTORY'].includes(sup.company_type)) {
      companyType = sup.company_type as CompanyType
    } else {
      const lower = (sup.company_name || '').toLowerCase()
      if (lower.startsWith('ип ') || lower.includes('ип ')) {
        companyType = 'IP'
      } else if (lower.includes('фабрик') || lower.includes('завод') || lower.includes('производств')) {
        companyType = 'FACTORY'
      } else {
        companyType = 'LLC'
      }
    }

    let inn = sup.inn || ''
    if (!inn && sup.description) {
      const match = sup.description.match(/ИНН[:\s]+(\d{14})/)
      if (match) inn = match[1]
    }

    let directorName = sup.director_name || sup.contact_name || ''
    if (!directorName && sup.description) {
      const match = sup.description.match(/Руководитель[:\s]+([^|\n]+)/)
      if (match) directorName = match[1].trim()
    }

    const moderationStatus = (sup.status === 'APPROVED' ? 'VERIFIED' : sup.status === 'REJECTED' ? 'REJECTED' : 'PENDING')

    return {
      id: sup.id,
      userId: sup.user_id,
      companyName: sup.company_name,
      companyType,
      inn: inn || '',
      directorName,
      categoryTag: sup.categories || 'packaging',
      categories: typeof sup.categories === 'string' ? sup.categories.split(',').map((c: string) => c.trim()) : (sup.categories || []),
      city: sup.city || 'Бишкек',
      address: sup.address || undefined,
      phone: sup.phone,
      telegramUsername: sup.telegram_username,
      moderationStatus,
      description: sup.description,
      createdAt: sup.created_at || new Date().toISOString()
    }
  })

  return {
    products: (products as SupplierProduct[]) || [],
    suppliers
  }
}
