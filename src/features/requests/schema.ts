import { z } from "zod"

export const requestFormSchema = z.object({
  title: z.string().min(5, "Название должно быть минимум 5 символов").max(100, "Слишком длинное название"),
  categoryId: z.string().min(1, "Выберите категорию"),
  description: z.string().max(1000, "Слишком длинное описание").optional(),
  budgetMax: z.coerce.number().min(0, "Бюджет не может быть отрицательным").optional(),
  condition: z.enum(["ANY", "NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR", "FOR_PARTS"]).optional(),
  city: z.string().min(1, "Город обязателен"),
  expiresInDays: z.coerce.number().min(1).max(30)
})

export type RequestFormValues = z.infer<typeof requestFormSchema>
