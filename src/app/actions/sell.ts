"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from 'uuid'

export async function publishListing(formData: FormData) {
  try {
    const supabase = await createClient()
    if (!supabase) throw new Error("Supabase is not configured")

    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) throw new Error("Не авторизован")

    // 0. Ensure profile exists (self-healing for users created before DB migrations)
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", session.user.id).single()
    if (!profile) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: session.user.id,
        phone: session.user.phone,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || "Пользователь"
      })
      if (profileError) console.error("Self-healing profile creation failed:", profileError)
    }

    // 0. Server-side validation
    const id = formData.get("id") as string
    const type = formData.get("type") as string
    const title = formData.get("title") as string
    const categoryId = formData.get("categoryId") as string
    const price = parseFloat(formData.get("price") as string)
    const condition = formData.get("condition") as string
    const description = formData.get("description") as string
    const quantity = parseInt(formData.get("quantity") as string) || 1
    const city = formData.get("city") as string
    let deliveryMethods = []
    try {
      deliveryMethods = JSON.parse(formData.get("deliveryMethods") as string)
    } catch (e) {}

    if (!title || title.length < 5) throw new Error("Слишком короткое название")
    if (!categoryId) throw new Error("Категория обязательна")
    if (isNaN(price) || price < 0) throw new Error("Некорректная цена")
    if (!city) throw new Error("Город обязателен")

    const publishAsStore = formData.get("publishAsStore") === "true"

    let storeId = null
    // If edit, we should preserve the store_id if it was published as store
    if (id) {
      const { data: existing } = await supabase.from("listings").select("store_id").eq("id", id).single()
      if (existing) storeId = existing.store_id
    } else if (publishAsStore && type === "INVENTORY") {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", session.user.id)
        .eq("status", "APPROVED")
        .single()
      if (store) storeId = store.id
    }

    const payload: any = {
      seller_id: session.user.id,
      store_id: storeId,
      title,
      description,
      category_id: categoryId,
      price,
      condition,
      quantity: type === "INVENTORY" ? quantity : 1,
      listing_type: type,
      city,
      delivery_methods: deliveryMethods,
      status: quantity === 0 ? "OUT_OF_STOCK" : "ACTIVE"
    }

    // 1. Create or Update listing record
    let listingResponse;
    if (id) {
      listingResponse = await supabase.from("listings").update(payload).eq("id", id).eq("seller_id", session.user.id).select("id").single()
    } else {
      listingResponse = await supabase.from("listings").insert(payload).select("id").single()
    }
    
    const { data: listing, error: listingError } = listingResponse;

    if (listingError) {
      throw new Error(`Ошибка базы данных: ${listingError.message} (код ${listingError.code})`)
    }

    const listingId = listing.id

    // 2. Upload images
    const imageUrls: string[] = []
    let uploadFailed = false

    const { data: existingImages } = await supabase.from("listing_images").select("id").eq("listing_id", listingId)
    let totalImages = existingImages ? existingImages.length : 0
    
    for (let i = 0; i < 10; i++) {
      const file = formData.get(`image_${i}`) as File | null
      if (file && file.size > 0) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${session.user.id}/${listingId}/${uuidv4()}.${fileExt}`
        
        const { error: uploadError } = await supabase
          .storage
          .from("product-images")
          .upload(fileName, file)

        if (uploadError) {
          uploadFailed = true
          break
        } else {
          const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName)
          imageUrls.push(publicUrlData.publicUrl)
        }
      }
    }

    if (uploadFailed) {
      if (!id) {
        await supabase.from("listings").delete().eq("id", listingId)
      }
      throw new Error("Ошибка при загрузке изображений. Попробуйте еще раз.")
    }

    // 3. Insert listing images
    if (imageUrls.length > 0) {
      const imageRecords = imageUrls.map((url, index) => ({
        listing_id: listingId,
        url,
        order_index: totalImages + index
      }))

      const { error: imageError } = await supabase
        .from("listing_images")
        .insert(imageRecords)

      if (imageError) {
        if (!id) await supabase.from("listings").delete().eq("id", listingId)
        throw new Error("Ошибка сохранения изображений")
      }
      totalImages += imageUrls.length
    }

    if (totalImages === 0) {
      if (!id) await supabase.from("listings").delete().eq("id", listingId)
      throw new Error("Необходимо загрузить хотя бы одно фото")
    }

    revalidatePath("/")
    revalidatePath("/profile")
    revalidatePath("/my-listings")
    revalidatePath("/catalog")
    
    return { success: true, listingId }
  } catch (err: any) {
    console.error("Publish listing error:", err)
    return { success: false, error: err.message || "Unknown error" }
  }
}
