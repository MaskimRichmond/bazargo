import { z } from "zod"

export const storeFormSchema = z.object({
  name: z.string().min(2, "Название должно содержать минимум 2 символа").max(100, "Слишком длинное название"),
  description: z.string().max(1000, "Слишком длинное описание").optional(),
  categoryId: z.string().min(1, "Выберите категорию"),
  city: z.string().min(1, "Укажите город"),
  phone: z.string().optional(),
  email: z.string().email("Неверный формат email").optional().or(z.literal("")),
  logo: z.any().optional(), // For file upload in client
})

export type StoreFormValues = z.infer<typeof storeFormSchema>
