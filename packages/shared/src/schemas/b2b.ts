import { z } from "zod";

// Example of a pure schema extracted to shared layer
export const b2bOfferSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be positive"),
  message: z.string().optional(),
});
