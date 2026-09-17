import * as z from "zod"

export const listingTypeSchema = z.object({
  type: z.enum(["SINGLE", "INVENTORY"]),
})

export const photosSchema = z.object({
  images: z.array(
    z.object({
      file: z.any().optional(), // File object for new uploads
      url: z.string().url(),     // Object URL for preview, or Supabase URL
    })
  ).min(1, "Добавьте хотя бы одну фотографию").max(10, "Максимум 10 фотографий"),
})

export const productDetailsSchema = z.object({
  title: z.string().min(3, "Минимум 3 символа").max(100, "Максимум 100 символов"),
  categoryId: z.string().uuid("Выберите категорию"),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной").max(1000000000, "Слишком большая цена"),
  condition: z.enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR", "FOR_PARTS"], {
    required_error: "Укажите состояние товара"
  }),
  description: z.string().min(10, "Опишите товар подробнее (минимум 10 символов)").max(2000, "Слишком длинное описание"),
  quantity: z.coerce.number().min(1, "Минимум 1").optional(), // Only for INVENTORY
  city: z.string().min(2, "Укажите город"),
})

export const deliverySchema = z.object({
  deliveryMethods: z.array(z.string()).min(1, "Выберите хотя бы один способ получения"),
  publishAsStore: z.boolean().optional(),
})

export const sellFormSchema = z.object({
  ...listingTypeSchema.shape,
  ...photosSchema.shape,
  ...productDetailsSchema.shape,
  ...deliverySchema.shape,
})

export type SellFormValues = z.infer<typeof sellFormSchema>
