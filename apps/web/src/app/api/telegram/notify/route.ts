import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { message, chatId } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID

    if (!botToken || !targetChatId) {
      console.log("[Telegram Notify] Bot token or chat ID not set. Notification skipped:", message)
      return NextResponse.json({ success: true, simulated: true })
    }

    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    const tgRes = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: "HTML"
      })
    })

    if (!tgRes.ok) {
      const errText = await tgRes.text()
      console.warn("[Telegram Notify] Telegram API returned non-OK status:", tgRes.status, errText)
      return NextResponse.json({ success: false, error: errText }, { status: 200 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[Telegram Notify] Unexpected error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 200 })
  }
}
