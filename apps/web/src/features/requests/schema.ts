import { z } from "zod"

export const requestFormSchema = z.object({
  title: z.string().min(5, "zod.min_5_chars_title").max(100, "zod.too_long_title"),
  categoryId: z.string().min(1, "zod.select_category"),
  description: z.string().max(1000, "zod.too_long_desc").optional(),
  budgetMax: z.coerce.number().min(0, "zod.positive_budget").optional(),
  condition: z.enum(["ANY", "NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR", "FOR_PARTS"]).optional(),
  region: z.string().min(1, "zod.region_required"),
  city: z.string().min(1, "zod.city_required"),
  expiresInDays: z.coerce.number().min(1).max(30)
})

export type RequestFormValues = z.infer<typeof requestFormSchema>
