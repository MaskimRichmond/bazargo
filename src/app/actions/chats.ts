"use server"

import { createClient } from "@/lib/supabase/server"

export async function createChat(listingId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: "Необходима авторизация" }
  }

  // 1. Check if listing exists and get seller_id
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("seller_id")
    .eq("id", listingId)
    .single()

  if (listingError || !listing) {
    return { success: false, error: "Объявление не найдено" }
  }

  if (listing.seller_id === session.user.id) {
    return { success: false, error: "Вы не можете написать самому себе" }
  }

  // 2. Check if chat already exists
  const { data: existingChat, error: existingError } = await supabase
    .from("chats")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", session.user.id)
    .maybeSingle()

  if (existingError) {
    return { success: false, error: "Ошибка при проверке чата" }
  }

  if (existingChat) {
    return { success: true, chatId: existingChat.id }
  }

  // 3. Create new chat
  const { data: newChat, error: createError } = await supabase
    .from("chats")
    .insert({
      listing_id: listingId,
      buyer_id: session.user.id,
      seller_id: listing.seller_id
    })
    .select("id")
    .single()

  if (createError) {
    return { success: false, error: "Ошибка при создании чата" }
  }

  return { success: true, chatId: newChat.id }
}

export async function sendMessage(chatId: string, content: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: "Необходима авторизация" }
  }

  const cleanContent = content?.trim()
  if (!cleanContent) {
    return { success: false, error: "Сообщение не может быть пустым" }
  }
  
  if (cleanContent.length > 2000) {
    return { success: false, error: "Слишком длинное сообщение (максимум 2000 символов)" }
  }

  // Use the RPC to insert message and update chat timestamp atomically
  const { data: message, error } = await supabase
    .rpc("send_message_transaction", {
      p_chat_id: chatId,
      p_content: cleanContent
    })

  if (error) {
    console.error("sendMessage error:", error)
    return { success: false, error: "Ошибка при отправке сообщения" }
  }

  return { success: true, message }
}
