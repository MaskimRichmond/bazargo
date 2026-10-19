import { ParsedRfqResponse, RfqCategoryTag } from "./types";

export function parseRfqFallback(prompt: string): ParsedRfqResponse {
  const text = (prompt || "").trim();

  // 1. City in Kyrgyzstan
  const cityMatch = text.match(/\b(Бишкек|Ош|Джалал-Абад|Жалал-Абад|Каракол|Токмок|Токмак|Нарын|Талас|Балыкчы|Кант|Кара-Балта|Кызыл-Кия|Узген|Чолпон-Ата)\b/i);
  const city = cityMatch ? (cityMatch[1].charAt(0).toUpperCase() + cityMatch[1].slice(1).toLowerCase()) : "Бишкек";

  // 2. Deadline (days)
  let deadlineDays = 7;
  const deadlineDaysMatch = text.match(/(?:за|до|в\s*течение|срок(?:ом)?)\s*(\d+)\s*(?:дн(?:я|ей|я)|дней|сут(?:ок|ки)?)/i);
  const deadlineWeeksMatch = text.match(/(?:за|до|в\s*течение|срок(?:ом)?)\s*(\d+)\s*(?:нед(?:ели|ель|елю))/i);
  if (deadlineDaysMatch) {
    deadlineDays = parseInt(deadlineDaysMatch[1], 10);
  } else if (deadlineWeeksMatch) {
    deadlineDays = parseInt(deadlineWeeksMatch[1], 10) * 7;
  } else if (/за\s*неделю/i.test(text)) {
    deadlineDays = 7;
  }

  // 3. Specs (dimensions like 30x20x15 cm or volume like 350 ml)
  const specsParts: string[] = [];
  const dimMatch = text.match(/(\d+(?:[.,]\d+)?\s*(?:[xх×*]\s*\d+(?:[.,]\d+)?)+(?:\s*(?:см|мм|м))?)/i);
  if (dimMatch) {
    specsParts.push(dimMatch[1].trim());
  }
  const volMatch = text.match(/(\d+(?:[.,]\d+)?\s*(?:мл|л|литр(?:ов|а)?|г|гр|грамм(?:ов)?|кг|килограмм(?:ов)?))(?=[,\s;.]|$)/i);
  if (volMatch) {
    specsParts.push(volMatch[1].trim());
  }
  if (/двухслойн\w*/i.test(text) && !specsParts.some(s => /двухслойн/i.test(s))) {
    specsParts.push("двухслойные");
  }
  if (/с\s*крышк\w*/i.test(text) && !specsParts.some(s => /крышк/i.test(s))) {
    specsParts.push("с крышками");
  }
  const specs = specsParts.join(", ");

  // 4. Quantity & Unit
  let quantity = 1;
  let unit = "шт";
  const qtyUnitMatch = text.match(/(\d+[\d\s]*)\s*(?:[а-яё\-]+\s+)?(коробок|коробки|коробка|стаканов|стакана|стакан|бутылок|бутылки|бутылка|упаковок|упаковки|упаковка|пачек|пачки|пачка|рулонов|рулона|рулон|мешков|мешка|мешок|кг|килограмм(?:ов)?|л|литр(?:ов)?|штук|штуки|штука|шт)(?=[,\s;.]|$)/i);
  if (qtyUnitMatch) {
    quantity = parseInt(qtyUnitMatch[1].replace(/\s+/g, ''), 10);
    const rawUnit = qtyUnitMatch[2].toLowerCase();
    if (/короб/i.test(rawUnit)) unit = "коробок";
    else if (/стакан/i.test(rawUnit)) unit = "стаканов";
    else if (/бутыл/i.test(rawUnit)) unit = "бутылок";
    else if (/упаков/i.test(rawUnit)) unit = "упаковок";
    else if (/пач/i.test(rawUnit)) unit = "пачек";
    else if (/рулон/i.test(rawUnit)) unit = "рулонов";
    else if (/мешк/i.test(rawUnit)) unit = "мешков";
    else if (/кг|килограмм/i.test(rawUnit)) unit = "кг";
    else if (/^л$|литр/i.test(rawUnit)) unit = "л";
    else unit = "шт";
  } else {
    const numMatch = text.match(/(?:нужно|заказ(?:ать)?|требуется|хочу|куплю|ищу)?\s*(\d+[\d\s]*)\b/i);
    if (numMatch) {
      const parsedNum = parseInt(numMatch[1].replace(/\s+/g, ''), 10);
      if (parsedNum > 0) quantity = parsedNum;
    }
  }

  // 5. Budget & Max Price (Differentiating Total Budget vs Unit Price)
  let totalBudget: number | null = null;
  let maxPrice: number | null = null;

  // Total budget patterns: "бюджет 15000 сом", "на сумму 20000 сом", "бюджет до 20000"
  const totalBudgetMatch = text.match(/(?:бюджет(?:\s*закупки|\s*партии)?|на\s*сумму|общий\s*бюджет)\s*(?:до\s*)?(\d+[\d\s]*(?:[.,]\d+)?)\s*(?:сом\w*|c\b|kgs)?/i)
    || text.match(/(?:на\s*всю\s*партию|за\s*всё|итого)\s*(?:до\s*)?(\d+[\d\s]*(?:[.,]\d+)?)\s*(?:сом\w*|c\b|kgs)/i);

  // Unit price patterns: "до 4.5 сом за шт", "по 80 сом/шт", "до 85 сом"
  const unitPriceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:сом\w*|c\b|kgs)\s*(?:за|\/)\s*(?:штуку|шт|ед|единицу|1\s*шт|бутылку|кг|литр)/i)
    || text.match(/(?:по|до)\s*(\d+(?:[.,]\d+)?)\s*(?:сом\w*|c\b|kgs)\s*(?:за\s*1?\s*шт|за\s*ед)?/i)
    || text.match(/цена\s*(?:до\s*)?(\d+(?:[.,]\d+)?)\s*(?:сом\w*|c\b|kgs)/i);

  if (totalBudgetMatch) {
    const rawVal = totalBudgetMatch[1].replace(/\s+/g, '').replace(',', '.');
    totalBudget = parseFloat(rawVal);
    if (quantity > 0) {
      maxPrice = Math.round((totalBudget / quantity) * 100) / 100;
    }
  } else if (unitPriceMatch) {
    const rawVal = unitPriceMatch[1].replace(/\s+/g, '').replace(',', '.');
    const parsedPrice = parseFloat(rawVal);
    // If the price is very large and quantity > 1, check if user meant total budget
    if (parsedPrice > 2000 && quantity > 10 && !/за\s*(?:шт|штуку|ед)/i.test(text)) {
      totalBudget = parsedPrice;
      maxPrice = Math.round((totalBudget / quantity) * 100) / 100;
    } else {
      maxPrice = parsedPrice;
      totalBudget = Math.round(maxPrice * quantity * 100) / 100;
    }
  }

  // 6. Category Tag (8 BazaarOS Wholesale Categories)
  let categoryTag: RfqCategoryTag = "other";
  if (/короб|упаков|пакет|гофро|картон|скотч|пленк|крафт|тары|тара|ящик/i.test(text)) {
    categoryTag = "packaging";
  } else if (/стакан|чашк|крышк|трубочк|посуд|капхолдер|тарелк|вилок|вилка|прибор/i.test(text)) {
    categoryTag = "cups";
  } else if (/сироп|топпинг|концентрат|пюре|кофе|зерн|арабик|робуст|эспрессо|обжарк|чай|бар/i.test(text)) {
    categoryTag = "syrups";
  } else if (/продукт|сырь[её]|мясо|молок|сыр|мук[ае]|масл|овощ|фрукт|соус|рыб|horeca/i.test(text)) {
    categoryTag = "food";
  } else if (/хозтовар|хим|моюще|салфетк|перчатк|дезинфекц|мыл[оа]|бумаг.*туалетн/i.test(text)) {
    categoryTag = "cleaning";
  } else if (/текстил|форм[аы]|фартук|полотенц|спецодежд|скатерть|халат|салфетка.*тканев/i.test(text)) {
    categoryTag = "textiles";
  } else if (/полиграф|печать|брендирован|логотип|наклейк|этикетк|пакет.*лого/i.test(text)) {
    categoryTag = "printing";
  } else if (/оборудован|кофемашин|печ[ьи]|гриль|холодильник|блендер|витрин|весы/i.test(text)) {
    categoryTag = "equipment";
  }

  // 7. Title
  let title = "";
  if (categoryTag === "packaging" && /короб/i.test(text)) {
    title = dimMatch ? `Коробки картонные ${dimMatch[1].trim()}` : "Коробки картонные";
  } else if (categoryTag === "cups" && /стакан/i.test(text)) {
    const vol = volMatch ? ` ${volMatch[1].trim()}` : "";
    const layers = /двухслойн/i.test(text) ? "Двухслойные стаканы" : "Стаканы";
    const lids = /с\s*крышк/i.test(text) ? " с крышками" : "";
    title = `${layers}${vol}${lids}`;
  } else if (categoryTag === "syrups" && /сироп/i.test(text)) {
    title = "Сиропы для напитков";
  } else if (categoryTag === "syrups" && /кофе/i.test(text)) {
    title = "Кофе в зернах";
  } else if (categoryTag === "food") {
    title = "Продукты и сырье для HoReCa";
  } else if (categoryTag === "cleaning") {
    title = "Хозтовары и бытовая химия";
  } else if (categoryTag === "textiles") {
    title = "Текстиль и спецодежда";
  } else if (categoryTag === "printing") {
    title = "Брендирование и полиграфия";
  } else if (categoryTag === "equipment") {
    title = "Торговое оборудование";
  } else {
    let cleaned = text
      .replace(/^(?:нужно|требуется|ищу|куплю|заказ(?:ать)?|срочно|хотим|закупаем)\s+/i, "")
      .replace(/(?:желательно\s*)?до\s*\d+(?:[.,]\d+)?\s*(?:сом\w*|c\b|kgs)(?:\s*за\s*(?:штуку|шт|ед))?/gi, "")
      .replace(/(?:доставить\s*в|в)\s*(?:Бишкек|Ош|Джалал-Абад|Жалал-Абад|Каракол|Токмок|Токмак|Нарын|Талас|Балыкчы|Кант|Кара-Балта|Кызыл-Кия|Узген|Чолпон-Ата)/gi, "")
      .replace(/(?:за|до|в\s*течение)\s*\d+\s*(?:дн\w*|дня|дней|сут\w*|нед\w*)/gi, "")
      .replace(/[,;.]+/g, " ")
      .trim();
    cleaned = cleaned.replace(/\s{2,}/g, " ");
    title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    if (title.length > 80) title = title.slice(0, 80) + "...";
    if (!title) title = "Закупка товаров";
  }

  return {
    title,
    category_tag: categoryTag,
    specs,
    quantity,
    unit,
    max_price: maxPrice,
    total_budget: totalBudget,
    city,
    deadline_days: deadlineDays,
    raw_ai_prompt: prompt,
    parsed_by: "fallback"
  };
}
