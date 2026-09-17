import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MyListingsClient } from "@/features/my-listings/components/my-listings-client"

export const metadata = {
  title: "Мои объявления | BazarGo",
}

export default async function MyListingsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/my-listings")
  }

  const { data: listings, error } = await supabase
    .from("listings")
    .select(`
      *,
      listing_images(url, order_index)
    `)
    .eq("seller_id", session.user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch my listings:", error)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Мои объявления</h1>
        <a href="/profile" className="text-sm font-medium text-muted-foreground hover:text-foreground hidden sm:block">
          Вернуться в профиль
        </a>
      </div>
      <MyListingsClient listings={listings || []} />
    </div>
  )
}
