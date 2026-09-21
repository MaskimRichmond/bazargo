import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CartView } from "./cart-view"
import { Suspense } from "react"
import { CartSkeleton } from "@/components/shared/cart-skeleton"

export const metadata = {
  title: "Корзина | BazarGo",
}

async function CartFetcher() {
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
        listing_images (url, order_index),
        profiles!seller_id (id, full_name, avatar_url)
      )
    `)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })

  return <CartView initialItems={cartItems || []} />
}

export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">Корзина</h1>
      <Suspense fallback={<CartSkeleton />}>
        <CartFetcher />
      </Suspense>
    </div>
  )
}
