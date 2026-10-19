import { NextRequest, NextResponse } from "next/server"
import { parseRfqFallback, ParsedRfqResponse } from "@/lib/rfq-parser"

export type { ParsedRfqResponse }


export async function POST(req: NextRequest) {
  let prompt = ""
  try {
    const body = await req.json().catch(() => ({}))
    prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""

    const apiKey = process.env.GEMINI_API_KEY

    if (apiKey && prompt) {
      try {
        const systemPrompt = `Ты — AI-ассистент снабжения BazaarOS для B2B-закупок в Кыргызстане.
Твоя задача — извлечь структурированные данные из свободного запроса предпринимателя на закупку.
Верни ТОЛЬКО валидный JSON со следующими полями:
- "title": краткое коммерческое название товара (например: "Коробки картонные 30×20×15 см" или "Двухслойные стаканы 350 мл с крышками")
- "category_tag": строго одно из значений: "packaging", "cups", "syrups", "coffee", "other"
- "specs": точные характеристики, размеры, объем, плотность, цвет (например: "30×20×15 см" или "350 мл, двухслойные")
- "quantity": целое число, количество (например: 300, по умолчанию 1)
- "unit": единица измерения ("шт", "коробок", "стаканов", "уп", "кг", "л", "бутылок", "рулонов")
- "max_price": максимальная желаемая цена за 1 единицу в сомах (число, например 80 или 4.5, либо null если не указана)
- "city": город доставки в Кыргызстане (например: "Бишкек", "Ош", по умолчанию "Бишкек")
- "deadline_days": срок поставки в днях (целое число, например 7, по умолчанию 7)`

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: systemPrompt },
                    { text: `Запрос предпринимателя: "${prompt}"` }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1
              }
            }),
            signal: AbortSignal.timeout(6000)
          }
        )

        if (res.ok) {
          const geminiData = await res.json().catch(() => null)
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
          if (rawText) {
            const parsed = JSON.parse(rawText)
            const validTags: Array<ParsedRfqResponse["category_tag"]> = [
              "packaging",
              "cups",
              "syrups",
              "coffee",
              "other"
            ]
            const category_tag = validTags.includes(parsed.category_tag) ? parsed.category_tag : "other"

            const result: ParsedRfqResponse = {
              title: typeof parsed.title === "string" && parsed.title ? parsed.title : "Закупка товаров",
              category_tag,
              specs: typeof parsed.specs === "string" ? parsed.specs : "",
              quantity: typeof parsed.quantity === "number" && parsed.quantity > 0 ? Math.round(parsed.quantity) : 1,
              unit: typeof parsed.unit === "string" && parsed.unit ? parsed.unit : "шт",
              max_price: typeof parsed.max_price === "number" && parsed.max_price > 0 ? parsed.max_price : null,
              city: typeof parsed.city === "string" && parsed.city ? parsed.city : "Бишкек",
              deadline_days: typeof parsed.deadline_days === "number" && parsed.deadline_days > 0 ? Math.round(parsed.deadline_days) : 7,
              raw_ai_prompt: prompt,
              parsed_by: "gemini"
            }
            return NextResponse.json(result, { status: 200 })
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini API call failed, falling back to regex parser:", geminiErr)
      }
    }

    // Fallback to robust regex parser (always returns 200 OK)
    const fallbackResult = parseRfqFallback(prompt)
    return NextResponse.json(fallbackResult, { status: 200 })
  } catch (err: any) {
    console.warn("parse-rfq error, serving safe fallback:", err)
    const fallbackResult = parseRfqFallback(prompt)
    return NextResponse.json(fallbackResult, { status: 200 })
  }
}
