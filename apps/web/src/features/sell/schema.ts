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
  ).min(1, "zod.min_1_photo").max(10, "zod.max_10_photos"),
})

export const productDetailsSchema = z.object({
  title: z.string().min(3, "zod.min_3_chars").max(100, "zod.max_100_chars"),
  categoryId: z.string().uuid("zod.select_category"),
  price: z.coerce.number().min(0, "zod.positive_price").max(1000000000, "zod.too_big_price"),
  condition: z.enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR", "FOR_PARTS"], {
    required_error: "zod.select_condition"
  }),
  description: z.string().min(10, "zod.min_10_chars_desc").max(2000, "zod.too_long_desc"),
  quantity: z.coerce.number().min(1, "zod.min_1").optional(), // Only for INVENTORY
  region: z.string().min(2, "zod.select_region"),
  city: z.string().min(2, "zod.select_city"),
  isB2b: z.boolean().optional(),
  wholesalePrice: z.coerce.number().min(0, "zod.positive_price").optional(),
  minOrderQuantity: z.coerce.number().min(1, "zod.min_1").optional(),
})

export const deliverySchema = z.object({
  deliveryMethods: z.array(z.string()).min(1, "zod.min_1_method"),
  publishAsStore: z.boolean().optional(),
  showPhone: z.boolean().optional(),
})

export const sellFormSchema = z.object({
  ...listingTypeSchema.shape,
  ...photosSchema.shape,
  ...productDetailsSchema.shape,
  ...deliverySchema.shape,
})

export type SellFormValues = z.infer<typeof sellFormSchema>
