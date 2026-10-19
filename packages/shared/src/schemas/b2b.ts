import { z } from "zod";

export const b2bOfferSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be positive"),
  message: z.string().optional(),
});

export const rfqRequestSchema = z.object({
  title: z.string().min(2, "Укажите название товара"),
  category_tag: z.enum(["packaging", "cups", "syrups", "coffee", "other"]),
  specs: z.string().optional().default(""),
  quantity: z.number().int().min(1, "Количество должно быть не менее 1"),
  unit: z.string().min(1, "Укажите единицу измерения"),
  max_price: z.number().nullable().optional(),
  city: z.string().min(2, "Укажите город доставки"),
  deadline_days: z.number().int().min(1, "Срок поставки должен быть не менее 1 дня"),
  raw_ai_prompt: z.string().optional(),
});

export const rfqOfferSchema = z.object({
  request_id: z.string().min(1, "ID запроса обязателен"),
  unit_price: z.number().positive("Цена за единицу должна быть больше 0"),
  offered_quantity: z.number().int().positive("Объем поставки должен быть больше 0"),
  moq: z.number().int().min(1, "Минимальный заказ должен быть не менее 1"),
  delivery_cost: z.number().min(0, "Стоимость доставки не может быть отрицательной"),
  lead_time_days: z.number().int().min(1, "Срок поставки должен быть не менее 1 дня"),
  message: z.string().optional().nullable(),
});

export const supplierApplicationSchema = z.object({
  company_name: z.string().min(2, "Укажите название компании или ИП"),
  inn: z.string().optional().nullable(),
  categories: z.array(z.string()).min(1, "Выберите хотя бы одну категорию поставок"),
  contact_person: z.string().min(2, "Укажите контактное лицо"),
  phone: z.string().min(6, "Укажите контактный номер телефона"),
  email: z.string().email("Некорректный email").optional().nullable().or(z.literal("")),
  telegram_username: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
});
