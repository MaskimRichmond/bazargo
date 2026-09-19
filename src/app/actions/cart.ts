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

  const { error } = await supabase.rpc("create_orders_from_cart")

  if (error) {
    console.error("RPC create_orders_from_cart error:", error)
    return { error: error.message || "Ошибка при оформлении заказа" }
  }

  revalidatePath("/cart")
  revalidatePath("/orders")
  return { success: true }
}
