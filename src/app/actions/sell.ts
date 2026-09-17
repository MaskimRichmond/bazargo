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

    // Parse form data
    const id = formData.get("id") as string
    const type = formData.get("type") as string
    const title = formData.get("title") as string
    const categoryId = formData.get("categoryId") as string
    const price = parseFloat(formData.get("price") as string)
    const condition = formData.get("condition") as string
    const description = formData.get("description") as string
    const quantity = parseInt(formData.get("quantity") as string)
    const city = formData.get("city") as string
    const deliveryMethods = JSON.parse(formData.get("deliveryMethods") as string)

    const payload = {
      seller_id: session.user.id,
      title,
      description,
      category_id: categoryId,
      price,
      condition,
      quantity,
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
      console.error("Listing insert error:", {
        message: listingError.message,
        code: listingError.code,
        details: listingError.details,
        hint: listingError.hint,
      })
      throw new Error(`Ошибка базы данных: ${listingError.message} (код ${listingError.code})`)
    }

    const listingId = listing.id

    // 2. Upload images and collect URLs
    // We expect image_0, image_1, etc.
    const imageUrls: string[] = []
    
    for (let i = 0; i < 10; i++) {
      const file = formData.get(`image_${i}`) as File | null
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${session.user.id}/${listingId}/${uuidv4()}.${fileExt}`
        
        const { error: uploadError } = await supabase
          .storage
          .from("product-images")
          .upload(fileName, file)

        if (uploadError) {
          console.error("Upload error:", uploadError)
          // For MVP, we continue even if one image fails, or we could throw. Let's just continue.
        } else {
          const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName)
          imageUrls.push(publicUrlData.publicUrl)
        }
      }
    }

    // 3. Insert listing images
    if (imageUrls.length > 0) {
      const imageRecords = imageUrls.map((url, index) => ({
        listing_id: listingId,
        url,
        order_index: index
      }))

      const { error: imageError } = await supabase
        .from("listing_images")
        .insert(imageRecords)

      if (imageError) {
        console.error("Image insert error:", imageError)
      }
    }

    revalidatePath("/")
    revalidatePath("/profile")
    
    return { success: true, listingId }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
