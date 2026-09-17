"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Utility to generate a basic slug
function generateSlug(text: string) {
  const cyrillicToLatinMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya'
  };

  const transliterated = text
    .toString()
    .toLowerCase()
    .split('')
    .map(char => cyrillicToLatinMap[char] || char)
    .join('');

  return transliterated
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function createStore(formData: FormData) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Необходима авторизация" }
  }

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const categoryId = formData.get("categoryId") as string
  const city = formData.get("city") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const logo = formData.get("logo") as File | null

  if (!name || !categoryId || !city) {
    return { error: "Заполните обязательные поля" }
  }

  let slug = generateSlug(name)
  if (!slug) slug = `store-${Date.now()}`
  
  // Make slug unique
  const { data: existing } = await supabase.from("stores").select("id").eq("slug", slug).maybeSingle()
  if (existing) {
    slug = `${slug}-${Math.floor(Math.random() * 1000)}`
  }

  let logoUrl = null
  if (logo && logo.size > 0) {
    const ext = logo.name.split('.').pop()
    const fileName = `${session.user.id}-${Date.now()}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('store-images')
      .upload(fileName, logo)

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return { error: "Ошибка загрузки логотипа" }
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('store-images')
      .getPublicUrl(fileName)
      
    logoUrl = publicUrl
  }

  const { data: store, error } = await supabase
    .from("stores")
    .insert({
      owner_id: session.user.id,
      name,
      slug,
      description,
      category_id: categoryId,
      city,
      phone,
      email: email || null,
      logo_url: logoUrl,
      status: "APPROVED" // MVP: Auto approve
    })
    .select()
    .single()

  if (error) {
    console.error("Create store error:", error)
    if (error.code === '23505') {
      return { error: "У вас уже есть магазин" } // Unique constraint error if we added one (though we didn't, but logic prevents multiple via checking before call)
    }
    return { error: error.message }
  }

  revalidatePath("/stores")
  revalidatePath("/my-store")
  return { success: true, store }
}

export async function updateStore(storeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Необходима авторизация" }
  }

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const categoryId = formData.get("categoryId") as string
  const city = formData.get("city") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const logo = formData.get("logo") as File | null

  if (!name || !categoryId || !city) {
    return { error: "Заполните обязательные поля" }
  }

  const updates: any = {
    name,
    description,
    category_id: categoryId,
    city,
    phone,
    email: email || null,
    updated_at: new Date().toISOString()
  }

  if (logo && logo.size > 0) {
    const ext = logo.name.split('.').pop()
    const fileName = `${session.user.id}-${Date.now()}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('store-images')
      .upload(fileName, logo)

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return { error: "Ошибка загрузки логотипа" }
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('store-images')
      .getPublicUrl(fileName)
      
    updates.logo_url = publicUrl
  }

  const { error } = await supabase
    .from("stores")
    .update(updates)
    .eq("id", storeId)
    .eq("owner_id", session.user.id) // Security check

  if (error) {
    console.error("Update store error:", error)
    return { error: error.message }
  }

  revalidatePath("/stores")
  revalidatePath("/my-store")
  return { success: true }
}

export async function toggleFollowStore(storeId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Необходима авторизация" }
  }

  // Check if following
  const { data: existing } = await supabase
    .from("follows")
    .select("*")
    .eq("follower_id", session.user.id)
    .eq("followed_store_id", storeId)
    .maybeSingle()

  if (existing) {
    // Unfollow
    const { error: deleteError } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", session.user.id)
      .eq("followed_store_id", storeId)
      
    if (deleteError) return { success: false, error: "Ошибка отписки" }
  } else {
    // Follow
    const { error: insertError } = await supabase
      .from("follows")
      .insert({
        follower_id: session.user.id,
        followed_store_id: storeId
      })
      
    if (insertError) return { success: false, error: "Ошибка подписки" }
  }

  revalidatePath(`/store/[slug]`, "page")
  revalidatePath(`/stores`)
  return { success: true, isFollowing: !existing }
}
