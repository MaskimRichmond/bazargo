import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CartView } from "./cart-view"

export const metadata = {
  title: "Корзина | BazarGo",
}

export default async function CartPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?next=/cart")
  }

  const { data: cartItems } = await supabase
    .from("cart_items")
    .select(`
      id, quantity, listing_id,
      listings (
        id, title, price, quantity, listing_type, status, seller_id,
        listing_images (url),
        profiles!seller_id (id, full_name, avatar_url)
      )
    `)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Корзина</h1>
      <CartView initialItems={cartItems || []} />
    </div>
  )
}
