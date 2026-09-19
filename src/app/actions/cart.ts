"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function addToCart(listingId: string, quantity: number = 1) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Необходима авторизация" }
  }

  // Verify listing exists and is ACTIVE
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, status, quantity, listing_type, seller_id")
    .eq("id", listingId)
    .single()

  if (listingError || !listing) {
    return { error: "Товар не найден" }
  }

  if (listing.status !== "ACTIVE") {
    return { error: "Товар больше не доступен" }
  }
  
  if (listing.seller_id === session.user.id) {
    return { error: "Нельзя купить свой собственный товар" }
  }

  if (listing.listing_type === "INVENTORY" && quantity > listing.quantity) {
    return { error: `Доступно только ${listing.quantity} шт.` }
  }

  if (listing.listing_type === "SINGLE" && quantity > 1) {
    quantity = 1
  }

  // Check if already in cart
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", session.user.id)
    .eq("listing_id", listingId)
    .single()

  if (existing) {
    const newQuantity = listing.listing_type === "SINGLE" ? 1 : existing.quantity + quantity
    if (listing.listing_type === "INVENTORY" && newQuantity > listing.quantity) {
      return { error: `Доступно только ${listing.quantity} шт.` }
    }
    
    const { error: updateError } = await supabase
      .from("cart_items")
      .update({ quantity: newQuantity })
      .eq("id", existing.id)

    if (updateError) return { error: "Ошибка при обновлении корзины" }
  } else {
    const { error: insertError } = await supabase
      .from("cart_items")
      .insert({
        user_id: session.user.id,
        listing_id: listingId,
        quantity
      })

    if (insertError) return { error: "Ошибка при добавлении в корзину" }
  }

  revalidatePath("/")
  revalidatePath("/cart")
  return { success: true }
}

export async function updateCartQuantity(cartItemId: string, newQuantity: number) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return { error: "Необходима авторизация" }
  if (newQuantity <= 0) return await removeFromCart(cartItemId)

  // Verify listing stock
  const { data: cartItem } = await supabase
    .from("cart_items")
    .select("listing_id, listings(quantity, listing_type)")
    .eq("id", cartItemId)
    .single()

  if (!cartItem || !cartItem.listings) return { error: "Товар не найден" }

  const listing: any = cartItem.listings
  if (listing.listing_type === "SINGLE" && newQuantity > 1) {
    newQuantity = 1
  } else if (listing.listing_type === "INVENTORY" && newQuantity > listing.quantity) {
    return { error: `Доступно только ${listing.quantity} шт.` }
  }

  const { error } = await supabase
    .from("cart_items")
    .update({ quantity: newQuantity })
    .eq("id", cartItemId)
    .eq("user_id", session.user.id)

  if (error) return { error: "Ошибка при обновлении количества" }
  
  revalidatePath("/cart")
  return { success: true }
}

export async function removeFromCart(cartItemId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return { error: "Необходима авторизация" }

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", cartItemId)
    .eq("user_id", session.user.id)

  if (error) return { error: "Ошибка при удалении товара" }
  
  revalidatePath("/cart")
  return { success: true }
}

export async function checkoutCart() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return { error: "Необходима авторизация" }

  // 1. Fetch cart items with actual listings
  const { data: cartItems, error: cartError } = await supabase
    .from("cart_items")
    .select(`
      id, quantity, listing_id,
      listings (
        id, title, price, status, seller_id, store_id, quantity, listing_type,
        listing_images (url)
      )
    `)
    .eq("user_id", session.user.id)

  if (cartError || !cartItems || cartItems.length === 0) {
    return { error: "Корзина пуста или недоступна" }
  }

  // 2. Validate items
  for (const item of cartItems) {
    const listing: any = item.listings
    if (!listing) return { error: "Один из товаров был удален" }
    if (listing.status !== "ACTIVE") return { error: `Товар "${listing.title}" больше не доступен` }
    if (listing.seller_id === session.user.id) return { error: "Нельзя купить свой собственный товар" }
    if (listing.listing_type === "INVENTORY" && item.quantity > listing.quantity) {
      return { error: `Недостаточно "${listing.title}". В наличии: ${listing.quantity}` }
    }
  }

  // 3. Group by seller
  const bySeller: Record<string, any[]> = {}
  for (const item of cartItems) {
    const listing: any = item.listings
    if (!bySeller[listing.seller_id]) {
      bySeller[listing.seller_id] = []
    }
    bySeller[listing.seller_id].push(item)
  }

  // 4. Create orders
  for (const sellerId in bySeller) {
    const items = bySeller[sellerId]
    const storeId = items[0].listings.store_id || null
    let totalAmount = 0
    
    items.forEach(i => {
      totalAmount += parseFloat(i.listings.price) * i.quantity
    })

    // Create Order
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: session.user.id,
        seller_id: sellerId,
        store_id: storeId,
        status: "PENDING",
        total_amount: totalAmount
      })
      .select("id")
      .single()

    if (orderError || !orderData) {
      console.error(orderError)
      return { error: "Ошибка при создании заказа" }
    }

    // Create Order Items
    const orderItemsPayload = items.map(i => {
      const images = i.listings.listing_images || []
      const imageUrl = images.length > 0 ? images[0].url : null

      return {
        order_id: orderData.id,
        listing_id: i.listing_id,
        quantity: i.quantity,
        unit_price: parseFloat(i.listings.price),
        title_snapshot: i.listings.title,
        image_url_snapshot: imageUrl
      }
    })

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsPayload)

    if (itemsError) {
      console.error(itemsError)
      // Ideally rollback order here, but we are doing best-effort without full RPC tx for insert
    }
  }

  // 5. Clear cart
  await supabase.from("cart_items").delete().eq("user_id", session.user.id)

  revalidatePath("/cart")
  revalidatePath("/orders")
  return { success: true }
}
