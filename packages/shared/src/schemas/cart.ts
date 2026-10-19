import { z } from "zod";

export const addToCartSchema = z.object({
  listingId: z.string().uuid("Некорректный ID"),
  quantity: z.number().int().min(1).max(100000)
});

export const updateCartQuantitySchema = z.object({
  cartItemId: z.string().uuid("Некорректный ID"),
  newQuantity: z.number().int().min(0).max(100000)
});
