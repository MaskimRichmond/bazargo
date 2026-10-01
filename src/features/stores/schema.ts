import { z } from "zod"

export const storeFormSchema = z.object({
  name: z.string().min(2, "zod.min_2_chars_title").max(100, "zod.too_long_title"),
  description: z.string().max(1000, "zod.too_long_desc").optional(),
  categoryId: z.string().min(1, "zod.select_category"),
  city: z.string().min(1, "zod.select_city"),
  phone: z.string().optional(),
  email: z.string().email("zod.invalid_email").optional().or(z.literal("")),
  logo: z.any().optional(), // For file upload in client
})

export type StoreFormValues = z.infer<typeof storeFormSchema>
