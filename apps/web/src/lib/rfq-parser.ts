export type ParsedRfqResponse = {
  title: string
  category_tag: "packaging" | "cups" | "syrups" | "coffee" | "other"
  specs: string
  quantity: number
  unit: string
  max_price: number | null
  city: string
  deadline_days: number
  raw_ai_prompt?: string
  parsed_by?: "gemini" | "fallback"
}

export function parseRfqFallback(prompt: string): ParsedRfqResponse {
  const text = (prompt || "").trim()

  // 1. City in Kyrgyzstan
  const cityMatch = text.match(/\b(Бишкек|Ош|Джалал-Абад|Жалал-Абад|Каракол|Токмок|Токмак|Нарын|Талас|Балыкчы|Кант|Кара-Балта|Кызыл-Кия|Узген|Чолпон-Ата)\b/i)
  const city = cityMatch ? (cityMatch[1].charAt(0).toUpperCase() + cityMatch[1].slice(1).toLowerCase()) : "Бишкек"

  // 2. Deadline (days)
  let deadlineDays = 7
  const deadlineDaysMatch = text.match(/(?:за|до|в\s*течение|срок(?:ом)?)\s*(\d+)\s*(?:дн(?:я|ей|я)|дней|сут(?:ок|ки)?)/i)
  const deadlineWeeksMatch = text.match(/(?:за|до|в\s*течение|срок(?:ом)?)\s*(\d+)\s*(?:нед(?:ели|ель|елю))/i)
  if (deadlineDaysMatch) {
    deadlineDays = parseInt(deadlineDaysMatch[1], 10)
  } else if (deadlineWeeksMatch) {
    deadlineDays = parseInt(deadlineWeeksMatch[1], 10) * 7
  } else if (/за\s*неделю/i.test(text)) {
    deadlineDays = 7
  }

  // 3. Max price (per unit)
  let maxPrice: number | null = null
  const priceMatch = text.match(/(?:до|по|цена|максимум|бюджет)\s*(?:до\s*)?(\d+(?:[.,]\d+)?)\s*(?:сом\w*|c\b|kgs)/i)
    || text.match(/(\d+(?:[.,]\d+)?)\s*(?:сом\w*|c\b|kgs)\s*(?:за|\/)\s*(?:штуку|шт|ед|единицу|1\s*шт)/i)
    || text.match(/до\s*(\d+(?:[.,]\d+)?)\s*(?:сом\w*|c\b|kgs)/i)
  if (priceMatch) {
    maxPrice = parseFloat(priceMatch[1].replace(',', '.'))
  }

  // 4. Specs (dimensions like 30x20x15 cm or volume like 350 ml)
  const specsParts: string[] = []
  const dimMatch = text.match(/(\d+(?:[.,]\d+)?\s*(?:[xх×*]\s*\d+(?:[.,]\d+)?)+(?:\s*(?:см|мм|м))?)/i)
  if (dimMatch) {
    specsParts.push(dimMatch[1].trim())
  }
  const volMatch = text.match(/(\d+(?:[.,]\d+)?\s*(?:мл|л|литр(?:ов|а)?|г|гр|грамм(?:ов)?|кг|килограмм(?:ов)?))(?=[,\s;.]|$)/i)
  if (volMatch) {
    specsParts.push(volMatch[1].trim())
  }
  if (/двухслойн\w*/i.test(text) && !specsParts.some(s => /двухслойн/i.test(s))) {
    specsParts.push("двухслойные")
  }
  if (/с\s*крышк\w*/i.test(text) && !specsParts.some(s => /крышк/i.test(s))) {
    specsParts.push("с крышками")
  }
  const specs = specsParts.join(", ")

  // 5. Quantity & Unit
  let quantity = 1
  let unit = "шт"
  const qtyUnitMatch = text.match(/(\d+[\d\s]*)\s*(?:[а-яё\-]+\s+)?(коробок|коробки|коробка|стаканов|стакана|стакан|бутылок|бутылки|бутылка|упаковок|упаковки|упаковка|пачек|пачки|пачка|рулонов|рулона|рулон|мешков|мешка|мешок|кг|килограмм(?:ов)?|л|литр(?:ов)?|штук|штуки|штука|шт)(?=[,\s;.]|$)/i)
  if (qtyUnitMatch) {
    quantity = parseInt(qtyUnitMatch[1].replace(/\s+/g, ''), 10)
    const rawUnit = qtyUnitMatch[2].toLowerCase()
    if (/короб/i.test(rawUnit)) unit = "коробок"
    else if (/стакан/i.test(rawUnit)) unit = "стаканов"
    else if (/бутыл/i.test(rawUnit)) unit = "бутылок"
    else if (/упаков/i.test(rawUnit)) unit = "упаковок"
    else if (/пач/i.test(rawUnit)) unit = "пачек"
    else if (/рулон/i.test(rawUnit)) unit = "рулонов"
    else if (/мешк/i.test(rawUnit)) unit = "мешков"
    else if (/кг|килограмм/i.test(rawUnit)) unit = "кг"
    else if (/^л$|литр/i.test(rawUnit)) unit = "л"
    else unit = "шт"
  } else {
    const numMatch = text.match(/(?:нужно|заказ(?:ать)?|требуется|хочу|куплю|ищу)?\s*(\d+[\d\s]*)\b/i)
    if (numMatch) {
      const parsedNum = parseInt(numMatch[1].replace(/\s+/g, ''), 10)
      if (parsedNum > 0) quantity = parsedNum
    }
  }

  // 6. Category Tag
  let categoryTag: "packaging" | "cups" | "syrups" | "coffee" | "other" = "other"
  if (/короб|упаков|пакет|гофро|картон|скотч|пленк|крафт|тары|тара/i.test(text)) {
    categoryTag = "packaging"
  } else if (/стакан|чашк|крышк|трубочк/i.test(text)) {
    categoryTag = "cups"
  } else if (/сироп|топпинг|концентрат|пюре/i.test(text)) {
    categoryTag = "syrups"
  } else if (/кофе|зерн|арабик|робуст|эспрессо|обжарк/i.test(text)) {
    categoryTag = "coffee"
  }

  // 7. Title
  let title = ""
  if (categoryTag === "packaging" && /короб/i.test(text)) {
    title = dimMatch ? `Коробки картонные ${dimMatch[1].trim()}` : "Коробки картонные"
  } else if (categoryTag === "cups" && /стакан/i.test(text)) {
    const vol = volMatch ? ` ${volMatch[1].trim()}` : ""
    const layers = /двухслойн/i.test(text) ? "Двухслойные стаканы" : "Стаканы"
    const lids = /с\s*крышк/i.test(text) ? " с крышками" : ""
    title = `${layers}${vol}${lids}`
  } else if (categoryTag === "syrups") {
    title = "Сиропы для напитков"
  } else if (categoryTag === "coffee") {
    title = "Кофе в зернах"
  } else {
    let cleaned = text
      .replace(/^(?:нужно|требуется|ищу|куплю|заказ(?:ать)?|срочно|хотим|закупаем)\s+/i, "")
      .replace(/(?:желательно\s*)?до\s*\d+(?:[.,]\d+)?\s*(?:сом\w*|c\b|kgs)(?:\s*за\s*(?:штуку|шт|ед))?/gi, "")
      .replace(/(?:доставить\s*в|в)\s*(?:Бишкек|Ош|Джалал-Абад|Жалал-Абад|Каракол|Токмок|Токмак|Нарын|Талас|Балыкчы|Кант|Кара-Балта|Кызыл-Кия|Узген|Чолпон-Ата)/gi, "")
      .replace(/(?:за|до|в\s*течение)\s*\d+\s*(?:дн\w*|дня|дней|сут\w*|нед\w*)/gi, "")
      .replace(/[,;.]+/g, " ")
      .trim()
    cleaned = cleaned.replace(/\s{2,}/g, " ")
    title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    if (title.length > 80) title = title.slice(0, 80) + "..."
    if (!title) title = "Закупка товаров"
  }

  return {
    title,
    category_tag: categoryTag,
    specs,
    quantity,
    unit,
    max_price: maxPrice,
    city,
    deadline_days: deadlineDays,
    raw_ai_prompt: prompt,
    parsed_by: "fallback"
  }
}
