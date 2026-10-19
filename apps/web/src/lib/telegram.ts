/**
 * Telegram notification broadcast utility for BazaarOS B2B
 * STRICT RULE: No emojis. Plain strict text and HTML formatting only.
 */

export async function sendTelegramNotification(message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN || "8847927411:AAEiGdPeIOTnlXL6b5gpbyKhdjxKgQgRTkE"
    const chatId = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID || "@bazaaros_orders_test"

    if (!token || !chatId) {
      console.warn("[Telegram API Warning]: TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID is not configured in environment variables.")
      return { success: false, error: "Credentials not configured" }
    }

    console.log("[Telegram] Sending message to:", chatId)

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    })

    const data = await res.json().catch(() => null)

    if (!data || !data.ok) {
      console.error("[Telegram API Error]:", data?.description || "Unknown error", "Error code:", data?.error_code || res.status)
      return { success: false, error: data?.description || `HTTP ${res.status}` }
    }

    console.log("[Telegram API Success]: Message sent to", chatId)
    return { success: true }
  } catch (err: any) {
    console.error("[Telegram API Error]: Network error dispatching message:", err.message)
    return { success: false, error: err.message }
  }
}
